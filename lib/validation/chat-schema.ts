import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(4000),
  timestamp: z.string().optional(),
});

const conversationContextSchema = z
  .object({
    conversationId: z.string().optional(),
    state: z.string(),
    currentWorkflow: z.enum(["appointment", "emergency", "faq"]).nullable().optional(),
    workflowStatus: z.enum(["idle", "active", "completed", "closed"]).optional(),
    currentStep: z.string().optional(),
    intent: z.enum(["appointment", "emergency", "general", "escalation"]).nullable().optional(),
    language: z.enum(["en", "ta"]).optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    greeted: z.boolean().optional(),
    awaitingAnythingElse: z.boolean().optional(),
    appointmentSaved: z.boolean().optional(),
  })
  .passthrough();

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50).optional(),
  language: z.enum(["en", "ta"]).default("en"),
  action: z.enum(["chat", "tts", "search"]).optional(),
  text: z.string().max(4000).optional(),
  query: z.string().max(500).optional(),
  sessionId: z.string().max(100).optional(),
  conversationContext: conversationContextSchema.optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
