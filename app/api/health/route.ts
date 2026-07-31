import { NextResponse } from "next/server";
import { isOpenAIConfigured, isDemoMode } from "@/lib/openai-config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    openaiConfigured: isOpenAIConfigured(),
    demoMode: isDemoMode(),
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    voicePipeline: {
      realtime: isOpenAIConfigured(),
      fallback: true,
      browserTTS: true,
      browserSTT: true,
      localAssistant: isDemoMode(),
    },
  });
}
