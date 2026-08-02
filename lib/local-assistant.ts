import type {
  ConversationContext,
  ConversationMessage,
  InquiryType,
  Language,
  Lead,
  LeadCategory,
} from "@/types";
import { createInitialContext } from "@/types";
import { GRE_TEAM } from "@/lib/knowledge-base";
import { generateId } from "@/lib/utils";
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

export function buildLocalChatResponse(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  language: Language,
  conversationContext: ConversationContext | undefined,
  conversation: ConversationMessage[]
): {
  reply: string;
  source: "local";
  conversationContext: ConversationContext;
  savedLead?: Lead;
  toolCalls: [];
} {
  const engine = getLocalAssistantReply(
    userMessage,
    history,
    language,
    conversationContext
  );
  return {
    reply: engine.reply,
    source: "local",
    conversationContext: engine.context,
    savedLead: leadFromEngineResult(engine, language, conversation),
    toolCalls: [],
  };
}

export function leadFromEngineResult(
  engine: EngineResult,
  language: Language,
  conversation: ConversationMessage[]
): Lead | undefined {
  const now = new Date().toISOString();

  if (engine.shouldSaveAppointment && engine.appointmentData) {
    const ref =
      engine.appointmentData.referenceId ??
      `APT-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      id: generateId(),
      name: engine.appointmentData.name,
      phone: engine.appointmentData.phone,
      language,
      category: "Appointment",
      inquiryType: engine.appointmentData.inquiryType as InquiryType | undefined,
      department: engine.appointmentData.department,
      doctor: engine.appointmentData.doctor,
      preferredDate: engine.appointmentData.preferredDate,
      preferredTime: engine.appointmentData.preferredTime,
      referenceId: ref,
      appointmentStatus: "pending",
      escalationStatus: "none",
      status: "new",
      createdAt: now,
      updatedAt: now,
      conversation,
      conversationSummary: engine.context.summary,
    };
  }

  if (engine.shouldSaveEmergency && engine.emergencyData) {
    const ticketId =
      engine.emergencyData.referenceId ??
      `EMG-${Math.floor(100000 + Math.random() * 900000)}`;
    const gre = GRE_TEAM.find((g) => g.line === "emergency" && g.status !== "offline");
    return {
      id: generateId(),
      name: engine.emergencyData.name,
      phone: engine.emergencyData.phone,
      language,
      category: "Emergency",
      inquiryType: "Emergency",
      emergency: true,
      location: engine.emergencyData.location,
      emergencyType: engine.emergencyData.emergencyType,
      isTravelling: engine.emergencyData.isTravelling,
      ticketId,
      referenceId: ticketId,
      greAssigned: gre?.name,
      emergencyStage: "alerting_gre",
      escalationStatus: "escalated",
      status: "escalated",
      createdAt: now,
      updatedAt: now,
      conversation,
      conversationSummary: engine.context.summary,
    };
  }

  if (engine.shouldSaveLead && engine.leadData) {
    return {
      id: generateId(),
      name: engine.leadData.name,
      phone: engine.leadData.phone,
      language,
      category: engine.leadData.category as LeadCategory,
      inquiryType: engine.leadData.inquiryType as InquiryType | undefined,
      department: engine.leadData.department,
      requestedService: engine.leadData.requestedService,
      referenceId: `LEAD-${Math.floor(100000 + Math.random() * 900000)}`,
      escalationStatus: "none",
      status: "new",
      createdAt: now,
      updatedAt: now,
      conversation,
      conversationSummary:
        engine.leadData.conversationSummary ?? engine.context.summary,
    };
  }

  if (engine.shouldEscalate) {
    const escId = `ESC-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      id: generateId(),
      name: engine.context.name ?? "Unknown",
      phone: engine.context.phone ?? "",
      language,
      category: "Escalation",
      escalationId: escId,
      referenceId: escId,
      greAssigned: engine.context.greAssigned,
      escalationStatus: "escalated",
      status: "escalated",
      createdAt: now,
      updatedAt: now,
      conversation,
      conversationSummary:
        engine.context.summary ?? engine.leadData?.conversationSummary,
    };
  }

  return undefined;
}
