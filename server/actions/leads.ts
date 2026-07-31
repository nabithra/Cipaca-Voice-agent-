"use server";

import { revalidatePath } from "next/cache";
import {
  createLead,
  generateReferenceId,
  generateTicketId,
  getAllLeads,
  updateLead,
} from "@/lib/storage";
import { createNotification } from "@/lib/notification-storage";
import { GRE_TEAM } from "@/lib/knowledge-base";
import type {
  AppointmentInput,
  ArrivalInput,
  EmergencyInput,
  EscalationInput,
  Lead,
  LeadInput,
} from "@/types";

async function notifyEmergency(lead: Lead, ticketId: string) {
  await createNotification({
    type: "emergency",
    priority: "high",
    title: "Emergency Alert",
    message: `${lead.emergencyType} at ${lead.location}. Ticket: ${ticketId}`,
    targetTeam: "GRE Emergency Team",
    leadId: lead.id,
    referenceId: ticketId,
  });
  await createNotification({
    type: "emergency",
    priority: "high",
    title: "Hospital Unit Alert",
    message: `Prepare for ${lead.emergencyType}. Patient from ${lead.location}`,
    targetTeam: lead.hospitalUnit ?? "Emergency Unit",
    leadId: lead.id,
    referenceId: ticketId,
  });
  await createNotification({
    type: "emergency",
    priority: "high",
    title: "Medical Team Alert",
    message: `Medical team standby for ${lead.emergencyType}`,
    targetTeam: "Medical Team",
    leadId: lead.id,
    referenceId: ticketId,
  });
}

async function notifyAppointment(lead: Lead, referenceId: string) {
  await createNotification({
    type: "appointment",
    priority: "normal",
    title: "New Appointment Request",
    message: `${lead.name} - ${lead.inquiryType ?? "Appointment"} on ${lead.preferredDate}`,
    targetTeam: "Appointment Team",
    leadId: lead.id,
    referenceId,
  });
}

async function notifyEscalation(lead: Lead, escalationId: string) {
  const gre = GRE_TEAM.find((g) => g.status === "available") ?? GRE_TEAM[0];
  await createNotification({
    type: "escalation",
    priority: "high",
    title: "GRE Escalation",
    message: `Escalation: ${lead.escalationReason}. Assigned to ${gre.name}`,
    targetTeam: gre.name,
    leadId: lead.id,
    referenceId: escalationId,
  });
}

async function notifyGeneral(lead: Lead) {
  await createNotification({
    type: "general",
    priority: "normal",
    title: "Customer Care Lead",
    message: `New inquiry from ${lead.name}: ${lead.conversationSummary ?? lead.category}`,
    targetTeam: "Customer Care",
    leadId: lead.id,
    referenceId: lead.referenceId,
  });
}

export async function saveLead(input: LeadInput): Promise<{
  success: boolean;
  lead?: Lead;
  error?: string;
}> {
  try {
    const lead = await createLead({
      name: input.name ?? "Unknown",
      phone: input.phone ?? "",
      language: input.language ?? "en",
      category: input.category ?? "General Inquiry",
      inquiryType: input.inquiryType,
      department: input.department,
      emergency: input.emergency ?? false,
      location: input.location,
      emergencyType: input.emergencyType,
      isTravelling: input.isTravelling,
      eta: input.eta,
      doctor: input.doctor,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      reason: input.reason,
      requestedService: input.requestedService,
      serviceType: input.serviceType,
      conversationSummary: input.conversationSummary,
      conversation: input.conversation ?? [],
      callbackRequested: input.callbackRequested,
      referenceId: generateReferenceId("LEAD"),
      appointmentStatus: input.category === "Appointment" ? "pending" : undefined,
      escalationStatus: "none",
    });

    if (lead.category === "General Inquiry") {
      await notifyGeneral(lead);
    }

    revalidatePath("/dashboard");
    return { success: true, lead };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save lead",
    };
  }
}

export async function saveEmergency(input: EmergencyInput): Promise<{
  success: boolean;
  lead?: Lead;
  ticketId?: string;
  error?: string;
}> {
  try {
    const ticketId = input.referenceId ?? generateTicketId();
    const gre = GRE_TEAM.find((g) => g.line === "emergency" && g.status !== "offline");

    const lead = await createLead({
      name: input.name,
      phone: input.phone,
      language: input.language ?? "en",
      category: "Emergency",
      inquiryType: "Emergency",
      emergency: true,
      location: input.location,
      emergencyType: input.emergencyType,
      isTravelling: input.isTravelling,
      eta: input.eta,
      patientName: input.patientName ?? input.name,
      hospitalUnit: input.hospitalUnit ?? "Thiruvannamalai Unit",
      transportType: input.transportType,
      attenderName: input.attenderName,
      conversation: input.conversation ?? [],
      conversationSummary: input.conversationSummary,
      ticketId,
      referenceId: ticketId,
      status: "escalated",
      emergencyStage: "alerting_gre",
      escalationStatus: "escalated",
      greAssigned: gre?.name,
      arrivalStage: input.isTravelling ? "patient_travelling" : undefined,
    });

    await notifyEmergency(lead, ticketId);

    revalidatePath("/dashboard");
    return { success: true, lead, ticketId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save emergency",
    };
  }
}

export async function saveAppointment(input: AppointmentInput): Promise<{
  success: boolean;
  lead?: Lead;
  referenceId?: string;
  error?: string;
}> {
  try {
    const referenceId = input.referenceId ?? generateReferenceId("APT");
    const lead = await createLead({
      name: input.name,
      phone: input.phone,
      language: input.language ?? "en",
      category: "Appointment",
      inquiryType: input.inquiryType ?? "Doctor Appointment",
      department: input.department,
      doctor: input.doctor,
      preferredDate: input.preferredDate,
      preferredTime: input.preferredTime,
      reason: input.reason,
      serviceType: input.serviceType,
      requestedService: input.requestedService,
      callbackRequested: input.callbackRequested ?? false,
      conversation: input.conversation ?? [],
      conversationSummary: input.conversationSummary,
      referenceId,
      status: "in-progress",
      appointmentStatus: "pending",
      escalationStatus: "none",
    });

    await notifyAppointment(lead, referenceId);

    revalidatePath("/dashboard");
    return { success: true, lead, referenceId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save appointment",
    };
  }
}

export async function escalateToHuman(input: EscalationInput): Promise<{
  success: boolean;
  lead?: Lead;
  escalationId?: string;
  error?: string;
}> {
  try {
    const escalationId = generateReferenceId("ESC");
    const gre = GRE_TEAM.find((g) => g.status === "available") ?? GRE_TEAM[0];

    const lead = await createLead({
      name: input.name ?? "Unknown",
      phone: input.phone ?? "",
      language: input.language ?? "en",
      category: "Escalation",
      conversation: input.conversation ?? [],
      conversationSummary: input.conversationSummary,
      referenceId: escalationId,
      escalationId,
      escalationReason: input.escalationReason ?? "caller_requested",
      status: "escalated",
      escalationStatus: "escalated",
      greAssigned: gre?.name,
    });

    await notifyEscalation(lead, escalationId);

    revalidatePath("/dashboard");
    return { success: true, lead, escalationId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to escalate",
    };
  }
}

export async function getLeads(): Promise<Lead[]> {
  return getAllLeads();
}

export async function updateLeadStatus(
  id: string,
  status: Lead["status"]
): Promise<{ success: boolean; error?: string }> {
  try {
    const updated = await updateLead(id, { status });
    if (!updated) return { success: false, error: "Lead not found" };
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update",
    };
  }
}

export async function syncLeadsFromClient(leads: Lead[]): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const existing = await getAllLeads();
    const existingIds = new Set(existing.map((l) => l.id));
    for (const lead of leads) {
      if (!existingIds.has(lead.id)) {
        await createLead({
          name: lead.name,
          phone: lead.phone,
          language: lead.language,
          category: lead.category,
          inquiryType: lead.inquiryType,
          department: lead.department,
          emergency: lead.emergency,
          location: lead.location,
          emergencyType: lead.emergencyType,
          isTravelling: lead.isTravelling,
          doctor: lead.doctor,
          preferredDate: lead.preferredDate,
          preferredTime: lead.preferredTime,
          conversation: lead.conversation,
          referenceId: lead.referenceId,
          ticketId: lead.ticketId,
          status: lead.status,
          conversationSummary: lead.conversationSummary,
        });
      }
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}
