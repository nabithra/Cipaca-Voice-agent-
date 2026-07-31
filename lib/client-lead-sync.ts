import type {
  ConversationContext,
  ConversationMessage,
  Language,
  Lead,
  LeadCategory,
  Notification,
} from "@/types";
import { generateId } from "@/lib/utils";

export function draftLeadId(conversationId: string): string {
  return `draft-${conversationId}`;
}

export function buildDraftLead(
  ctx: ConversationContext,
  messages: ConversationMessage[],
  language: Language,
  sessionId: string
): Lead | null {
  if (ctx.workflowStatus !== "active" || !ctx.currentWorkflow) return null;
  if (!ctx.name && !ctx.phone) return null;

  const category: LeadCategory =
    ctx.currentWorkflow === "emergency" ? "Emergency" : "Appointment";

  const now = new Date().toISOString();
  const id = draftLeadId(ctx.conversationId ?? sessionId);

  return {
    id,
    name: ctx.name ?? "Unknown",
    phone: ctx.phone ?? "",
    language,
    category,
    department: ctx.department,
    doctor: ctx.doctor,
    preferredDate: ctx.preferredDate,
    preferredTime: ctx.preferredTime,
    location: ctx.location,
    isTravelling: ctx.isTravelling,
    status: "in-progress",
    appointmentStatus: ctx.currentWorkflow === "appointment" ? "draft" : undefined,
    conversation: messages,
    conversationSummary: `In progress: ${ctx.currentStep}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function leadToNotification(lead: Lead): Notification {
  const isEmergency = lead.category === "Emergency";
  return {
    id: generateId(),
    type: isEmergency ? "emergency" : "appointment",
    priority: isEmergency ? "high" : "normal",
    title: isEmergency ? "Emergency Alert" : "New Appointment Request",
    message: isEmergency
      ? `Emergency from ${lead.name} — ${lead.location ?? "location pending"}`
      : `Appointment request from ${lead.name} — ${lead.department ?? "department pending"}`,
    targetTeam: isEmergency ? "Emergency Response" : "Appointment Team",
    leadId: lead.id,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function logStorageWarning(context: string, err: unknown): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[CIPACA Storage] ${context}:`, err);
  }
}
