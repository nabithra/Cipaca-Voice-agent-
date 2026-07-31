import { promises as fs } from "fs";
import path from "path";
import type { KnowledgeBase, Notification } from "@/types";
import { generateId } from "@/lib/utils";
import { DEFAULT_KNOWLEDGE_BASE } from "@/lib/knowledge-base";

const DATA_DIR = path.join(process.cwd(), "data");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const KNOWLEDGE_FILE = path.join(DATA_DIR, "knowledge-base.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // exists
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  try {
    await ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Vercel serverless has a read-only filesystem; client localStorage is the fallback.
  }
}

export async function getAllNotifications(): Promise<Notification[]> {
  return readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
}

export async function createNotification(
  partial: Omit<Notification, "id" | "createdAt" | "read">
): Promise<Notification> {
  const notifications = await getAllNotifications();
  const notification: Notification = {
    id: generateId(),
    read: false,
    createdAt: new Date().toISOString(),
    ...partial,
  };
  notifications.unshift(notification);
  await writeJsonFile(NOTIFICATIONS_FILE, notifications);
  return notification;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const notifications = await getAllNotifications();
  const index = notifications.findIndex((n) => n.id === id);
  if (index === -1) return false;
  notifications[index].read = true;
  await writeJsonFile(NOTIFICATIONS_FILE, notifications);
  return true;
}

export async function getKnowledgeBase(): Promise<KnowledgeBase> {
  return readJsonFile<KnowledgeBase>(KNOWLEDGE_FILE, DEFAULT_KNOWLEDGE_BASE);
}

export async function saveKnowledgeBase(kb: KnowledgeBase): Promise<void> {
  await writeJsonFile(KNOWLEDGE_FILE, kb);
}

export { readJsonFile, writeJsonFile, ensureDataDir, DATA_DIR };
