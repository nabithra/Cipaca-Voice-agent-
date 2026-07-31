import type { Lead, Notification } from "@/types";

export interface StorageAdapter {
  getLeads(): Promise<Lead[]>;
  createLead(
    lead: Omit<Lead, "id" | "createdAt" | "updatedAt" | "status"> & {
      id?: string;
      status?: Lead["status"];
    }
  ): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null>;
  getNotifications(): Promise<Notification[]>;
  createNotification(n: Omit<Notification, "id" | "createdAt" | "read"> & { id?: string }): Promise<Notification>;
  markNotificationRead(id: string): Promise<boolean>;
  isWritable(): Promise<boolean>;
}
