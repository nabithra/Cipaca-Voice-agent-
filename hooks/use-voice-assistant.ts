"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVoiceStore, saveLeadToLocalStorage } from "@/lib/store";
import { useLeadStore } from "@/lib/store";
import { useToolHandler } from "@/hooks/use-tool-handler";
import { speakText, fetchWithRetry, voiceDebug, isLikelyAssistantEcho } from "@/lib/voice-client";
import {
  configureRecognitionForMobile,
  ensureAudioContext,
  getSpeechRecognitionConstructor,
  logVoiceEvent,
  permissionDeniedMessage,
  primeSpeechSynthesisVoices,
  recognitionFailedMessage,
  recognitionUnavailableMessage,
  releaseMicrophoneStream,
  requestMicrophoneAccess,
  setMicrophoneEnabled,
  SILENCE_MS,
  RECOGNITION_RESTART_DELAY_MS,
} from "@/lib/mobile-voice";
import { getLocalGreeting } from "@/lib/local-assistant";
import {
  emergencyStageFromContext,
  playEmergencyTone,
} from "@/lib/emergency-workflow";
import type { ConversationContext, ConversationMessage, Lead } from "@/types";

interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

interface ChatApiResponse {
  reply?: string;
  toolCalls?: { name: string; arguments: Record<string, unknown> }[];
  source?: string;
  error?: string;
  details?: string;
  conversationContext?: ConversationContext;
  savedLead?: Lead;
}

export function useRealtimeVoice() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const { handleToolCall } = useToolHandler();

  const {
    isMuted,
    language,
    setStatus,
    setMode,
    setUserTranscript,
    setAiTranscript,
    addMessage,
    setError,
  } = useVoiceStore();

  const cleanup = useCallback(() => {
    if (dcRef.current) { dcRef.current.close(); dcRef.current = null; }
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (audioElRef.current) audioElRef.current.srcObject = null;
  }, []);

  const handleEvent = useCallback(
    async (event: RealtimeEvent) => {
      switch (event.type) {
        case "session.created":
          setStatus("connected");
          voiceDebug.setStage("openaiResponse", "working");
          break;
        case "input_audio_buffer.speech_started":
          setStatus("listening");
          voiceDebug.setStage("transcript", "loading");
          if (dcRef.current?.readyState === "open") {
            dcRef.current.send(JSON.stringify({ type: "response.cancel" }));
          }
          if (audioElRef.current) audioElRef.current.srcObject = null;
          break;
        case "input_audio_buffer.speech_stopped":
          setStatus("processing");
          break;
        case "conversation.item.input_audio_transcription.completed": {
          const transcript = event.transcript as string;
          if (transcript) {
            setUserTranscript(transcript);
            voiceDebug.setStage("transcript", "working");
            addMessage({ role: "user", content: transcript, timestamp: new Date().toISOString() });
          }
          break;
        }
        case "response.audio_transcript.delta": {
          const delta = event.delta as string;
          if (delta) setAiTranscript((useVoiceStore.getState().aiTranscript || "") + delta);
          break;
        }
        case "response.audio_transcript.done": {
          const transcript = event.transcript as string;
          if (transcript) {
            setAiTranscript(transcript);
            addMessage({ role: "assistant", content: transcript, timestamp: new Date().toISOString() });
          }
          break;
        }
        case "response.audio.delta":
          setStatus("speaking");
          voiceDebug.setStage("speaker", "working");
          break;
        case "response.audio.done":
        case "response.done":
          setStatus("listening");
          setAiTranscript("");
          break;
        case "response.function_call_arguments.done": {
          const name = event.name as string;
          const args = event.arguments as string;
          const callId = event.call_id as string;
          try {
            const parsed = JSON.parse(args) as Record<string, unknown>;
            const result = await handleToolCall(name, parsed);
            if (dcRef.current?.readyState === "open") {
              dcRef.current.send(JSON.stringify({
                type: "conversation.item.create",
                item: { type: "function_call_output", call_id: callId, output: result },
              }));
              dcRef.current.send(JSON.stringify({ type: "response.create" }));
            }
          } catch (err) {
            voiceDebug.error(`Tool call error: ${err instanceof Error ? err.message : "unknown"}`);
          }
          break;
        }
        case "error": {
          const errorMsg = (event.error as { message?: string })?.message ?? "Realtime error";
          voiceDebug.error(errorMsg, "openaiResponse");
          setError(`${errorMsg} (falling back to SpeechRecognition mode)`);
          setStatus("error");
          break;
        }
      }
    },
    [addMessage, handleToolCall, setAiTranscript, setError, setStatus, setUserTranscript]
  );

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setStatus("connecting");
      setError(null);
      setMode("realtime");
      useVoiceStore.getState().setCallStartTime(Date.now());
      useVoiceStore.getState().setHasActiveSession(true);
      voiceDebug.setStage("openaiRequest", "loading");

      const sessionRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });

      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        voiceDebug.log(`Realtime unavailable: ${(err as { details?: string }).details ?? sessionRes.status}`);
        return false;
      }

      const { clientSecret } = await sessionRes.json();
      voiceDebug.setStage("openaiRequest", "working");

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      if (!audioElRef.current) {
        audioElRef.current = document.createElement("audio");
        audioElRef.current.autoplay = true;
      }

      pc.ontrack = (e) => {
        if (audioElRef.current) audioElRef.current.srcObject = e.streams[0];
      };

      voiceDebug.setStage("microphone", "loading");
      await ensureAudioContext();
      const ms = await requestMicrophoneAccess({ retries: 1 });
      voiceDebug.setStage("microphone", "working");
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("message", (e) => {
        try {
          handleEvent(JSON.parse(e.data as string) as RealtimeEvent);
        } catch { /* ignore */ }
      });

      dc.addEventListener("open", () => setStatus("listening"));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
        }
      );

      if (!sdpResponse.ok) return false;

      await pc.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
      return true;
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "PERMISSION_DENIED"
          ? permissionDeniedMessage()
          : `Realtime failed: ${err instanceof Error ? err.message : "unknown"}`;
      voiceDebug.error(msg, "openaiRequest");
      cleanup();
      return false;
    }
  }, [cleanup, handleEvent, language, setError, setMode, setStatus]);

  const disconnect = useCallback(() => {
    cleanup();
    setStatus("disconnected");
  }, [cleanup, setStatus]);

  useEffect(() => {
    if (pcRef.current) {
      pcRef.current.getSenders().forEach((sender) => {
        if (sender.track) sender.track.enabled = !isMuted;
      });
    }
  }, [isMuted]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { connect, disconnect };
}

export function useFallbackVoice() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isStartingRecognitionRef = useRef(false);
  const lastSpokenRef = useRef("");
  const sessionTranscriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRetryRef = useRef(false);
  const continuousModeRef = useRef(true);
  const { handleToolCall } = useToolHandler();
  const { addLead } = useLeadStore();

  const {
    language,
    setStatus,
    setMode,
    setUserTranscript,
    setAiTranscript,
    addMessage,
    setError,
    isMuted,
    setConversationContext,
    setSessionId,
    setHasActiveSession,
    setDemoMode,
    setEmergency,
    setEmergencyStage,
    setGreAssigned,
  } = useVoiceStore();

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const stopListening = useCallback(
    (reason = "manual") => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          try {
            recognitionRef.current.stop();
          } catch {
            // already stopped
          }
        }
      }
      isListeningRef.current = false;
      isStartingRecognitionRef.current = false;
      voiceDebug.setStage("speechRecognition", "idle");
      logVoiceEvent("Recognition ended", reason);
    },
    [clearSilenceTimer]
  );

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isSpeakingRef.current || isProcessingRef.current) return;
    if (isListeningRef.current || isStartingRecognitionRef.current) return;
    if (!continuousModeRef.current) return;
    if (useVoiceStore.getState().conversationContext.state === "SESSION_CLOSED") return;

    isStartingRecognitionRef.current = true;
    sessionTranscriptRef.current = "";

    const tryStart = () => {
      try {
        recognitionRef.current!.start();
        isListeningRef.current = true;
        setStatus("listening");
        voiceDebug.setStage("speechRecognition", "working");
        logVoiceEvent("Recognition started");
      } catch (err) {
        const name = (err as DOMException)?.name ?? "";
        if (name === "InvalidStateError") {
          try {
            recognitionRef.current!.abort();
          } catch {
            /* ignore */
          }
          window.setTimeout(() => {
            try {
              recognitionRef.current!.start();
              isListeningRef.current = true;
              setStatus("listening");
              voiceDebug.setStage("speechRecognition", "working");
              logVoiceEvent("Recognition started", "after abort");
            } catch {
              isListeningRef.current = false;
            } finally {
              isStartingRecognitionRef.current = false;
            }
          }, RECOGNITION_RESTART_DELAY_MS);
          return;
        }
        isListeningRef.current = false;
        logVoiceEvent("Recognition start failed", name || String(err));
      }
      isStartingRecognitionRef.current = false;
    };

    tryStart();
  }, [setStatus]);

  const flushTranscript = useCallback(
    (source: string) => {
      clearSilenceTimer();
      const text = sessionTranscriptRef.current.trim();
      sessionTranscriptRef.current = "";
      stopListening(source);
      if (text) {
        logVoiceEvent("Transcript", text);
        void processUserInputRef.current?.(text);
      }
    },
    [clearSilenceTimer, stopListening]
  );

  const scheduleSilenceFlush = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      flushTranscript("silence");
    }, SILENCE_MS);
  }, [clearSilenceTimer, flushTranscript]);

  const processUserInputRef = useRef<(text: string) => Promise<void>>(async () => {});

  const speak = useCallback(
    async (text: string) => {
      if (isMuted || !text.trim()) return;

      isSpeakingRef.current = true;
      stopListening("tts-start");
      setMicrophoneEnabled(micStreamRef.current, false);
      lastSpokenRef.current = text;
      setStatus("speaking");
      setUserTranscript("");

      try {
        const demoMode = useVoiceStore.getState().isDemoMode;
        await speakText(text, language, isMuted, { demoMode });
      } finally {
        isSpeakingRef.current = false;
        voiceDebug.setStage("speaker", "idle");
        if (!isProcessingRef.current && !isMuted) {
          setMicrophoneEnabled(micStreamRef.current, true);
        }
        if (!isProcessingRef.current && continuousModeRef.current) {
          window.setTimeout(() => startListening(), RECOGNITION_RESTART_DELAY_MS);
        }
      }
    },
    [isMuted, language, startListening, stopListening, setStatus, setUserTranscript]
  );

  const processUserInput = useCallback(
    async (recognizedTranscript: string) => {
      if (isProcessingRef.current || isSpeakingRef.current) return;

      const text = recognizedTranscript.trim();
      if (!text) return;

      const store = useVoiceStore.getState();
      if (store.conversationContext.state === "SESSION_CLOSED") {
        voiceDebug.log("Session closed — ignoring input until Restart");
        return;
      }

      // Reject echo of assistant's own TTS
      const lastAssistant = [...store.messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (
        (lastSpokenRef.current && isLikelyAssistantEcho(text, lastSpokenRef.current)) ||
        (lastAssistant && isLikelyAssistantEcho(text, lastAssistant.content))
      ) {
        voiceDebug.log(`Ignored assistant echo: "${text.slice(0, 60)}"`);
        logVoiceEvent("Transcript ignored", "assistant echo");
        if (continuousModeRef.current) {
          window.setTimeout(() => startListening(), RECOGNITION_RESTART_DELAY_MS);
        }
        return;
      }

      stopListening("processing");
      setMicrophoneEnabled(micStreamRef.current, false);
      isProcessingRef.current = true;

      logVoiceEvent("Transcript", text);

      setUserTranscript(text);
      voiceDebug.setStage("transcript", "working");

      const userMsg: ConversationMessage = {
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
      console.log("[CIPACA] Outgoing User Message:", text);
      addMessage(userMsg);

      const priorMessages = useVoiceStore.getState().messages;
      const chatMessages = priorMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      setStatus("processing");
      voiceDebug.setStage("openaiRequest", "loading");
      setError(null);

      const { conversationContext, sessionId, language: lang } = useVoiceStore.getState();

      const result = await fetchWithRetry<ChatApiResponse>("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatMessages,
          language: lang,
          sessionId,
          conversationContext,
        }),
      });

      let responseText: string;
      let source = "local";

      if (result.ok && result.data.reply) {
        responseText = result.data.reply;
        source = result.data.source ?? "openai";
        voiceDebug.setStage("openaiRequest", "working");
        voiceDebug.setStage("openaiResponse", "working");
        voiceDebug.setApiSource(source === "openai" ? "openai" : "local");
        console.log("[CIPACA] AI Response:", responseText);
        voiceDebug.log(`AI Response: "${responseText.slice(0, 80)}..."`);

        if (result.data.conversationContext) {
          const newCtx = result.data.conversationContext;
          setConversationContext(newCtx);

          if (newCtx.currentWorkflow === "emergency") {
            const store = useVoiceStore.getState();
            if (!store.isEmergency) {
              setEmergency(true);
              playEmergencyTone();
            }
            setEmergencyStage(emergencyStageFromContext(newCtx));
          }

          if (
            newCtx.workflowStatus === "completed" &&
            newCtx.currentWorkflow === "emergency"
          ) {
            setEmergencyStage("connecting_human");
          }
        }

        if (result.data.savedLead) {
          addLead(result.data.savedLead);
          saveLeadToLocalStorage(result.data.savedLead);
          if (result.data.savedLead.category === "Emergency") {
            const ticketId =
              result.data.savedLead.ticketId ??
              result.data.savedLead.referenceId ??
              result.data.conversationContext?.referenceId;
            setEmergency(true, ticketId);
            setEmergencyStage("connecting_human");
            if (useVoiceStore.getState().isDemoMode) {
              setGreAssigned("Demo GRE Executive");
            } else if (result.data.savedLead.greAssigned) {
              setGreAssigned(result.data.savedLead.greAssigned);
            }
          }
        }

        if (result.data.toolCalls?.length) {
          for (const tc of result.data.toolCalls) {
            await handleToolCall(tc.name, tc.arguments);
          }
        }
      } else {
        const detail = result.error ?? result.data.details ?? result.data.error ?? "Unknown error";
        voiceDebug.error(`Chat API failed: ${detail}`, "openaiRequest");
        voiceDebug.setApiSource("local");

        responseText = "I'm here to help. Could you please repeat that?";
        console.log("[CIPACA] AI Response (fallback):", responseText);
        voiceDebug.setStage("openaiResponse", "fallback");
      }

      setAiTranscript(responseText);
      addMessage({
        role: "assistant",
        content: responseText,
        timestamp: new Date().toISOString(),
      });

      await speak(responseText);
      setUserTranscript("");
      setAiTranscript("");
      isProcessingRef.current = false;
    },
    [
      addLead,
      addMessage,
      handleToolCall,
      setAiTranscript,
      setConversationContext,
      setEmergency,
      setEmergencyStage,
      setGreAssigned,
      setError,
      setStatus,
      setUserTranscript,
      speak,
      stopListening,
    ]
  );

  useEffect(() => {
    processUserInputRef.current = processUserInput;
  }, [processUserInput]);

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setStatus("connecting");
      setError(null);
      setMode("fallback");

      const store = useVoiceStore.getState();
      if (!store.sessionId) {
        setSessionId(`session-${Date.now()}`);
      }
      if (!store.hasActiveSession) {
        setHasActiveSession(true);
      }
      useVoiceStore.getState().setCallStartTime(Date.now());

      try {
        const health = await fetch("/api/health").then((r) => r.json());
        const demo = health.demoMode ?? !health.openaiConfigured;
        setDemoMode(demo);
        voiceDebug.setOpenAIConfigured(!demo);
        voiceDebug.log(demo ? "Demo Mode active" : "OpenAI configured");
      } catch {
        setDemoMode(true);
        voiceDebug.setOpenAIConfigured(false);
      }

      voiceDebug.setStage("microphone", "loading");
      await ensureAudioContext();
      primeSpeechSynthesisVoices();

      try {
        micStreamRef.current = await requestMicrophoneAccess({ retries: 1 });
      } catch (err) {
        if (err instanceof Error && err.message === "PERMISSION_DENIED") {
          setError(permissionDeniedMessage());
        } else {
          setError("Could not access microphone. Please check permissions and try again.");
        }
        setStatus("error");
        return false;
      }

      const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
      if (!SpeechRecognitionAPI) {
        voiceDebug.error("SpeechRecognition not supported", "speechRecognition");
        throw new Error(recognitionUnavailableMessage());
      }

      continuousModeRef.current = true;
      recognitionRetryRef.current = false;

      const recognition = new SpeechRecognitionAPI();
      configureRecognitionForMobile(recognition, language);

      recognition.onstart = () => {
        isListeningRef.current = true;
        logVoiceEvent("Recognition started", "onstart");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (isSpeakingRef.current || isProcessingRef.current) return;

        let full = "";
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript;
        }
        const trimmed = full.trim();
        if (!trimmed) return;

        sessionTranscriptRef.current = trimmed;
        setUserTranscript(trimmed);
        voiceDebug.setStage("speechRecognition", "working");
        scheduleSilenceFlush();
      };

      recognition.onspeechend = () => {
        if (!isSpeakingRef.current && !isProcessingRef.current && sessionTranscriptRef.current) {
          scheduleSilenceFlush();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        isListeningRef.current = false;
        isStartingRecognitionRef.current = false;
        logVoiceEvent("Recognition error", event.error);

        if (event.error === "not-allowed") {
          voiceDebug.error("Microphone permission denied", "microphone");
          setError(permissionDeniedMessage());
          continuousModeRef.current = false;
          return;
        }
        if (event.error === "aborted") return;

        if (event.error === "no-speech") {
          if (
            continuousModeRef.current &&
            !isSpeakingRef.current &&
            !isProcessingRef.current
          ) {
            window.setTimeout(() => startListening(), RECOGNITION_RESTART_DELAY_MS);
          }
          return;
        }

        if (!recognitionRetryRef.current) {
          recognitionRetryRef.current = true;
          logVoiceEvent("Recognition retry", event.error);
          window.setTimeout(() => {
            recognitionRetryRef.current = false;
            if (continuousModeRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              startListening();
            }
          }, 800);
          return;
        }

        setError(recognitionFailedMessage(event.error));
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        isStartingRecognitionRef.current = false;
        logVoiceEvent("Recognition ended", "onend");
      };

      recognitionRef.current = recognition;

      voiceDebug.setStage("microphone", "working");
      voiceDebug.setStage("speechRecognition", "idle");

      const { messages, conversationContext } = useVoiceStore.getState();
      const shouldGreet = !conversationContext.greeted && messages.length === 0;

      if (shouldGreet) {
        const greeting = getLocalGreeting(language);
        addMessage({
          role: "assistant",
          content: greeting,
          timestamp: new Date().toISOString(),
        });
        setConversationContext({
          ...conversationContext,
          language,
          greeted: true,
          state: "CLASSIFICATION",
          workflowStatus: "idle",
          currentStep: "classify",
          currentWorkflow: null,
        });
        // Speak greeting BEFORE starting microphone — prevents echo of greeting
        await speak(greeting);
      } else {
        startListening();
      }

      return true;
    } catch (err) {
      const msg =
        err instanceof Error && err.message === "PERMISSION_DENIED"
          ? permissionDeniedMessage()
          : err instanceof Error
            ? err.message
            : "Connection failed";
      voiceDebug.error(msg, "speechRecognition");
      setError(msg);
      setStatus("error");
      return false;
    }
  }, [
    addMessage,
    language,
    processUserInput,
    scheduleSilenceFlush,
    setConversationContext,
    setDemoMode,
    setError,
    setHasActiveSession,
    setMode,
    setSessionId,
    speak,
    startListening,
  ]);

  const disconnect = useCallback(() => {
    continuousModeRef.current = false;
    clearSilenceTimer();
    stopListening("disconnect");
    releaseMicrophoneStream(micStreamRef.current);
    micStreamRef.current = null;
    if (recognitionRef.current) {
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    isProcessingRef.current = false;
    isListeningRef.current = false;
    isStartingRecognitionRef.current = false;
    sessionTranscriptRef.current = "";
    recognitionRetryRef.current = false;
    lastSpokenRef.current = "";
    setStatus("disconnected");
    voiceDebug.reset();
  }, [clearSilenceTimer, setStatus, stopListening]);

  useEffect(() => () => disconnect(), [disconnect]);

  useEffect(() => {
    setMicrophoneEnabled(
      micStreamRef.current,
      !isMuted && !isSpeakingRef.current && !isProcessingRef.current
    );
  }, [isMuted]);

  return { connect, disconnect };
}

export function useVoiceAssistant() {
  const realtime = useRealtimeVoice();
  const fallback = useFallbackVoice();
  const { setMode, setError, setStatus, setDemoMode } = useVoiceStore();

  const connect = useCallback(async () => {
    voiceDebug.log("Starting voice connection...");

    let demoMode = true;
    try {
      const health = await fetch("/api/health").then((r) => r.json());
      demoMode = health.demoMode ?? !health.openaiConfigured;
      setDemoMode(demoMode);
      voiceDebug.setOpenAIConfigured(!demoMode);
    } catch {
      setDemoMode(true);
      demoMode = true;
    }

    if (demoMode) {
      voiceDebug.log("Demo Mode — browser STT + built-in assistant + browser TTS");
      setMode("fallback");
      setError(null);
      const fallbackSuccess = await fallback.connect();
      if (!fallbackSuccess) {
        setError("Unable to connect. Check microphone permissions.");
        setStatus("error");
      }
      return;
    }

    const realtimeSuccess = await realtime.connect();
    if (realtimeSuccess) {
      voiceDebug.log("Connected via OpenAI Realtime");
      return;
    }

    voiceDebug.log("Realtime unavailable — using fallback (SpeechRecognition + Chat + TTS)");
    setMode("fallback");
    setError(null);
    const fallbackSuccess = await fallback.connect();
    if (!fallbackSuccess) {
      setError("Unable to connect. Check microphone permissions.");
      setStatus("error");
    }
  }, [realtime, fallback, setDemoMode, setMode, setError, setStatus]);

  const disconnect = useCallback(() => {
    realtime.disconnect();
    fallback.disconnect();
  }, [realtime, fallback]);

  return { connect, disconnect };
}
