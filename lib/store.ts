"use client";

import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";
import type {
  ArrivalStage,
  ConnectionStatus,
  ConversationContext,
  ConversationMessage,
  EmergencyStage,
  Language,
  Lead,
  Notification,
  VoiceMode,
} from "@/types";
import { createInitialContext } from "@/types";
import {
  STORAGE_KEY,
  NOTIFICATIONS_STORAGE_KEY,
  CONVERSATION_STORAGE_KEY,
} from "@/lib/constants";

interface VoiceStore {
  status: ConnectionStatus;
  mode: VoiceMode;
  isMuted: boolean;
  language: Language;
  languageSelected: boolean;
  sessionId: string;
  conversationContext: ConversationContext;
  userTranscript: string;
  aiTranscript: string;
  messages: ConversationMessage[];
  isEmergency: boolean;
  emergencyStage: EmergencyStage | null;
  arrivalStage: ArrivalStage | null;
  emergencyTicketId: string | null;
  escalationId: string | null;
  isEscalating: boolean;
  failedAttempts: number;
  error: string | null;
  callStartTime: number | null;
  greAssigned: string | null;
  hasActiveSession: boolean;
  isDemoMode: boolean;
  setStatus: (status: ConnectionStatus) => void;
  setMode: (mode: VoiceMode) => void;
  setMuted: (muted: boolean) => void;
  setLanguage: (language: Language) => void;
  setLanguageSelected: (selected: boolean) => void;
  setSessionId: (id: string) => void;
  setConversationContext: (ctx: ConversationContext) => void;
  setUserTranscript: (text: string) => void;
  setAiTranscript: (text: string) => void;
  setMessages: (messages: ConversationMessage[]) => void;
  addMessage: (message: ConversationMessage) => void;
  setEmergency: (isEmergency: boolean, ticketId?: string) => void;
  setEmergencyStage: (stage: EmergencyStage | null) => void;
  dismissEmergencyBanner: () => void;
  setArrivalStage: (stage: ArrivalStage | null) => void;
  setEscalating: (escalating: boolean, escalationId?: string) => void;
  setGreAssigned: (gre: string | null) => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  setError: (error: string | null) => void;
  setCallStartTime: (time: number | null) => void;
  setHasActiveSession: (active: boolean) => void;
  setDemoMode: (demo: boolean) => void;
  reset: () => void;
  resetConversation: (language?: Language) => void;
}

const initialVoiceState = {
  status: "disconnected" as ConnectionStatus,
  mode: "realtime" as VoiceMode,
  isMuted: false,
  language: "en" as Language,
  languageSelected: false,
  sessionId: "",
  conversationContext: createInitialContext("en"),
  userTranscript: "",
  aiTranscript: "",
  messages: [] as ConversationMessage[],
  isEmergency: false,
  emergencyStage: null as EmergencyStage | null,
  arrivalStage: null as ArrivalStage | null,
  emergencyTicketId: null as string | null,
  escalationId: null as string | null,
  isEscalating: false,
  failedAttempts: 0,
  error: null as string | null,
  callStartTime: null as number | null,
  greAssigned: null as string | null,
  hasActiveSession: false,
  isDemoMode: true,
};

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      ...initialVoiceState,
      setStatus: (status) => set({ status }),
      setMode: (mode) => set({ mode }),
      setMuted: (isMuted) => set({ isMuted }),
      setLanguage: (language) =>
        set((s) => {
          if (s.language === language) {
            return {
              language,
              conversationContext: { ...s.conversationContext, language },
            };
          }
          return {
            language,
            conversationContext: createInitialContext(language),
            messages: [],
            userTranscript: "",
            aiTranscript: "",
            hasActiveSession: false,
            error: null,
          };
        }),
      setLanguageSelected: (languageSelected) => set({ languageSelected }),
      setSessionId: (sessionId) => set({ sessionId }),
      setConversationContext: (conversationContext) => set({ conversationContext }),
      setUserTranscript: (userTranscript) => set({ userTranscript }),
      setAiTranscript: (aiTranscript) => set({ aiTranscript }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setEmergency: (isEmergency, ticketId) =>
        set({
          isEmergency,
          emergencyTicketId: ticketId ?? null,
          emergencyStage: isEmergency ? "detected" : null,
        }),
      setEmergencyStage: (emergencyStage) => set({ emergencyStage }),
      dismissEmergencyBanner: () =>
        set({ isEmergency: false, emergencyStage: null }),
      setArrivalStage: (arrivalStage) => set({ arrivalStage }),
      setEscalating: (isEscalating, escalationId) =>
        set({ isEscalating, escalationId: escalationId ?? null }),
      setGreAssigned: (greAssigned) => set({ greAssigned }),
      incrementFailedAttempts: () =>
        set((s) => ({ failedAttempts: s.failedAttempts + 1 })),
      resetFailedAttempts: () => set({ failedAttempts: 0 }),
      setError: (error) => set({ error }),
      setCallStartTime: (callStartTime) => set({ callStartTime }),
      setHasActiveSession: (hasActiveSession) => set({ hasActiveSession }),
      setDemoMode: (isDemoMode) => set({ isDemoMode }),
      reset: () =>
        set({
          ...initialVoiceState,
          language: get().language,
          languageSelected: get().languageSelected,
          conversationContext: createInitialContext(get().language),
        }),
      resetConversation: (language) => {
        const lang = language ?? get().language;
        set({
          sessionId: `session-${Date.now()}`,
          messages: [],
          conversationContext: createInitialContext(lang),
          userTranscript: "",
          aiTranscript: "",
          hasActiveSession: false,
          isEmergency: false,
          emergencyStage: null,
          arrivalStage: null,
          emergencyTicketId: null,
          escalationId: null,
          isEscalating: false,
          greAssigned: null,
          error: null,
        });
      },
    }),
    {
      name: CONVERSATION_STORAGE_KEY,
      partialize: (state) => ({
        language: state.language,
        languageSelected: state.languageSelected,
        sessionId: state.sessionId,
        conversationContext: state.conversationContext,
        messages: state.messages,
        hasActiveSession: state.hasActiveSession,
      }),
    }
  )
);

function parseStoredArray<T>(stored: string | null, key?: string): T[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as T[] | Record<string, unknown>;
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && "state" in parsed) {
      const state = (parsed as { state: Record<string, unknown> }).state;
      if (key && Array.isArray(state?.[key])) return state[key] as T[];
    }
    if (key && parsed && typeof parsed === "object" && Array.isArray(parsed[key])) {
      return parsed[key] as T[];
    }
    return [];
  } catch {
    return [];
  }
}

/** Zustand persist + legacy raw-array format written by older save helpers. */
function createLegacyAwareStorage<S extends Record<string, unknown>>(
  listKey: keyof S & string
): PersistStorage<S> {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          return { state: { [listKey]: parsed } as S, version: 0 };
        }
        if (
          parsed &&
          typeof parsed === "object" &&
          "state" in parsed &&
          (parsed as StorageValue<S>).state
        ) {
          return parsed as StorageValue<S>;
        }
        if (
          parsed &&
          typeof parsed === "object" &&
          listKey in parsed &&
          Array.isArray((parsed as Record<string, unknown>)[listKey])
        ) {
          return { state: parsed as S, version: 0 };
        }
      } catch {
        return null;
      }
      return null;
    },
    setItem: (name, value) => {
      localStorage.setItem(name, JSON.stringify(value));
    },
    removeItem: (name) => {
      localStorage.removeItem(name);
    },
  };
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const merged = [...local];
  for (const item of remote) {
    if (!merged.find((m) => m.id === item.id)) merged.push(item);
  }
  return merged;
}

export function mergeLeads(local: Lead[], remote: Lead[]): Lead[] {
  return mergeById(local, remote).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function mergeNotifications(
  local: Notification[],
  remote: Notification[]
): Notification[] {
  return mergeById(local, remote).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

interface LeadStore {
  leads: Lead[];
  setLeads: (leads: Lead[]) => void;
  addLead: (lead: Lead) => void;
  hydrate: () => void;
}

export const useLeadStore = create<LeadStore>()(
  persist(
    (set) => ({
      leads: [],
      setLeads: (leads) => set({ leads: Array.isArray(leads) ? leads : [] }),
      addLead: (lead) =>
        set((state) => ({
          leads: [
            lead,
            ...(Array.isArray(state.leads) ? state.leads : []).filter((l) => l.id !== lead.id),
          ],
        })),
      hydrate: () => {
        if (typeof window === "undefined") return;
        const leads = parseStoredArray<Lead>(localStorage.getItem(STORAGE_KEY), "leads");
        if (leads.length) set({ leads });
      },
    }),
    { name: STORAGE_KEY, partialize: (state) => ({ leads: state.leads }), storage: createLegacyAwareStorage<{ leads: Lead[] }>("leads") }
  )
);

interface NotificationStore {
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  addNotification: (n: Notification) => void;
  hydrate: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      notifications: [],
      setNotifications: (notifications) =>
        set({ notifications: Array.isArray(notifications) ? notifications : [] }),
      addNotification: (n) =>
        set((s) => ({
          notifications: [
            n,
            ...(Array.isArray(s.notifications) ? s.notifications : []).filter((x) => x.id !== n.id),
          ],
        })),
      hydrate: () => {
        if (typeof window === "undefined") return;
        const list = parseStoredArray<Notification>(
          localStorage.getItem(NOTIFICATIONS_STORAGE_KEY),
          "notifications"
        );
        set({ notifications: list });
      },
    }),
    {
      name: NOTIFICATIONS_STORAGE_KEY,
      partialize: (state) => ({ notifications: state.notifications }),
      storage: createLegacyAwareStorage<{ notifications: Notification[] }>("notifications"),
    }
  )
);

export function ensureNotificationArray(
  notifications: Notification[] | unknown
): Notification[] {
  return Array.isArray(notifications) ? notifications : [];
}
