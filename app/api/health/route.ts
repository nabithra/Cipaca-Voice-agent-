import { NextResponse } from "next/server";
import { isOpenAIConfigured, isDemoMode } from "@/lib/openai-config";
import { isStorageWritable, isPostgresConfigured } from "@/lib/storage-adapter";

const startedAt = Date.now();

export async function GET() {
  const storageWritable = await isStorageWritable();

  return NextResponse.json({
    status: "ok",
    openaiConfigured: isOpenAIConfigured(),
    demoMode: isDemoMode(),
    storageWritable,
    storageBackend: isPostgresConfigured() ? "postgres" : "json",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
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
