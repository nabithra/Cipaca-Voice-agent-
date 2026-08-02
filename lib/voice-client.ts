"use client";

import type { Language } from "@/types";
import { prepareForSpeech } from "@/lib/language-style";
import { transliterateForTamilTts } from "@/lib/tamil-phonetics";
import {
  tamilToSpokenRoman,
  TAMIL_FALLBACK_SPEECH_RATE,
} from "@/lib/tamil-tts-fallback";
import { chunkForSpeech, sanitizeForTts } from "@/lib/tamil-input";

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
/** Monotonic token — new speakText() invalidates in-flight browser TTS. */
let speakGeneration = 0;
/** Reuse one voice for all chunks in a single response. */
let sessionVoice: SpeechSynthesisVoice | undefined;
let sessionVoiceLang = "";

/** Preload browser voices early to avoid first-speak delay. */
export function preloadVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const load = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  load();
  window.speechSynthesis.onvoiceschanged = load;
}

/** Wait briefly for Tamil voices to load (common on first HTTPS page load). */
async function ensureVoicesLoaded(preferLang: "en" | "ta"): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const hasVoice = () =>
    window.speechSynthesis.getVoices().some((v) => v.lang.startsWith(preferLang));
  cachedVoices = window.speechSynthesis.getVoices();
  if (preferLang === "en" || hasVoice()) return;

  await new Promise<void>((resolve) => {
    const done = () => {
      cachedVoices = window.speechSynthesis.getVoices();
      resolve();
    };
    const timer = window.setTimeout(done, preferLang === "ta" ? 2500 : 800);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      done();
    };
  });
}

function cancelBrowserSpeech(): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve();
  }
  window.speechSynthesis.cancel();
  return new Promise((resolve) => setTimeout(resolve, 120));
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
  const preferLang: "en" | "ta" = language === "ta" ? "ta" : "en";

  return voices
    .map((v) => ({ v, s: scoreVoice(v, preferLang) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);
}

/** Pick one voice for the whole utterance — avoids per-chunk voice switching. */
function pickVoice(
  text: string,
  language: Language
): {
  voice?: SpeechSynthesisVoice;
  lang: string;
  tamilRomanFallback: boolean;
} {
  if (sessionVoice) {
    const isFallback = sessionVoiceLang === "en-IN-fallback";
    const isTamilNative = sessionVoice.lang.toLowerCase().startsWith("ta");

    if (language === "ta" && (isTamilNative || isFallback)) {
      return {
        voice: sessionVoice,
        lang: isFallback ? "en-IN" : sessionVoice.lang,
        tamilRomanFallback: isFallback,
      };
    }
    if (language === "en" && !isTamilNative && !isFallback) {
      return {
        voice: sessionVoice,
        lang: sessionVoiceLang || sessionVoice.lang,
        tamilRomanFallback: false,
      };
    }
    sessionVoice = undefined;
    sessionVoiceLang = "";
  }

  if (language === "ta") {
    const taCandidates = getVoiceCandidates(text, "ta");
    if (taCandidates.length > 0) {
      sessionVoice = taCandidates[0];
      sessionVoiceLang = taCandidates[0].lang;
      return { voice: sessionVoice, lang: sessionVoiceLang, tamilRomanFallback: false };
    }

    const enCandidates = getVoiceCandidates(text, "en");
    const enVoice =
      enCandidates.find((v) => v.lang === "en-IN") ??
      enCandidates.find((v) => v.lang.startsWith("en")) ??
      enCandidates[0];

    if (enVoice) {
      sessionVoice = enVoice;
      sessionVoiceLang = "en-IN-fallback";
      voiceDebug.log(
        `No Tamil voice on this device — using ${enVoice.name} with romanized Tamil`
      );
      return { voice: enVoice, lang: "en-IN", tamilRomanFallback: true };
    }

    return { voice: undefined, lang: "en-IN", tamilRomanFallback: true };
  }

  const candidates = getVoiceCandidates(text, language);
  if (candidates.length > 0) {
    sessionVoice = candidates[0];
    sessionVoiceLang = candidates[0].lang;
    return { voice: sessionVoice, lang: sessionVoiceLang, tamilRomanFallback: false };
  }

  return { voice: undefined, lang: "en-IN", tamilRomanFallback: false };
}

function prepareCloudSpeechText(text: string, language: Language): string {
  if (language !== "ta") {
    return prepareForSpeech(sanitizeForTts(text, language));
  }
  return prepareForSpeech(
    transliterateForTamilTts(sanitizeForTts(text, language))
  );
}

function prepareBrowserSpeechText(
  text: string,
  language: Language,
  tamilRomanFallback: boolean
): string {
  if (language !== "ta") {
    return prepareForSpeech(sanitizeForTts(text, language));
  }

  const tamilScript = prepareForSpeech(
    transliterateForTamilTts(sanitizeForTts(text, language))
  );

  if (!tamilRomanFallback) {
    return tamilScript;
  }

  return prepareForSpeech(tamilToSpokenRoman(tamilScript));
}

export async function speakText(
  text: string,
  language: Language,
  isMuted: boolean,
  options?: { demoMode?: boolean }
): Promise<"openai" | "cloud" | "browser" | "skipped"> {
  if (isMuted || !text.trim()) return "skipped";

  const generation = ++speakGeneration;
  await cancelBrowserSpeech();
  if (generation !== speakGeneration) return "skipped";

  await ensureVoicesLoaded(language === "ta" ? "ta" : "en");
  const { voice, lang, tamilRomanFallback } = pickVoice(text, language);
  const cloudText = prepareCloudSpeechText(text, language);
  const browserText = prepareBrowserSpeechText(text, language, tamilRomanFallback);
  if (!cloudText.trim() && !browserText.trim()) return "skipped";

  voiceDebug.setStage("tts", "loading");
  voiceDebug.log(
    language === "ta"
      ? `TTS (cloud Tamil): "${cloudText.slice(0, 60)}..."`
      : `TTS: speaking "${browserText.slice(0, 60)}..."`
  );

  const serverText = language === "ta" ? cloudText : browserText;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "tts", text: serverText, language }),
    });

    if (generation !== speakGeneration) return "skipped";

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("audio")) {
        const blob = await res.blob();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          try {
            await playAudioUrl(url, generation);
          } finally {
            URL.revokeObjectURL(url);
          }
          if (generation !== speakGeneration) return "skipped";
          voiceDebug.setStage("tts", "working");
          voiceDebug.setStage("speaker", "working");
          return options?.demoMode ? "cloud" : "openai";
        }
      }
    }
  } catch (err) {
    voiceDebug.log(`Server TTS error: ${err instanceof Error ? err.message : "unknown"}`);
  }

  if (generation !== speakGeneration) return "skipped";

  if (!browserText.trim()) return "skipped";

  voiceDebug.setStage("tts", "fallback");
  voiceDebug.log(
    tamilRomanFallback
      ? `TTS browser fallback (roman): "${browserText.slice(0, 60)}..."`
      : "TTS: using browser speechSynthesis"
  );

  if (voice) {
    voiceDebug.log(`TTS voice: ${voice.name} (${lang})`);
  } else if (tamilRomanFallback) {
    voiceDebug.log("TTS: no voice object — using default en-IN for roman Tamil");
  }

  const chunks = chunkForSpeech(browserText);
  try {
    for (const chunk of chunks) {
      if (generation !== speakGeneration) return "skipped";
      const ok = await speakOnce(
        chunk,
        voice,
        lang,
        generation,
        tamilRomanFallback ? TAMIL_FALLBACK_SPEECH_RATE : 0.95
      );
      if (!ok) {
        voiceDebug.log("TTS skipped — text shown on screen, voice continues");
        voiceDebug.setStage("tts", "fallback");
        voiceDebug.setStage("speaker", "idle");
        return "skipped";
      }
    }
    if (generation !== speakGeneration) return "skipped";
    voiceDebug.setStage("tts", "working");
    voiceDebug.setStage("speaker", "working");
    return "browser";
  } catch {
    voiceDebug.log("TTS unavailable — conversation continues without audio");
    voiceDebug.setStage("speaker", "idle");
    return "skipped";
  }
}

/** Clear cached voice (e.g. on disconnect or language change). */
export function resetSpeechVoice(): void {
  sessionVoice = undefined;
  sessionVoiceLang = "";
  speakGeneration++;
  void cancelBrowserSpeech();
}

function playAudioUrl(url: string, generation: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(check);
      resolve();
    };

    const check = setInterval(() => {
      if (generation !== speakGeneration) {
        audio.pause();
        finish();
      }
    }, 100);

    audio.onended = finish;
    audio.onerror = () => {
      clearInterval(check);
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch((err) => {
      clearInterval(check);
      reject(err);
    });
  });
}

function speakOnce(
  text: string,
  voice: SpeechSynthesisVoice | undefined,
  lang: string,
  generation: number,
  rate = 0.95
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    if (generation !== speakGeneration) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    if (voice) utterance.voice = voice;

    let settled = false;
    let started = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    utterance.onstart = () => {
      started = true;
    };
    utterance.onend = () => finish(started);
    utterance.onerror = (event) => {
      // Ignore "interrupted" when a newer speakText cancelled this one
      if (generation !== speakGeneration) {
        finish(false);
        return;
      }
      const err = (event as SpeechSynthesisErrorEvent).error;
      if (started && err === "interrupted") {
        finish(true);
        return;
      }
      finish(started);
    };

    window.speechSynthesis.speak(utterance);

    setTimeout(() => finish(started), 30000);
  });
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
