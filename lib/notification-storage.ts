import type { Notification } from "@/types";
import { getStorageAdapter } from "@/lib/storage-adapter";
import { DEFAULT_KNOWLEDGE_BASE } from "@/lib/knowledge-base";
import type { KnowledgeBase } from "@/types";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const KNOWLEDGE_FILE = path.join(DATA_DIR, "knowledge-base.json");

async function readKnowledgeFile(): Promise<KnowledgeBase> {
  try {
    const data = await fs.readFile(KNOWLEDGE_FILE, "utf-8");
    return JSON.parse(data) as KnowledgeBase;
  } catch {
    return DEFAULT_KNOWLEDGE_BASE;
  }
}

async function writeKnowledgeFile(kb: KnowledgeBase): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(KNOWLEDGE_FILE, JSON.stringify(kb, null, 2), "utf-8");
  } catch {
    // read-only on Vercel
  }
}

export async function getAllNotifications(): Promise<Notification[]> {
  return getStorageAdapter().getNotifications();
}

export async function createNotification(
  partial: Omit<Notification, "id" | "createdAt" | "read">
): Promise<Notification> {
  return getStorageAdapter().createNotification(partial);
}

export async function markNotificationRead(id: string): Promise<boolean> {
  return getStorageAdapter().markNotificationRead(id);
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  return readKnowledgeFile();
}

export async function saveKnowledgeBase(kb: KnowledgeBase): Promise<void> {
  await writeKnowledgeFile(kb);
}

export { DATA_DIR };
