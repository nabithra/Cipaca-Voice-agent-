export function isOpenAIConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return Boolean(key && key.length > 10 && !key.includes("your-openai"));
}

/** True when no paid OpenAI API is available — app runs on built-in demo assistant. */
export function isDemoMode(): boolean {
  if (process.env.VOICE_FORCE_FALLBACK === "true") return true;
  return !isOpenAIConfigured();
}
