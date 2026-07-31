"use client";

export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

/** Silence after last speech before submitting transcript (ms). */
export const SILENCE_MS = 1750;

/** Delay before restarting recognition after a clean stop (ms). */
export const RECOGNITION_RESTART_DELAY_MS = 300;

export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function getSpeechRecognitionConstructor():
  | (new () => SpeechRecognition)
  | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function getBrowserVoiceLabel(): string {
  if (isIOS()) return "Safari (iOS)";
  if (isAndroid()) return "Chrome (Android)";
  return "Desktop";
}

export function logVoiceEvent(event: string, detail?: string): void {
  const message = detail ? `${event} — ${detail}` : event;
  console.log(`[CIPACA Voice] ${message}`);
}

let sharedAudioContext: AudioContext | null = null;

/** Resume/create AudioContext — required on iOS Safari after user gesture. */
export async function ensureAudioContext(): Promise<AudioContext | null> {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new Ctx();
    }
    if (sharedAudioContext.state === "suspended") {
      await sharedAudioContext.resume();
      logVoiceEvent("AudioContext resumed");
    }
    return sharedAudioContext;
  } catch (err) {
    logVoiceEvent(
      "AudioContext error",
      err instanceof Error ? err.message : "unknown"
    );
    return null;
  }
}

export async function requestMicrophoneAccess(options?: {
  retries?: number;
}): Promise<MediaStream> {
  const retries = options?.retries ?? 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      logVoiceEvent(
        "Microphone permission",
        attempt === 0 ? "requesting" : `retry ${attempt}`
      );
      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      logVoiceEvent("Microphone permission", "granted");
      return stream;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const name = (err as DOMException)?.name ?? "";
      logVoiceEvent("Microphone permission", `denied (${name || lastError.message})`);

      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        throw new Error("PERMISSION_DENIED");
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  throw lastError ?? new Error("Microphone unavailable");
}

export function setMicrophoneEnabled(
  stream: MediaStream | null | undefined,
  enabled: boolean
): void {
  stream?.getAudioTracks().forEach((track) => {
    track.enabled = enabled;
  });
}

export function releaseMicrophoneStream(
  stream: MediaStream | null | undefined
): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function permissionDeniedMessage(): string {
  return isMobileDevice()
    ? "Microphone access is required. Please allow microphone in your browser settings, then tap the microphone button again."
    : "Microphone permission denied. Please allow microphone access in your browser and reload the page.";
}

export function recognitionUnavailableMessage(): string {
  const browser = getBrowserVoiceLabel();
  return `Speech recognition is not available in ${browser}. Please use Chrome on Android, Safari on iPhone, or Edge on Android.`;
}

export function recognitionFailedMessage(error: string): string {
  switch (error) {
    case "network":
      return "Voice recognition lost connection. Tap the microphone to try again.";
    case "no-speech":
      return "No speech detected. Tap the microphone and speak clearly.";
    case "audio-capture":
      return "Could not access the microphone. Another app may be using it. Close other apps and try again.";
    case "not-allowed":
      return permissionDeniedMessage();
    case "service-not-allowed":
      return "Speech recognition is not allowed on this device or browser. Try Chrome on Android or Safari on iPhone.";
    case "display-capture":
      return "Screen capture blocked voice recognition. Close screen recording and tap the microphone again.";
    case "aborted":
      return "Voice recognition was interrupted.";
    default:
      return "Voice recognition interrupted. Tap the microphone to continue.";
  }
}

/** Classify recognition errors for messaging and retry policy. */
export function recognitionErrorInfo(error: string): {
  message: string | null;
  recoverable: boolean;
} {
  switch (error) {
    case "aborted":
      return { message: null, recoverable: false };
    case "no-speech":
      return { message: null, recoverable: true };
    case "not-allowed":
      return { message: permissionDeniedMessage(), recoverable: false };
    case "service-not-allowed":
      return { message: recognitionFailedMessage("service-not-allowed"), recoverable: false };
    case "display-capture":
      return { message: recognitionFailedMessage("display-capture"), recoverable: false };
    case "audio-capture":
      return { message: recognitionFailedMessage("audio-capture"), recoverable: true };
    case "network":
      return { message: recognitionFailedMessage("network"), recoverable: true };
    default:
      return { message: recognitionFailedMessage(error), recoverable: true };
  }
}

/** Prime speechSynthesis voices (async on mobile). */
export function primeSpeechSynthesisVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener(
    "voiceschanged",
    () => {
      window.speechSynthesis.getVoices();
    },
    { once: true }
  );
}

export function configureRecognitionForMobile(
  recognition: SpeechRecognition,
  language: "en" | "ta"
): void {
  recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  // iOS Safari handles single-utterance mode more reliably.
  recognition.continuous = !isIOS();
}
