import OpenAI from "openai";
import { CIPACA_SYSTEM_PROMPT, getLanguageInstruction } from "@/lib/prompt";
import { OPENAI_CHAT_TOOLS } from "@/lib/tools";
import { searchKnowledgeBase } from "@/lib/knowledge-base";
import { isOpenAIConfigured, isDemoMode } from "@/lib/openai-config";
import { getOpenAIClient } from "@/lib/openai-client";
import { getLocalGreeting } from "@/lib/local-assistant";
import { buildContextPrompt, processConversationTurn, isWorkflowActive } from "@/lib/conversation-engine";
import type { ConversationContext, Language } from "@/types";
import { createInitialContext } from "@/types";
import {
  saveLead,
  saveEmergency,
  saveAppointment,
  escalateToHuman,
} from "@/server/actions/leads";
import { coordinateArrival } from "@/server/actions/arrival";
import { searchKnowledge } from "@/server/actions/knowledge";

export { isOpenAIConfigured, isDemoMode, getLocalGreeting };

export interface ChatToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatResult {
  reply: string;
  toolCalls: ChatToolCall[];
  source: "openai" | "local";
  model?: string;
  conversationContext?: ConversationContext;
  shouldSaveAppointment?: boolean;
  shouldSaveEmergency?: boolean;
  appointmentData?: {
    name: string;
    phone: string;
    department: string;
    doctor?: string;
    preferredDate: string;
    preferredTime: string;
    referenceId?: string;
  };
  emergencyData?: {
    name: string;
    phone: string;
    location: string;
    emergencyType?: string;
    isTravelling?: boolean;
    referenceId?: string;
  };
}

export async function createRealtimeSession(
  language: "en" | "ta" = "en"
): Promise<{ clientSecret: string; expiresAt: number }> {
  const openai = getOpenAIClient();
  const { AI_TOOLS } = await import("@/lib/tools");

  const session = await openai.beta.realtime.sessions.create({
    model: "gpt-4o-realtime-preview-2024-12-17",
    voice: "alloy",
    modalities: ["text", "audio"],
    instructions: `${CIPACA_SYSTEM_PROMPT}\n\n${getLanguageInstruction(language)}`,
    input_audio_transcription: { model: "whisper-1" },
    turn_detection: {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 700,
    },
    tools: AI_TOOLS.map((t) => ({ ...t, type: "function" as const })),
  });

  return {
    clientSecret: session.client_secret.value,
    expiresAt: session.client_secret.expires_at,
  };
}

async function executeToolServerSide(
  name: string,
  args: Record<string, unknown>,
  language: Language
): Promise<string> {
  try {
    switch (name) {
      case "search_knowledge":
        return JSON.stringify({ result: await searchKnowledge(args.query as string) });
      case "save_lead":
        return JSON.stringify(await saveLead({ ...(args as unknown as Parameters<typeof saveLead>[0]), language, conversation: [] }));
      case "save_emergency":
        return JSON.stringify(await saveEmergency({ ...(args as unknown as Parameters<typeof saveEmergency>[0]), language, conversation: [] }));
      case "save_appointment":
        return JSON.stringify(await saveAppointment({ ...(args as unknown as Parameters<typeof saveAppointment>[0]), language, conversation: [] }));
      case "coordinate_arrival":
        return JSON.stringify(
          await coordinateArrival(args as unknown as Parameters<typeof coordinateArrival>[0])
        );
      case "escalate_to_human":
        return JSON.stringify(await escalateToHuman({ ...(args as unknown as Parameters<typeof escalateToHuman>[0]), language, conversation: [] }));
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "Tool execution failed",
    });
  }
}

export async function getChatCompletionWithTools(
  messages: { role: "user" | "assistant"; content: string }[],
  language: Language = "en",
  conversationContext?: ConversationContext
): Promise<ChatResult> {
  const openai = getOpenAIClient();
  const model = "gpt-4o-mini";
  const allToolCalls: ChatToolCall[] = [];
  const ctx = conversationContext ?? createInitialContext(language);

  type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

  const apiMessages: ChatMessage[] = [
    {
      role: "system",
      content: `${CIPACA_SYSTEM_PROMPT}\n\n${getLanguageInstruction(language)}\n\n${buildContextPrompt(ctx)}`,
    },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  for (let round = 0; round < 3; round++) {
    const response = await openai.chat.completions.create({
      model,
      messages: apiMessages,
      tools: OPENAI_CHAT_TOOLS,
      tool_choice: "auto",
      max_tokens: 500,
      temperature: 0.7,
    });

    const choice = response.choices[0]?.message;
    if (!choice) break;

    if (choice.tool_calls?.length) {
      apiMessages.push(choice);

      for (const tc of choice.tool_calls) {
        if (tc.type !== "function") continue;
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          // empty args
        }
        allToolCalls.push({ name: tc.function.name, arguments: parsed });
        const output = await executeToolServerSide(tc.function.name, parsed, language);
        apiMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: output,
        });
      }
      continue;
    }

    const reply = choice.content?.trim() || "I'm here to help. How can I assist you?";
    return { reply, toolCalls: allToolCalls, source: "openai", model };
  }

  return {
    reply: "I'm here to help. Could you please tell me more?",
    toolCalls: allToolCalls,
    source: "openai",
    model,
    conversationContext: ctx,
  };
}

export async function getChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  language: Language = "en",
  conversationContext?: ConversationContext
): Promise<ChatResult> {
  const ctx = conversationContext ?? createInitialContext(language);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const engineResult = lastUser
    ? processConversationTurn(lastUser.content, ctx, { isDemoMode: isDemoMode() })
    : { reply: "How may I help you?", context: ctx };

  const useEngineReply =
    !isOpenAIConfigured() ||
    isWorkflowActive(ctx) ||
    isWorkflowActive(engineResult.context) ||
    engineResult.context.workflowStatus === "completed" ||
    engineResult.context.awaitingAnythingElse ||
    engineResult.context.state === "SESSION_CLOSED";

  if (useEngineReply) {
    return {
      reply: engineResult.reply,
      toolCalls: [],
      source: "local",
      model: "local-assistant",
      conversationContext: engineResult.context,
      shouldSaveAppointment: engineResult.shouldSaveAppointment,
      shouldSaveEmergency: engineResult.shouldSaveEmergency,
      appointmentData: engineResult.appointmentData,
      emergencyData: engineResult.emergencyData,
    };
  }

  try {
    const openaiResult = await getChatCompletionWithTools(messages, language, ctx);
    return {
      ...openaiResult,
      conversationContext: engineResult.context,
      shouldSaveAppointment: engineResult.shouldSaveAppointment,
      shouldSaveEmergency: engineResult.shouldSaveEmergency,
      appointmentData: engineResult.appointmentData,
      emergencyData: engineResult.emergencyData,
    };
  } catch (err) {
    console.error("[OpenAI Chat Error]", err);
    return {
      reply: engineResult.reply,
      toolCalls: [],
      source: "local",
      model: "local-assistant",
      conversationContext: engineResult.context,
      shouldSaveAppointment: engineResult.shouldSaveAppointment,
      shouldSaveEmergency: engineResult.shouldSaveEmergency,
      appointmentData: engineResult.appointmentData,
      emergencyData: engineResult.emergencyData,
    };
  }
}

export async function synthesizeSpeech(text: string): Promise<ArrayBuffer | null> {
  if (!isOpenAIConfigured()) return null;
  try {
    const openai = getOpenAIClient();
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "mp3",
    });
    return response.arrayBuffer();
  } catch (err) {
    console.error("[OpenAI TTS Error]", err);
    return null;
  }
}

export function executeSearchKnowledge(query: string): string {
  return searchKnowledgeBase(query);
}
