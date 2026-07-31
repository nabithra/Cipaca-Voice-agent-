import { promises as fs } from "fs";
import path from "path";
import type { Lead, Notification } from "@/types";
import { generateId } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type { StorageAdapter } from "@/lib/storage-adapter/types";

const DATA_DIR = path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");

async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // exists
  }
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, data: T): Promise<boolean> {
  try {
    await ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (err) {
    logger.warn("JSON storage write failed", { error: String(err) });
    return false;
  }
}

export class JsonStorageAdapter implements StorageAdapter {
  async isWritable(): Promise<boolean> {
    const probe = path.join(DATA_DIR, ".write-probe");
    try {
      await ensureDataDir();
      await fs.writeFile(probe, "ok", "utf-8");
      await fs.unlink(probe);
      return true;
    } catch {
      return false;
    }
  }

  async getLeads(): Promise<Lead[]> {
    return readJson<Lead[]>(LEADS_FILE, []);
  }

  async createLead(
    partial: Omit<Lead, "id" | "createdAt" | "updatedAt" | "status"> & {
      id?: string;
      status?: Lead["status"];
    }
  ): Promise<Lead> {
    const leads = await this.getLeads();
    const now = new Date().toISOString();
    const lead: Lead = {
      ...partial,
      id: partial.id ?? generateId(),
      status: partial.status ?? "new",
      createdAt: now,
      updatedAt: now,
    };
    const idx = leads.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      leads[idx] = { ...leads[idx], ...lead, updatedAt: now };
    } else {
      leads.unshift(lead);
    }
    await writeJson(LEADS_FILE, leads);
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const leads = await this.getLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
    await writeJson(LEADS_FILE, leads);
    return leads[idx];
  }

  async getNotifications(): Promise<Notification[]> {
    return readJson<Notification[]>(NOTIFICATIONS_FILE, []);
  }

  async createNotification(
    partial: Omit<Notification, "id" | "createdAt" | "read"> & { id?: string }
  ): Promise<Notification> {
    const list = await this.getNotifications();
    const notification: Notification = {
      id: partial.id ?? generateId(),
      read: false,
      createdAt: new Date().toISOString(),
      ...partial,
    };
    const existing = list.findIndex((n) => n.id === notification.id);
    if (existing >= 0) {
      list[existing] = { ...list[existing], ...notification };
    } else {
      list.unshift(notification);
    }
    await writeJson(NOTIFICATIONS_FILE, list);
    return notification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const list = await this.getNotifications();
    const index = list.findIndex((n) => n.id === id);
    if (index === -1) return false;
    list[index] = { ...list[index], read: true };
    await writeJson(NOTIFICATIONS_FILE, list);
    return true;
  }
}

export const jsonStorageAdapter = new JsonStorageAdapter();
