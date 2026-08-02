"use client";

import type { Language } from "@/types";
import { prepareForSpeech } from "@/lib/language-style";
import { transliterateForTamilTts } from "@/lib/tamil-phonetics";
import { chunkForSpeech, preferTamilVoice, sanitizeForTts } from "@/lib/tamil-input";

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

let cachedVoices: SpeechSynthesisVoice[] = [];

/** Preload browser voices early to avoid first-speak delay. */
export function preloadVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const load = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

function scoreVoice(v: SpeechSynthesisVoice, preferLang: "en" | "ta"): number {
  const name = v.name.toLowerCase();
  const langOk =
    preferLang === "ta" ? v.lang.startsWith("ta") : v.lang.startsWith("en");
  if (!langOk) return -1;

  let score = 0;
  if (name.includes("neural") || name.includes("natural")) score += 60;
  if (name.includes("google")) score += 50;
  if (name.includes("microsoft")) score += 45;
  if (name.includes("online")) score += 35;
  if (preferLang === "ta" && name.includes("tamil")) score += 30;
  if (preferLang === "en" && (v.lang === "en-IN" || name.includes("india"))) score += 30;
  if (preferLang === "en" && v.lang === "en-US") score += 15;
  if (v.localService) score += 5;
  return score;
}

function getVoiceCandidates(text: string, language: Language): SpeechSynthesisVoice[] {
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  const preferLang: "en" | "ta" =
    preferTamilVoice(text, language) ? "ta" : language === "ta" ? "en" : "en";

  return voices
    .map((v) => ({ v, s: scoreVoice(v, preferLang) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

export async function speakText(
  text: string,
  language: Language,
  isMuted: boolean,
  options?: { demoMode?: boolean }
): Promise<"openai" | "browser" | "skipped"> {
  if (isMuted || !text.trim()) return "skipped";

  const speechText =
    language === "ta"
      ? prepareForSpeech(transliterateForTamilTts(sanitizeForTts(text, language)))
      : prepareForSpeech(sanitizeForTts(text, language));
  if (!speechText.trim()) return "skipped";

  voiceDebug.setStage("tts", "loading");
  voiceDebug.log(`TTS: speaking "${speechText.slice(0, 60)}..."`);

  if (!options?.demoMode) {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tts", text: speechText, language }),
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

  const chunks = chunkForSpeech(speechText);
  try {
    for (const chunk of chunks) {
      const ok = await speakChunkWithFallback(chunk, language);
      if (!ok) {
        voiceDebug.log("TTS skipped — text shown on screen, voice continues");
        voiceDebug.setStage("tts", "fallback");
        voiceDebug.setStage("speaker", "idle");
        return "skipped";
      }
    }
    voiceDebug.setStage("tts", "working");
    voiceDebug.setStage("speaker", "working");
    return "browser";
  } catch {
    voiceDebug.log("TTS unavailable — conversation continues without audio");
    voiceDebug.setStage("speaker", "idle");
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

function speakOnce(
  text: string,
  voice: SpeechSynthesisVoice | undefined,
  lang: string
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);

    // Chrome pause/resume hack — prevents stuck synthesis queue
    window.speechSynthesis.cancel();
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 50);

    setTimeout(() => finish(false), 15000);
  });
}

async function speakChunkWithFallback(text: string, language: Language): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;

  const candidates = getVoiceCandidates(text, language);
  const useTamil = preferTamilVoice(text, language);

  const attempts: { voice?: SpeechSynthesisVoice; lang: string }[] = [];

  for (const v of candidates.slice(0, 3)) {
    attempts.push({ voice: v, lang: v.lang });
  }
  if (useTamil) {
    attempts.push({ lang: "ta-IN" });
  }
  attempts.push({ lang: language === "ta" ? "en-IN" : "en-IN" });
  attempts.push({ lang: "en-US" });

  for (const attempt of attempts) {
    const ok = await speakOnce(text, attempt.voice, attempt.lang);
    if (ok) {
      if (attempt.voice) {
        voiceDebug.log(`TTS voice: ${attempt.voice.name} (${attempt.lang})`);
      }
      return true;
    }
  }

  return false;
}

export async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  retries = 1
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  let lastError = "Request failed";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt === 0) voiceDebug.log(`API ${url}`);
      const res = await fetch(url, options);
      const data = (await res.json()) as T & { error?: string; details?: string };

      if (res.ok) {
        return { ok: true, status: res.status, data };
      }

      lastError = data.details ?? data.error ?? `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) break;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Network error";
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }

  return { ok: false, status: 0, data: {} as T, error: lastError };
}
