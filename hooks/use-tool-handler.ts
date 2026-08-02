"use client";

import { useCallback } from "react";
import {
  saveAppointment,
  saveEmergency,
  saveLead,
  escalateToHuman,
} from "@/server/actions/leads";
import { coordinateArrival } from "@/server/actions/arrival";
import { searchKnowledge } from "@/server/actions/knowledge";
import { routeCall } from "@/server/actions/gre";
import { runEmergencyStageSimulation } from "@/lib/emergency-flow";
import {
  saveLeadToLocalStorage,
  useLeadStore,
  useVoiceStore,
} from "@/lib/store";
import type {
  ConversationMessage,
  EscalationReason,
  Language,
  Lead,
} from "@/types";

function playEmergencyTone(): void {
  try {
    const ctx = new AudioContext();
    [0, 600].forEach((delay) => {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }, delay);
    });
  } catch {
    // audio unavailable
  }
}

async function advanceEmergencyStages(
  setEmergencyStage: (s: import("@/types").EmergencyStage | null) => void,
  setEscalating: (e: boolean, id?: string) => void,
  setGreAssigned: (g: string | null) => void,
  dismissEmergencyBanner: () => void
) {
  await runEmergencyStageSimulation(setEmergencyStage, {
    stepMs: 600,
    onComplete: async () => {
      const route = await routeCall("emergency");
      setGreAssigned(route.assignedTo);
      setEscalating(true);
      setTimeout(() => dismissEmergencyBanner(), 2500);
    },
  });
}

export function useToolHandler() {
  const { addLead } = useLeadStore();
  const {
    messages,
    language,
    setEmergency,
    setEmergencyStage,
    setArrivalStage,
    setEscalating,
    setGreAssigned,
    dismissEmergencyBanner,
  } = useVoiceStore();

  const getConversation = useCallback(
    (): ConversationMessage[] => messages,
    [messages]
  );

  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      const conversation = getConversation();
      const lang = (args.language as Language) ?? language;

      switch (name) {
        case "search_knowledge": {
          const result = await searchKnowledge(args.query as string);
          return JSON.stringify({ result });
        }
        case "save_lead": {
          const result = await saveLead({
            name: args.name as string,
            phone: args.phone as string,
            category: args.category as Lead["category"],
            inquiryType: args.inquiryType as Lead["inquiryType"],
            department: args.department as string | undefined,
            requestedService: args.requestedService as string | undefined,
            conversationSummary: args.conversationSummary as string | undefined,
            language: lang,
            conversation,
          });
          if (result.success && result.lead) {
            addLead(result.lead);
            saveLeadToLocalStorage(result.lead);
          }
          return JSON.stringify(result);
        }
        case "save_emergency": {
          setEmergencyStage("collecting_details");
          const result = await saveEmergency({
            name: args.name as string,
            phone: args.phone as string,
            location: args.location as string,
            emergencyType: args.emergencyType as string,
            isTravelling: args.isTravelling as boolean,
            eta: args.eta as string | undefined,
            patientName: args.patientName as string | undefined,
            hospitalUnit: args.hospitalUnit as string | undefined,
            transportType: args.transportType as string | undefined,
            attenderName: args.attenderName as string | undefined,
            conversationSummary: args.conversationSummary as string | undefined,
            language: lang,
            conversation,
          });
          if (result.success && result.lead) {
            addLead(result.lead);
            saveLeadToLocalStorage(result.lead);
            setEmergency(true, result.ticketId);
            playEmergencyTone();
            advanceEmergencyStages(
              setEmergencyStage,
              setEscalating,
              setGreAssigned,
              dismissEmergencyBanner
            );

            if (args.isTravelling) {
              setArrivalStage("patient_travelling");
              await coordinateArrival({
                leadId: result.lead.id,
                patientName: (args.patientName as string) ?? (args.name as string),
                hospitalUnit: (args.hospitalUnit as string) ?? "Thiruvannamalai Unit",
                estimatedArrival: (args.eta as string) ?? "Unknown",
                transportType: (args.transportType as string) ?? "Private vehicle",
                attenderName: (args.attenderName as string) ?? (args.name as string),
                phone: args.phone as string,
                language: lang,
              });
              const stages = [
                "receiving_unit_notified",
                "medical_team_notified",
                "admission_prepared",
                "ready_for_arrival",
              ] as const;
              for (const stage of stages) {
                await new Promise((r) => setTimeout(r, 1200));
                setArrivalStage(stage);
              }
            }
          }
          return JSON.stringify(result);
        }
        case "save_appointment": {
          const result = await saveAppointment({
            name: args.name as string,
            phone: args.phone as string,
            doctor: args.doctor as string | undefined,
            department: args.department as string,
            preferredDate: args.preferredDate as string,
            preferredTime: args.preferredTime as string,
            inquiryType: args.inquiryType as Lead["inquiryType"],
            serviceType: args.serviceType as string | undefined,
            reason: args.reason as string | undefined,
            requestedService: args.requestedService as string | undefined,
            callbackRequested: args.callbackRequested as boolean | undefined,
            conversationSummary: args.conversationSummary as string | undefined,
            language: lang,
            conversation,
          });
          if (result.success && result.lead) {
            addLead(result.lead);
            saveLeadToLocalStorage(result.lead);
          }
          return JSON.stringify(result);
        }
        case "coordinate_arrival": {
          setArrivalStage("patient_travelling");
          const result = await coordinateArrival({
            patientName: args.patientName as string,
            hospitalUnit: args.hospitalUnit as string,
            estimatedArrival: args.estimatedArrival as string,
            transportType: args.transportType as string,
            attenderName: args.attenderName as string,
            phone: args.phone as string | undefined,
            language: lang,
          });
          if (result.success) {
            const stages = [
              "receiving_unit_notified",
              "medical_team_notified",
              "admission_prepared",
              "ready_for_arrival",
            ] as const;
            for (const stage of stages) {
              await new Promise((r) => setTimeout(r, 1000));
              setArrivalStage(stage);
            }
          }
          return JSON.stringify(result);
        }
        case "escalate_to_human": {
          const route = await routeCall(
            args.escalationReason === "emergency_detected" ? "emergency" : "support"
          );
          const result = await escalateToHuman({
            name: args.name as string | undefined,
            phone: args.phone as string | undefined,
            reason: args.reason as string,
            escalationReason: args.escalationReason as EscalationReason,
            conversationSummary: args.conversationSummary as string | undefined,
            language: lang,
            conversation,
          });
          if (result.success && result.lead) {
            addLead(result.lead);
            saveLeadToLocalStorage(result.lead);
            setEscalating(true, result.escalationId);
            setGreAssigned(route.assignedTo);
          }
          return JSON.stringify({ ...result, routedTo: route.assignedTo });
        }
        default:
          return JSON.stringify({ error: "Unknown tool" });
      }
    },
    [
      addLead,
      getConversation,
      language,
      setArrivalStage,
      setEmergency,
      setEmergencyStage,
      setEscalating,
      setGreAssigned,
    ]
  );

  return { handleToolCall };
}
