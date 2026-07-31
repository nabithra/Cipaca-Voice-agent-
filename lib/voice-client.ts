"use client";

import type { Language } from "@/types";

export type PipelineStage =
  | "microphone"
  | "speechRecognition"
  | "transcript"
  | "openaiRequest"
  | "openaiResponse"
  | "tts"
  | "speaker";

export type PipelineStatus = "idle" | "working" | "loading" | "failed" | "fallback";

export interface PipelineState {
  microphone: PipelineStatus;
  speechRecognition: PipelineStatus;
  transcript: PipelineStatus;
  openaiRequest: PipelineStatus;
  openaiResponse: PipelineStatus;
  tts: PipelineStatus;
  speaker: PipelineStatus;
  lastError: string | null;
  lastLog: string | null;
  openaiConfigured: boolean | null;
  apiSource: "openai" | "local" | "none";
}

const defaultState: PipelineState = {
  microphone: "idle",
  speechRecognition: "idle",
  transcript: "idle",
  openaiRequest: "idle",
  openaiResponse: "idle",
  tts: "idle",
  speaker: "idle",
  lastError: null,
  lastLog: null,
  openaiConfigured: null,
  apiSource: "none",
};

type Listener = (state: PipelineState) => void;

class VoiceDebugBus {
  private state: PipelineState = { ...defaultState };
  private listeners = new Set<Listener>();

  getState(): PipelineState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((l) => l(this.state));
  }

  reset() {
    this.state = { ...defaultState };
    this.emit();
  }

  setStage(stage: PipelineStage, status: PipelineStatus) {
    this.state = { ...this.state, [stage]: status };
    this.emit();
  }

  log(message: string) {
    console.log(`[CIPACA Voice] ${message}`);
    this.state = { ...this.state, lastLog: message };
    this.emit();
  }

  error(message: string, stage?: PipelineStage) {
    console.error(`[CIPACA Voice Error] ${message}`);
    this.state = {
      ...this.state,
      lastError: message,
      ...(stage ? { [stage]: "failed" as PipelineStatus } : {}),
    };
    this.emit();
  }

  setOpenAIConfigured(configured: boolean) {
    this.state = { ...this.state, openaiConfigured: configured };
    this.emit();
  }

  setApiSource(source: "openai" | "local" | "none") {
    this.state = { ...this.state, apiSource: source };
    this.emit();
  }
}

export const voiceDebug = new VoiceDebugBus();

export async function speakText(
  text: string,
  language: Language,
  isMuted: boolean,
  options?: { demoMode?: boolean }
): Promise<"openai" | "browser" | "skipped"> {
  if (isMuted || !text.trim()) return "skipped";

  voiceDebug.setStage("tts", "loading");
  voiceDebug.log(`TTS: speaking "${text.slice(0, 60)}..."`);

  if (!options?.demoMode) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tts", text }),
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          await playAudioUrl(url);
          URL.revokeObjectURL(url);
          voiceDebug.setStage("tts", "working");
          voiceDebug.setStage("speaker", "working");
          return "openai";
        }
      }
    } catch (err) {
      voiceDebug.log(`OpenAI TTS error: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }

  voiceDebug.setStage("tts", "fallback");
  voiceDebug.log("TTS: using browser speechSynthesis");

  try {
    await speakWithBrowser(text, language);
    voiceDebug.setStage("tts", "working");
    voiceDebug.setStage("speaker", "working");
    return "browser";
  } catch (err) {
    voiceDebug.error(
      `Browser TTS failed: ${err instanceof Error ? err.message : "unknown"}`,
      "tts"
    );
    voiceDebug.setStage("speaker", "failed");
    return "skipped";
  }
}

function playAudioUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio playback failed"));
    audio.play().catch(reject);
  });
}

function speakWithBrowser(text: string, language: Language): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("speechSynthesis not available"));
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(new Error(e.error ?? "speechSynthesis error"));

    // Voices may load async
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      language === "ta"
        ? v.lang.startsWith("ta")
        : v.lang.startsWith("en")
    );
    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.speak(utterance);
  });
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = 2
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  let lastError = "Request failed";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      voiceDebug.log(`API ${url} attempt ${attempt + 1}/${retries + 1}`);
      const res = await fetch(url, options);
      const data = (await res.json()) as T & { error?: string; details?: string };

      if (res.ok) {
        return { ok: true, status: res.status, data };
      }

      lastError = data.details ?? data.error ?? `HTTP ${res.status}`;
      voiceDebug.log(`API error ${res.status}: ${lastError}`);

      if (res.status === 401 || res.status === 403) break;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
      voiceDebug.log(`Network error: ${lastError}`);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
  }

  return { ok: false, status: 0, data: {} as T, error: lastError };
}
