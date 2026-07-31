import { NextRequest, NextResponse } from "next/server";
import { createRealtimeSession } from "@/lib/openai";
import { isOpenAIConfigured, getRealtimeModel } from "@/lib/openai-config";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const maxDuration = 10;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = checkRateLimit(`realtime:${ip}`);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

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
    logger.error("realtime session error", {
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create realtime session",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
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
    model: getRealtimeModel(),
  });
}
