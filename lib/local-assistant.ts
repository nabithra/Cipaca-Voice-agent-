import type { ConversationContext, Language } from "@/types";
import { createInitialContext } from "@/types";
import {
  processConversationTurn,
  getGreeting,
  type EngineResult,
} from "@/lib/conversation-engine";

export { getGreeting as getLocalGreeting };

export function getLocalAssistantReply(
  userMessage: string,
  _history: { role: "user" | "assistant"; content: string }[],
  language: Language = "en",
  conversationContext?: ConversationContext
): EngineResult {
  const ctx = conversationContext ?? createInitialContext(language);
  return processConversationTurn(userMessage, { ...ctx, language });
}
