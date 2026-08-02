import { NextRequest, NextResponse } from "next/server";
import {
  getChatResponse,
  synthesizeSpeech,
  executeSearchKnowledge,
  isOpenAIConfigured,
  isDemoMode,
} from "@/lib/openai";
import { synthesizeCloudSpeech } from "@/lib/cloud-tts";
import { saveAppointment, saveEmergency, saveLead, escalateToHuman } from "@/server/actions/leads";
import type { ConversationContext, ConversationMessage, Lead, LeadCategory, InquiryType } from "@/types";
import { createInitialContext } from "@/types";

/** Vercel Hobby plan max serverless duration is 10 seconds. */
export const maxDuration = 10;

function errorResponse(
  error: unknown,
  context: string,
  status = 500
): NextResponse {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${context}]`, { message, stack });

  return NextResponse.json(
    {
      error: message,
      details: `${context}: ${message}`,
      statusCode: status,
      model: isOpenAIConfigured() ? "gpt-4o-mini" : "local-fallback",
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

  try {
    const body = await request.json();
    const { messages, language = "en", action, conversationContext } = body;

    console.log("[/api/chat] Request:", {
      action: action ?? "chat",
      language,
      messageCount: messages?.length,
      state: conversationContext?.state,
      demoMode: isDemoMode(),
    });

    if (action === "tts") {
      const text = body.text as string;
      const ttsLanguage = (body.language === "ta" ? "ta" : "en") as "en" | "ta";
      if (!text?.trim()) {
        return NextResponse.json({ error: "Missing text for TTS" }, { status: 400 });
      }

      if (!isDemoMode()) {
        const openaiAudio = await synthesizeSpeech(text);
        if (openaiAudio) {
          console.log("[/api/chat] OpenAI TTS success", {
            durationMs: Date.now() - startTime,
          });
          return new NextResponse(openaiAudio, {
            headers: { "Content-Type": "audio/mpeg" },
          });
        }
      }

      const cloudAudio = await synthesizeCloudSpeech(text, ttsLanguage);
      if (cloudAudio) {
        console.log("[/api/chat] Cloud TTS success", {
          language: ttsLanguage,
          durationMs: Date.now() - startTime,
        });
        return new NextResponse(cloudAudio, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      }

      return NextResponse.json(
        { fallback: "browser", demoMode: isDemoMode() },
        { status: 503 }
      );
    }

    if (action === "search") {
      const result = executeSearchKnowledge(body.query);
      return NextResponse.json({ result });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Missing messages array", details: "Request body must include messages: []" },
        { status: 400 }
      );
    }

    const ctx: ConversationContext =
      conversationContext ?? createInitialContext(language);

    const result = await getChatResponse(
      messages as { role: "user" | "assistant"; content: string }[],
      language,
      ctx
    );

    let savedLead: Lead | undefined;
    const conversation = messages as ConversationMessage[];

    if (result.shouldSaveAppointment && result.appointmentData) {
      const saveResult = await saveAppointment({
        ...result.appointmentData,
        inquiryType: result.appointmentData.inquiryType as InquiryType | undefined,
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

    if (result.shouldSaveLead && result.leadData) {
      const saveResult = await saveLead({
        name: result.leadData.name,
        phone: result.leadData.phone,
        category: result.leadData.category as LeadCategory,
        inquiryType: result.leadData.inquiryType as InquiryType | undefined,
        department: result.leadData.department,
        requestedService: result.leadData.requestedService,
        language,
        conversation,
        conversationSummary: result.leadData.conversationSummary,
      });
      if (saveResult.success && saveResult.lead) {
        savedLead = saveResult.lead;
      }
    }

    if (result.shouldEscalate) {
      const saveResult = await escalateToHuman({
        name: result.conversationContext?.name,
        phone: result.conversationContext?.phone,
        reason: result.leadData?.conversationSummary ?? "Caller requested human executive",
        escalationReason: "caller_requested",
        language,
        conversation,
        conversationSummary: result.conversationContext?.summary,
      });
      if (saveResult.success && saveResult.lead) {
        savedLead = saveResult.lead;
      }
    }

    console.log("[/api/chat] Response:", {
      source: result.source,
      replyLength: result.reply.length,
      state: result.conversationContext?.state,
      durationMs: Date.now() - startTime,
    });

    return NextResponse.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
      source: result.source,
      model: result.model ?? (result.source === "local" ? "local-assistant" : "gpt-4o-mini"),
      openaiConfigured: isOpenAIConfigured(),
      demoMode: isDemoMode(),
      conversationContext: result.conversationContext,
      savedLead,
    });
  } catch (error) {
    return errorResponse(error, "Chat API", 500);
  }
}
