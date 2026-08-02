"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVoiceStore, saveLeadToLocalStorage, saveNotificationToLocalStorage, useNotificationStore } from "@/lib/store";
import { useLeadStore } from "@/lib/store";
import { useToolHandler } from "@/hooks/use-tool-handler";
import { speakText, fetchWithRetry, voiceDebug, preloadVoices, resetSpeechVoice } from "@/lib/voice-client";
import { runEmergencyStageSimulation } from "@/lib/emergency-flow";
import { GRE_TEAM } from "@/lib/knowledge-base";
import { getLocalGreeting } from "@/lib/local-assistant";
import { isWelcomeMessage } from "@/lib/language-style";
import type { ConversationContext, ConversationMessage, Lead, Notification } from "@/types";
import { createInitialContext } from "@/types";

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

function clientNotificationFromLead(lead: Lead): Notification {
  const ref = lead.referenceId ?? lead.ticketId ?? lead.escalationId ?? lead.id;
  const base = { id: `notif-${lead.id}`, read: false, leadId: lead.id, referenceId: ref, createdAt: lead.createdAt };
  if (lead.category === "Emergency") {
    return {
      ...base,
      type: "emergency",
      priority: "high",
      title: "Emergency Alert",
      message: `${lead.emergencyType ?? "Emergency"} — ${lead.location ?? "Location pending"}. Ticket: ${ref}`,
      targetTeam: lead.greAssigned ?? "GRE Emergency Team",
    };
  }
  if (lead.category === "Appointment") {
    return {
      ...base,
      type: "appointment",
      priority: "normal",
      title: "New Appointment Request",
      message: `${lead.name} — ${lead.department ?? "General"} on ${lead.preferredDate ?? "TBD"}`,
      targetTeam: "Appointment Team",
    };
  }
  if (lead.category === "Escalation") {
    return {
      ...base,
      type: "escalation",
      priority: "high",
      title: "GRE Escalation",
      message: `Escalation assigned to ${lead.greAssigned ?? "GRE Executive"}`,
      targetTeam: lead.greAssigned ?? "GRE/UCR Executive",
    };
  }
  return {
    ...base,
    type: "general",
    priority: "normal",
    title: "General Inquiry",
    message: lead.conversationSummary ?? `Inquiry from ${lead.name}`,
    targetTeam: "Customer Care",
  };
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
      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      voiceDebug.error(`Realtime failed: ${err instanceof Error ? err.message : "unknown"}`, "openaiRequest");
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
  const isSpeakingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isGreetingRef = useRef(false);
  const { handleToolCall } = useToolHandler();
  const { addLead } = useLeadStore();
  const { addNotification } = useNotificationStore();

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
    setEscalating,
    setGreAssigned,
    setEmergencyStage,
    dismissEmergencyBanner,
  } = useVoiceStore();

  const resumeListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setStatus("listening");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!/already started/i.test(msg)) {
        voiceDebug.log(`SpeechRecognition resume: ${msg || "unknown"}`);
      }
    }
  }, [setStatus]);

  const speak = useCallback(
    async (text: string) => {
      if (isMuted || !text.trim()) return;
      if (isSpeakingRef.current) return;
      isSpeakingRef.current = true;
      setStatus("speaking");
      try {
        const demoMode = useVoiceStore.getState().isDemoMode;
        await speakText(text, language, isMuted, { demoMode });
      } finally {
        isSpeakingRef.current = false;
        setStatus("listening");
        // Greeting finish — connect() starts recognition once after welcome
        if (!isGreetingRef.current) {
          resumeListening();
        }
      }
    },
    [isMuted, language, resumeListening, setStatus]
  );

  const processUserInput = useCallback(
    async (text: string) => {
      if (isProcessingRef.current || isGreetingRef.current) return;

      const store = useVoiceStore.getState();
      if (store.conversationContext.state === "SESSION_CLOSED") {
        voiceDebug.log("Session closed — ignoring input until Restart");
        return;
      }

      isProcessingRef.current = true;

      resetSpeechVoice();
      isSpeakingRef.current = false;

      setUserTranscript(text);
      voiceDebug.setStage("transcript", "working");
      voiceDebug.log(`User said: "${text}"`);

      const userMsg: ConversationMessage = {
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
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
        voiceDebug.log(`AI (${source}): "${responseText.slice(0, 80)}..."`);

        if (result.data.conversationContext) {
          setConversationContext(result.data.conversationContext);
          const ctx = result.data.conversationContext;
          if (ctx.greAssigned) setGreAssigned(ctx.greAssigned);
        }

        if (result.data.savedLead) {
          addLead(result.data.savedLead);
          saveLeadToLocalStorage(result.data.savedLead);
          const notif = clientNotificationFromLead(result.data.savedLead);
          addNotification(notif);
          saveNotificationToLocalStorage(notif);

          if (result.data.savedLead.category === "Emergency") {
            const ticketId =
              result.data.savedLead.ticketId ??
              result.data.savedLead.referenceId ??
              undefined;
            setEmergency(true, ticketId);
            const gre =
              result.data.savedLead.greAssigned ??
              GRE_TEAM.find((g) => g.line === "emergency")?.name ??
              null;
            if (gre) setGreAssigned(gre);
            // Fast stage simulation — non-blocking banner, auto-dismiss
            void runEmergencyStageSimulation(setEmergencyStage, {
              stepMs: 600,
              onComplete: () => {
                setTimeout(() => dismissEmergencyBanner(), 2500);
              },
            });
          }
          if (result.data.savedLead.category === "Escalation") {
            setEscalating(
              true,
              result.data.savedLead.escalationId ?? result.data.savedLead.referenceId
            );
            if (result.data.savedLead.greAssigned) {
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

        responseText = lang === "ta"
          ? "Sorry, adhu puriyala. Once more sollunga."
          : "Sorry, I didn't catch that. Could you please say that again?";
        voiceDebug.log(`Using fallback response: "${responseText.slice(0, 80)}"`);
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
      isProcessingRef.current = false;
    },
    [
      addLead,
      addNotification,
      addMessage,
      handleToolCall,
      setAiTranscript,
      setConversationContext,
      setEmergency,
      setEmergencyStage,
      dismissEmergencyBanner,
      setEscalating,
      setGreAssigned,
      setError,
      setStatus,
      setUserTranscript,
      speak,
    ]
  );

  const connect = useCallback(async (): Promise<boolean> => {
    try {
      setStatus("connecting");
      setError(null);
      setMode("fallback");

      preloadVoices();

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
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionAPI) {
        voiceDebug.error("SpeechRecognition not supported", "speechRecognition");
        throw new Error("Speech recognition not supported in this browser. Try Chrome or Edge.");
      }

      // Clean up any prior session before creating a new recognizer
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === "ta" ? "ta-IN,en-IN" : "en-IN";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += transcript;
          else interim += transcript;
        }

        if (interim) {
          setUserTranscript(interim);
          setStatus("listening");
          voiceDebug.setStage("speechRecognition", "working");
          if (isSpeakingRef.current) {
            resetSpeechVoice();
            isSpeakingRef.current = false;
          }
        }

        if (final.trim()) {
          if (isGreetingRef.current) return;
          if (isSpeakingRef.current) {
            resetSpeechVoice();
            isSpeakingRef.current = false;
          }
          if (!isProcessingRef.current) {
            processUserInput(final.trim());
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === "not-allowed") {
          voiceDebug.error("Microphone permission denied", "microphone");
          setError("Microphone permission denied. Please allow microphone access and reload.");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          voiceDebug.log(`SpeechRecognition: ${event.error}`);
        }
      };

      recognition.onend = () => {
        const { conversationContext } = useVoiceStore.getState();
        if (
          recognitionRef.current &&
          conversationContext.state !== "SESSION_CLOSED" &&
          !isGreetingRef.current
        ) {
          try { recognitionRef.current.start(); } catch { /* already running */ }
        }
      };

      recognitionRef.current = recognition;

      const { messages: currentMessages, conversationContext: currentCtx } =
        useVoiceStore.getState();
      const inActiveWorkflow = currentCtx.workflowStatus === "active";
      const hasWelcome = currentMessages.some(
        (m) => m.role === "assistant" && isWelcomeMessage(m.content)
      );
      const shouldGreet = !inActiveWorkflow && !hasWelcome;

      if (shouldGreet) {
        if (currentMessages.length > 0) {
          useVoiceStore.setState({ messages: [], userTranscript: "", aiTranscript: "" });
        }

        const greetingText = getLocalGreeting(language);
        addMessage({
          role: "assistant",
          content: greetingText,
          timestamp: new Date().toISOString(),
        });
        setConversationContext({
          ...createInitialContext(language),
          language,
          greeted: true,
          state: "CLASSIFICATION",
          workflowStatus: "idle",
          currentStep: "classify",
          currentWorkflow: null,
        });
        setUserTranscript("");
        setAiTranscript(greetingText);
        isGreetingRef.current = true;
        setStatus("speaking");
        await speak(greetingText);
        isGreetingRef.current = false;
      }

      try {
        recognition.start();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start speech recognition";
        if (!/already started/i.test(msg)) throw err;
      }

      voiceDebug.setStage("microphone", "working");
      voiceDebug.setStage("speechRecognition", "working");
      setStatus("listening");

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      voiceDebug.error(msg, "speechRecognition");
      setError(msg);
      setStatus("error");
      return false;
    }
  }, [
    addMessage,
    language,
    processUserInput,
    setConversationContext,
    setDemoMode,
    setEmergency,
    setError,
    setHasActiveSession,
    setMode,
    setSessionId,
    setStatus,
    setUserTranscript,
    setAiTranscript,
    speak,
  ]);

  const disconnect = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    resetSpeechVoice();
    isGreetingRef.current = false;
    isProcessingRef.current = false;
    setUserTranscript("");
    setAiTranscript("");
    setStatus("disconnected");
    voiceDebug.reset();
  }, [setStatus, setUserTranscript, setAiTranscript]);

  useEffect(() => () => disconnect(), [disconnect]);

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
        const detail = useVoiceStore.getState().error;
        setError(detail || "Unable to connect. Please try Restart or use Chrome/Edge.");
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
      const detail = useVoiceStore.getState().error;
      setError(detail || "Unable to connect. Please try Restart or use Chrome/Edge.");
      setStatus("error");
    }
  }, [realtime, fallback, setDemoMode, setMode, setError, setStatus]);

  const disconnect = useCallback(() => {
    realtime.disconnect();
    fallback.disconnect();
  }, [realtime, fallback]);

  return { connect, disconnect };
}
