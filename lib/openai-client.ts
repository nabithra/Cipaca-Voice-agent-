import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.includes("your-openai")) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function resetOpenAIClient(): void {
  client = null;
}
