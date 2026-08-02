/**
 * Server-side Tamil/English TTS via Microsoft Edge voices.
 * Same quality on every device — no local Tamil voice required.
 */

import { EdgeTTS } from "edge-tts-universal";
import type { Language } from "@/types";

const VOICES: Record<Language, string> = {
  ta: "ta-IN-PallaviNeural",
  en: "en-IN-NeerjaNeural",
};

const MAX_CHARS = 280;

function splitForTts(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= MAX_CHARS) return [trimmed];

  const parts: string[] = [];
  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  let buf = "";

  for (const sentence of sentences) {
    if ((buf + sentence).length > MAX_CHARS && buf) {
      parts.push(buf.trim());
      buf = sentence;
    } else {
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.length ? parts : [trimmed.slice(0, MAX_CHARS)];
}

async function synthesizeChunk(
  text: string,
  voice: string
): Promise<ArrayBuffer | null> {
  try {
    const tts = new EdgeTTS(text, voice, { rate: "-5%" });
    const result = await tts.synthesize();
    return result.audio.arrayBuffer();
  } catch (err) {
    console.error("[Cloud TTS chunk error]", err);
    return null;
  }
}

/** Synthesize speech using Edge online voices (free, no API key). */
export async function synthesizeCloudSpeech(
  text: string,
  language: Language = "en"
): Promise<ArrayBuffer | null> {
  const input = text.trim();
  if (!input) return null;

  const voice = VOICES[language] ?? VOICES.en;
  const chunks = splitForTts(input);

  const buffers: ArrayBuffer[] = [];
  for (const chunk of chunks) {
    const audio = await synthesizeChunk(chunk, voice);
    if (!audio || audio.byteLength === 0) return null;
    buffers.push(audio);
  }

  if (buffers.length === 1) return buffers[0];

  const combined = Buffer.concat(buffers.map((b) => Buffer.from(b)));
  return combined.buffer.slice(
    combined.byteOffset,
    combined.byteOffset + combined.byteLength
  );
}
