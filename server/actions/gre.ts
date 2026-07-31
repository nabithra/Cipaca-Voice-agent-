"use server";

import { GRE_EMERGENCY_LINE, GRE_SUPPORT_LINE, GRE_TEAM } from "@/lib/knowledge-base";
import type { GREMember, GREStatus } from "@/types";

export async function getGRETeam(): Promise<GREMember[]> {
  return GRE_TEAM;
}

export async function getGRELines(): Promise<{
  emergency: string;
  support: string;
}> {
  return {
    emergency: GRE_EMERGENCY_LINE,
    support: GRE_SUPPORT_LINE,
  };
}

export async function routeCall(type: "emergency" | "support"): Promise<{
  assignedTo: string;
  line: string;
  simulated: boolean;
}> {
  const available = GRE_TEAM.filter(
    (g) => g.status === "available" && (type === "emergency" ? g.line === "emergency" : true)
  );
  const member = available[0] ?? GRE_TEAM.find((g) => g.line === (type === "emergency" ? "emergency" : "support")) ?? GRE_TEAM[0];

  return {
    assignedTo: member.name,
    line: type === "emergency" ? GRE_EMERGENCY_LINE : GRE_SUPPORT_LINE,
    simulated: true,
  };
}

export async function updateGREStatus(
  id: string,
  status: GREStatus
): Promise<{ success: boolean }> {
  const member = GRE_TEAM.find((g) => g.id === id);
  if (member) {
    member.status = status;
  }
  return { success: true };
}
