export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.length > 10 && !key.includes("your-openai"));
}

/** True when no paid OpenAI API is available — app runs on built-in demo assistant. */
export function isDemoMode(): boolean {
  return !isOpenAIConfigured();
}

export function getChatModel(): string {
  return process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
}

export function getRealtimeModel(): string {
  return process.env.OPENAI_REALTIME_MODEL ?? "gpt-4o-realtime-preview-2024-12-17";
}

export function getTtsModel(): string {
  return process.env.OPENAI_TTS_MODEL ?? "tts-1";
}

export function isNlgParaphraseEnabled(): boolean {
  return process.env.ENABLE_NLG_PARAPHRASE === "true" && isOpenAIConfigured();
}
