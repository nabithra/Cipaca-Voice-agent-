"use client";

import {
  configureRecognitionForMobile,
  getSpeechRecognitionConstructor,
  logVoiceEvent,
  recognitionErrorInfo,
} from "@/lib/mobile-voice";

export interface RecognitionState {
  recognitionRunning: boolean;
  isListening: boolean;
}

export interface SpeechRecognitionManagerOptions {
  language: "en" | "ta";
  onTranscript: (text: string) => void;
  onSpeechEnd?: () => void;
  onError: (code: string, userMessage: string | null, recoverable: boolean) => void;
  onStateChange?: (state: RecognitionState) => void;
}

/**
 * Manages a single SpeechRecognition instance with strict start/stop lifecycle.
 * Prevents overlapping sessions that cause "Speech Recognition cannot record now" on Android.
 */
export class SpeechRecognitionManager {
  private recognition: SpeechRecognition | null = null;
  private recognitionRunning = false;
  private enabled = true;
  private endWaiters: Array<() => void> = [];
  private options: SpeechRecognitionManagerOptions;

  constructor(options: SpeechRecognitionManagerOptions) {
    this.options = options;
  }

  get isRunning(): boolean {
    return this.recognitionRunning;
  }

  /** Create the single recognition instance (idempotent). */
  initialize(): boolean {
    if (this.recognition) return true;

    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return false;

    const recognition = new Ctor();
    configureRecognitionForMobile(recognition, this.options.language);
    this.attachHandlers(recognition);
    this.recognition = recognition;
    return true;
  }

  updateLanguage(language: "en" | "ta"): void {
    this.options.language = language;
    if (this.recognition) {
      this.recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
    }
  }

  destroy(): void {
    this.enabled = false;
    void this.stop("destroy");
    this.recognition = null;
    this.recognitionRunning = false;
  }

  private emitState(isListening: boolean): void {
    this.options.onStateChange?.({
      recognitionRunning: this.recognitionRunning,
      isListening,
    });
  }

  private notifyEndWaiters(): void {
    const waiters = this.endWaiters.splice(0);
    waiters.forEach((resolve) => resolve());
  }

  private waitForEnd(timeoutMs = 5000): Promise<void> {
    if (!this.recognitionRunning) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        logVoiceEvent("Recognition Ended", "wait timeout");
        this.recognitionRunning = false;
        this.emitState(false);
        resolve();
      }, timeoutMs);

      this.endWaiters.push(() => {
        window.clearTimeout(timer);
        resolve();
      });
    });
  }

  /** Stop and abort, then wait until onend fires. */
  async stop(reason = "manual"): Promise<void> {
    if (!this.recognition) return;

    if (this.recognitionRunning) {
      logVoiceEvent("Recognition stop requested", reason);
      try {
        this.recognition.stop();
      } catch {
        /* already stopped */
      }
      try {
        this.recognition.abort();
      } catch {
        /* already aborted */
      }
      await this.waitForEnd();
    } else {
      try {
        this.recognition.abort();
      } catch {
        /* ignore */
      }
    }

    this.recognitionRunning = false;
    this.emitState(false);
  }

  /**
   * Start recognition only when not already running.
   * If running, stop+abort first and wait for onend.
   */
  async start(): Promise<void> {
    if (!this.recognition || !this.enabled) return;

    if (this.recognitionRunning) {
      logVoiceEvent("Recognition start blocked", "already running — stopping first");
      await this.stop("restart-prep");
    }

    if (this.recognitionRunning) {
      logVoiceEvent("Recognition start blocked", "still running after stop");
      return;
    }

    try {
      this.recognition.start();
    } catch (err) {
      const name = (err as DOMException)?.name ?? "";
      logVoiceEvent("Recognition Error", `start failed: ${name || String(err)}`);

      if (name === "InvalidStateError") {
        await this.stop("invalid-state");
        if (!this.recognitionRunning && this.recognition) {
          try {
            this.recognition.start();
            logVoiceEvent("Recognition Started", "recovered after invalid-state");
          } catch (retryErr) {
            const retryName = (retryErr as DOMException)?.name ?? "";
            logVoiceEvent("Recognition Error", `retry start failed: ${retryName || String(retryErr)}`);
            this.options.onError(
              "invalid-state",
              "Voice recognition is busy. Tap the microphone to try again.",
              true
            );
          }
        }
      } else {
        this.options.onError(
          "start-failed",
          "Could not start voice recognition. Tap the microphone to try again.",
          true
        );
      }
    }
  }

  private attachHandlers(recognition: SpeechRecognition): void {
    recognition.onstart = () => {
      this.recognitionRunning = true;
      logVoiceEvent("Recognition Started", "onstart");
      this.emitState(true);
    };

    recognition.onend = () => {
      this.recognitionRunning = false;
      logVoiceEvent("Recognition Ended", "onend");
      this.notifyEndWaiters();
      this.emitState(false);
    };

    recognition.onspeechstart = () => {
      logVoiceEvent("Speech Started");
    };

    recognition.onspeechend = () => {
      logVoiceEvent("Speech Ended");
      this.options.onSpeechEnd?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = "";
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i][0].transcript;
      }
      const trimmed = full.trim();
      if (trimmed) {
        this.options.onTranscript(trimmed);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.recognitionRunning = false;
      this.notifyEndWaiters();
      this.emitState(false);

      logVoiceEvent("Recognition Error", event.error);

      const { message, recoverable } = recognitionErrorInfo(event.error);
      this.options.onError(event.error, message, recoverable);
    };
  }
}
