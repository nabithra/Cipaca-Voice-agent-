import { promises as fs } from "fs";
import path from "path";
import type { Lead } from "@/types";
import { generateId } from "@/lib/utils";

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // directory may already exist
  }
}

async function readLeadsFile(): Promise<Lead[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(LEADS_FILE, "utf-8");
    return JSON.parse(data) as Lead[];
  } catch {
    return [];
  }
}

async function writeLeadsFile(leads: Lead[]): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
  } catch {
    // Vercel serverless has a read-only filesystem; client localStorage is the fallback.
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  return readLeadsFile();
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const leads = await readLeadsFile();
  return leads.find((l) => l.id === id) ?? null;
}

export async function createLead(
  partial: Omit<Lead, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: Lead["status"];
  }
): Promise<Lead> {
  const leads = await readLeadsFile();
  const now = new Date().toISOString();
  const lead: Lead = {
    id: generateId(),
    status: partial.status ?? "new",
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
  leads.unshift(lead);
  await writeLeadsFile(leads);
  return lead;
}

export async function updateLead(
  id: string,
  updates: Partial<Lead>
): Promise<Lead | null> {
  const leads = await readLeadsFile();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) return null;

  leads[index] = {
    ...leads[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await writeLeadsFile(leads);
  return leads[index];
}

export async function deleteLead(id: string): Promise<boolean> {
  const leads = await readLeadsFile();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length === leads.length) return false;
  await writeLeadsFile(filtered);
  return true;
}

export function generateReferenceId(prefix: string): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${num}`;
}

export function generateTicketId(): string {
  return generateReferenceId("EMG");
}
