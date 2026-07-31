import { NextRequest, NextResponse } from "next/server";
import {
  getChatResponse,
  synthesizeSpeech,
  executeSearchKnowledge,
  isOpenAIConfigured,
  isDemoMode,
} from "@/lib/openai";
import { getChatModel } from "@/lib/openai-config";
import { saveAppointment, saveEmergency } from "@/server/actions/leads";
import type { ConversationContext, ConversationMessage, Lead } from "@/types";
import { createInitialContext } from "@/types";
import { chatRequestSchema } from "@/lib/validation/chat-schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/** Vercel Hobby plan max serverless duration is 10 seconds. */
export const maxDuration = 10;

function errorResponse(
  error: unknown,
  context: string,
  status = 500
): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(context, { message, stack: process.env.NODE_ENV === "development" ? stack : undefined });

  return NextResponse.json(
    {
      error: message,
      details: `${context}: ${message}`,
      statusCode: status,
      model: isOpenAIConfigured() ? getChatModel() : "local-fallback",
      openaiConfigured: isOpenAIConfigured(),
      demoMode: isDemoMode(),
      stack: process.env.NODE_ENV === "development" ? stack : undefined,
    },
    { status }
  );
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    openaiConfigured: isOpenAIConfigured(),
    demoMode: isDemoMode(),
    endpoints: {
      chat: "/api/chat",
      tts: "/api/chat (action: tts)",
      realtime: "/api/realtime/session",
    },
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const ip = getClientIp(request);
  const rate = checkRateLimit(`chat:${ip}`);

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  try {
    const raw = await request.json();
    const parsed = chatRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const { language, action, conversationContext } = body;
    const sessionId = body.sessionId;
    const messages = body.messages;

    logger.info("chat request", {
      sessionId,
      action: action ?? "chat",
      language,
      messageCount: messages?.length,
      state: conversationContext?.state,
      demoMode: isDemoMode(),
    });

    if (action === "tts") {
      const text = body.text;
      if (!text?.trim()) {
        return NextResponse.json({ error: "Missing text for TTS" }, { status: 400 });
      }

      if (isDemoMode()) {
        return NextResponse.json(
          { fallback: "browser", demoMode: true },
          { status: 503 }
        );
      }

      const audio = await synthesizeSpeech(text);
      if (!audio) {
        return NextResponse.json(
          { fallback: "browser", openaiConfigured: isOpenAIConfigured() },
          { status: 503 }
        );
      }

      logger.info("tts success", { sessionId, durationMs: Date.now() - startTime });
      return new NextResponse(audio, {
        headers: { "Content-Type": "audio/mpeg" },
      });
    }

    if (action === "search") {
      const result = executeSearchKnowledge(body.query ?? "");
      return NextResponse.json({ result });
    }

    if (!messages?.length) {
      return NextResponse.json(
        { error: "Missing messages array", details: "Request body must include messages: []" },
        { status: 400 }
      );
    }

    const ctx: ConversationContext =
      (conversationContext as ConversationContext | undefined) ?? createInitialContext(language);

    const result = await getChatResponse(
      messages as { role: "user" | "assistant"; content: string }[],
      language,
      ctx
    );

    const conversation: ConversationMessage[] = [
      ...(messages as ConversationMessage[]),
      {
        role: "assistant",
        content: result.reply,
        timestamp: new Date().toISOString(),
      },
    ];

    let savedLead: Lead | undefined;

    if (result.shouldSaveAppointment && result.appointmentData) {
      const saveResult = await saveAppointment({
        ...result.appointmentData,
        referenceId: result.conversationContext?.referenceId,
        language,
        conversation,
        conversationSummary: result.conversationContext?.summary,
      });
      if (saveResult.success && saveResult.lead) {
        savedLead = saveResult.lead;
      }
    }

    if (result.shouldSaveEmergency && result.emergencyData) {
      const saveResult = await saveEmergency({
        name: result.emergencyData.name,
        phone: result.emergencyData.phone,
        location: result.emergencyData.location,
        emergencyType: result.emergencyData.emergencyType ?? "General Emergency",
        isTravelling: result.emergencyData.isTravelling ?? false,
        language,
        conversation,
        conversationSummary: result.conversationContext?.summary,
      });
      if (saveResult.success && saveResult.lead) {
        savedLead = saveResult.lead;
      }
    }

    logger.info("chat response", {
      sessionId,
      source: result.source,
      replyLength: result.reply.length,
      state: result.conversationContext?.state,
      savedLead: Boolean(savedLead),
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
      source: result.source,
      model: result.model ?? (result.source === "local" ? "local-assistant" : getChatModel()),
      openaiConfigured: isOpenAIConfigured(),
      demoMode: isDemoMode(),
      conversationContext: result.conversationContext,
      savedLead,
    });
  } catch (error) {
    return errorResponse(error, "Chat API", 500);
  }
}
