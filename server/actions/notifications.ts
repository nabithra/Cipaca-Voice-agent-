"use server";

import { revalidatePath } from "next/cache";
import { createNotification, getAllNotifications, markNotificationRead } from "@/lib/notification-storage";
import type { Notification } from "@/types";

export async function getNotifications(): Promise<Notification[]> {
  return getAllNotifications();
}

export async function createSystemNotification(
  partial: Omit<Notification, "id" | "createdAt" | "read">
): Promise<{ success: boolean; notification?: Notification }> {
  const notification = await createNotification(partial);
  revalidatePath("/dashboard");
  return { success: true, notification };
}

export async function markRead(id: string): Promise<{ success: boolean }> {
  await markNotificationRead(id);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function notifyReceivingUnit(data: {
  patientName: string;
  hospitalUnit: string;
  leadId?: string;
}): Promise<{ success: boolean }> {
  await createNotification({
    type: "arrival",
    priority: "high",
    title: "Receiving Unit Notified",
    message: `${data.patientName} en route to ${data.hospitalUnit}`,
    targetTeam: data.hospitalUnit,
    leadId: data.leadId,
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function notifyMedicalTeam(data: {
  patientName: string;
  hospitalUnit: string;
  leadId?: string;
}): Promise<{ success: boolean }> {
  await createNotification({
    type: "arrival",
    priority: "high",
    title: "Medical Team Notified",
    message: `Medical team standby for ${data.patientName} at ${data.hospitalUnit}`,
    targetTeam: "Medical Team",
    leadId: data.leadId,
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function prepareAdmission(data: {
  patientName: string;
  hospitalUnit: string;
  leadId?: string;
}): Promise<{ success: boolean }> {
  await createNotification({
    type: "arrival",
    priority: "high",
    title: "Admission Prepared",
    message: `Admission bed prepared for ${data.patientName} at ${data.hospitalUnit}`,
    targetTeam: "Admission Desk",
    leadId: data.leadId,
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateArrivalStatus(data: {
  patientName: string;
  hospitalUnit: string;
  status: string;
  leadId?: string;
}): Promise<{ success: boolean }> {
  await createNotification({
    type: "arrival",
    priority: "normal",
    title: "Arrival Status Update",
    message: `${data.patientName}: ${data.status}`,
    targetTeam: data.hospitalUnit,
    leadId: data.leadId,
  });
  revalidatePath("/dashboard");
  return { success: true };
}
