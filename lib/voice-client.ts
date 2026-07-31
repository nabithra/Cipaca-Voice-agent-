"use client";

import {
  ensureAudioContext,
  MIC_CONSTRAINTS,
  primeSpeechSynthesisVoices,
} from "@/lib/mobile-voice";
import type { Language } from "@/types";

export { MIC_CONSTRAINTS };

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

/** Returns true if transcript likely echoes the last assistant utterance (mic picked up TTS). */
export function isLikelyAssistantEcho(transcript: string, assistantText: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  const t = normalize(transcript);
  const a = normalize(assistantText);
  if (!t || !a) return false;
  if (t === a) return true;
  if (a.includes(t) && t.length >= 8) return true;
  if (t.includes(a) && a.length >= 8) return true;
  const tWords = t.split(" ").filter(Boolean);
  if (tWords.length < 3) return false;
  const aWords = new Set(a.split(" ").filter(Boolean));
  const overlap = tWords.filter((w) => aWords.has(w)).length / tWords.length;
  return overlap >= 0.65;
}

export async function speakText(
  text: string,
  language: Language,
  isMuted: boolean,
  options?: { demoMode?: boolean }
): Promise<"openai" | "browser" | "skipped"> {
  if (isMuted || !text.trim()) return "skipped";

  await ensureAudioContext();
  primeSpeechSynthesisVoices();

  voiceDebug.setStage("tts", "loading");
  voiceDebug.log("TTS started");
  console.log("[CIPACA] TTS started:", text.slice(0, 120));

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
          voiceDebug.log("TTS ended");
          console.log("[CIPACA] TTS ended (OpenAI audio)");
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
    voiceDebug.log("TTS ended");
    console.log("[CIPACA] TTS ended (browser speechSynthesis)");
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
    void ensureAudioContext().then(() => {
      const audio = new Audio();
      audio.src = url;
      audio.preload = "auto";
      audio.setAttribute("playsinline", "true");
      audio.setAttribute("webkit-playsinline", "true");
      audio.onended = () => {
        voiceDebug.log("TTS ended");
        resolve();
      };
      audio.onerror = () => reject(new Error("Audio playback failed"));
      audio.play().catch(reject);
    });
  });
}

function speakWithBrowser(text: string, language: Language): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      reject(new Error("speechSynthesis not available"));
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const speakNow = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1;

      const voices = synth.getVoices();
      const preferred = voices.find((v) =>
        language === "ta" ? v.lang.startsWith("ta") : v.lang.startsWith("en")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => {
        voiceDebug.log("TTS started");
        console.log("[CIPACA] TTS started (browser)");
      };
      utterance.onend = () => {
        voiceDebug.log("TTS ended");
        console.log("[CIPACA] TTS ended (browser)");
        resolve();
      };
      utterance.onerror = (e) =>
        reject(new Error(e.error ?? "speechSynthesis error"));

      // iOS Safari requires a short delay after cancel before speak().
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setTimeout(() => synth.speak(utterance), 50);
      } else {
        synth.speak(utterance);
      }
    };

    const voices = synth.getVoices();
    if (voices.length === 0) {
      synth.addEventListener("voiceschanged", speakNow, { once: true });
      synth.getVoices();
    } else {
      speakNow();
    }
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
