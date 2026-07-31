import type { ConversationContext, EmergencyStage } from "@/types";

/** Map collected emergency fields to UI progress stage (one stage per answer). */
export function emergencyStageFromContext(ctx: ConversationContext): EmergencyStage {
  if (ctx.currentWorkflow !== "emergency") {
    return "detected";
  }
  if (ctx.workflowStatus === "completed") {
    return "connecting_human";
  }
  if (ctx.isTravelling !== undefined) {
    return "connecting_human";
  }
  if (ctx.emergencyType) {
    return "preparing_admission";
  }
  if (ctx.location) {
    return "alerting_hospital";
  }
  if (ctx.phone) {
    return "alerting_gre";
  }
  if (ctx.name) {
    return "collecting_details";
  }
  return "detected";
}

export function playEmergencyTone(): void {
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

export function buildEmergencyHandoffReply(
  ticketId: string,
  isDemoMode: boolean,
  language: "en" | "ta" = "en"
): string {
  const en = `Emergency ticket ${ticketId} has been created. Our emergency team has been notified. Please stay on the line while we connect you to a GRE executive.${
    isDemoMode
      ? " Demo Mode: Human transfer is simulated. GRE Executive would receive this emergency call."
      : ""
  }`;
  const ta = `Emergency ticket ${ticketId} உருவாக்கப்பட்டது. Emergency team-க்கு தெரிவிக்கப்பட்டது. GRE executive-ஐ connect செய்கிறோம்.${
    isDemoMode ? " Demo Mode: Human transfer simulated." : ""
  }`;
  return language === "ta" ? ta : en;
}
