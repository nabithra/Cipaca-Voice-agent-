import { NextRequest, NextResponse } from "next/server";
import { createRealtimeSession } from "@/lib/openai";
import { isOpenAIConfigured } from "@/lib/openai-config";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  try {
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        {
          demoMode: true,
          fallbackAvailable: true,
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const language = body.language === "ta" ? "ta" : "en";

    const session = await createRealtimeSession(language);

    return NextResponse.json(session);
  } catch (error) {
    console.error("[Realtime session error]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create realtime session",
        details: error instanceof Error ? error.stack : undefined,
        fallbackAvailable: true,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    available: isOpenAIConfigured(),
    mode: "realtime",
    model: "gpt-4o-realtime-preview-2024-12-17",
  });
}
