import type { EmergencyStage } from "@/types";

export const EMERGENCY_STAGE_SEQUENCE: EmergencyStage[] = [
  "detected",
  "collecting_details",
  "alerting_gre",
  "alerting_hospital",
  "preparing_admission",
  "connecting_human",
];

/** Fast demo simulation — advances stages without blocking the user */
export async function runEmergencyStageSimulation(
  setStage: (s: EmergencyStage | null) => void,
  options?: { stepMs?: number; onComplete?: () => void }
): Promise<void> {
  const stepMs = options?.stepMs ?? 700;
  for (let i = 0; i < EMERGENCY_STAGE_SEQUENCE.length; i++) {
    setStage(EMERGENCY_STAGE_SEQUENCE[i]);
    if (i < EMERGENCY_STAGE_SEQUENCE.length - 1) {
      await new Promise((r) => setTimeout(r, stepMs));
    }
  }
  await new Promise((r) => setTimeout(r, stepMs));
  options?.onComplete?.();
}
