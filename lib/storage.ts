import type { Lead } from "@/types";
import { getStorageAdapter } from "@/lib/storage-adapter";

export async function getAllLeads(): Promise<Lead[]> {
  return getStorageAdapter().getLeads();
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const leads = await getAllLeads();
  return leads.find((l) => l.id === id) ?? null;
}

export async function createLead(
  partial: Omit<Lead, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: Lead["status"];
    id?: string;
  }
): Promise<Lead> {
  return getStorageAdapter().createLead(partial);
}

export async function updateLead(
  id: string,
  updates: Partial<Lead>
): Promise<Lead | null> {
  return getStorageAdapter().updateLead(id, updates);
}

export async function deleteLead(id: string): Promise<boolean> {
  const leads = await getAllLeads();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length === leads.length) return false;
  await getStorageAdapter().updateLead(id, { status: "closed" });
  return true;
}

export function generateReferenceId(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

export function generateTicketId(): string {
  return generateReferenceId("EMG");
}

export { isStorageWritable } from "@/lib/storage-adapter";
