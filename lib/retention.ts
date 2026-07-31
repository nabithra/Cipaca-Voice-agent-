import type { Lead } from "@/types";

const RETENTION_DAYS = Number(process.env.LEAD_RETENTION_DAYS ?? "90");

export function filterExpiredLeads(leads: Lead[]): Lead[] {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return leads.filter((l) => new Date(l.createdAt).getTime() >= cutoff);
}

export function getRetentionDays(): number {
  return RETENTION_DAYS;
}
