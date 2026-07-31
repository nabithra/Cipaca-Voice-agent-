import type { Lead, Notification } from "@/types";
import { generateId } from "@/lib/utils";
import type { StorageAdapter } from "@/lib/storage-adapter/types";

/** Postgres adapter using @vercel/postgres when POSTGRES_URL is configured. */
export class PostgresStorageAdapter implements StorageAdapter {
  private tablesReady = false;

  private async getSql() {
    const { sql } = await import("@vercel/postgres");
    return sql;
  }

  private async ensureTables(): Promise<void> {
    if (this.tablesReady) return;
    const sql = await this.getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS cipaca_leads (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS cipaca_notifications (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    this.tablesReady = true;
  }

  async isWritable(): Promise<boolean> {
    try {
      await this.ensureTables();
      const sql = await this.getSql();
      await sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  async getLeads(): Promise<Lead[]> {
    await this.ensureTables();
    const sql = await this.getSql();
    const { rows } = await sql`SELECT data FROM cipaca_leads ORDER BY updated_at DESC`;
    return rows.map((r) => r.data as Lead);
  }

  async createLead(
    partial: Omit<Lead, "id" | "createdAt" | "updatedAt" | "status"> & {
      id?: string;
      status?: Lead["status"];
    }
  ): Promise<Lead> {
    await this.ensureTables();
    const sql = await this.getSql();
    const now = new Date().toISOString();
    const lead: Lead = {
      ...partial,
      id: partial.id ?? generateId(),
      status: partial.status ?? "new",
      createdAt: now,
      updatedAt: now,
    };
    await sql`
      INSERT INTO cipaca_leads (id, data, created_at, updated_at)
      VALUES (${lead.id}, ${JSON.stringify(lead)}::jsonb, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = EXCLUDED.updated_at
    `;
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
    const leads = await this.getLeads();
    const existing = leads.find((l) => l.id === id);
    if (!existing) return null;
    return this.createLead({ ...existing, ...updates, id });
  }

  async getNotifications(): Promise<Notification[]> {
    await this.ensureTables();
    const sql = await this.getSql();
    const { rows } = await sql`SELECT data FROM cipaca_notifications ORDER BY created_at DESC`;
    return rows.map((r) => r.data as Notification);
  }

  async createNotification(
    partial: Omit<Notification, "id" | "createdAt" | "read"> & { id?: string }
  ): Promise<Notification> {
    await this.ensureTables();
    const sql = await this.getSql();
    const notification: Notification = {
      id: partial.id ?? generateId(),
      read: false,
      createdAt: new Date().toISOString(),
      ...partial,
    };
    await sql`
      INSERT INTO cipaca_notifications (id, data, created_at)
      VALUES (${notification.id}, ${JSON.stringify(notification)}::jsonb, ${notification.createdAt})
      ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data
    `;
    return notification;
  }

  async markNotificationRead(id: string): Promise<boolean> {
    const list = await this.getNotifications();
    const index = list.findIndex((n) => n.id === id);
    if (index === -1) return false;
    list[index] = { ...list[index], read: true };
    await this.createNotification({ ...list[index] });
    return true;
  }
}

export const postgresStorageAdapter = new PostgresStorageAdapter();

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}
