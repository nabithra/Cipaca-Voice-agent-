import type { AuditAction } from "@/types";

const AUDIT_KEY = "cipaca-audit-log";
const MAX_ENTRIES = 200;

export interface AuditEntry {
  id: string;
  action: AuditAction;
  actor: string;
  detail: string;
  timestamp: string;
}

export function appendAuditLog(entry: Omit<AuditEntry, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    const list: AuditEntry[] = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    list.unshift({
      ...entry,
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(AUDIT_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

export function getAuditLog(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AUDIT_KEY);
    return raw ? (JSON.parse(raw) as AuditEntry[]) : [];
  } catch {
    return [];
  }
}
