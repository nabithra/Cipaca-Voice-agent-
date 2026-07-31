"use server";

import { revalidatePath } from "next/cache";
import { updateLead } from "@/lib/storage";
import {
  notifyMedicalTeam,
  notifyReceivingUnit,
  prepareAdmission,
  updateArrivalStatus,
} from "@/server/actions/notifications";
import type { ArrivalInput } from "@/types";

export async function coordinateArrival(input: ArrivalInput): Promise<{
  success: boolean;
  stages: string[];
  error?: string;
}> {
  try {
    const stages: string[] = ["patient_travelling"];

    await notifyReceivingUnit({
      patientName: input.patientName,
      hospitalUnit: input.hospitalUnit,
      leadId: input.leadId,
    });
    stages.push("receiving_unit_notified");

    await notifyMedicalTeam({
      patientName: input.patientName,
      hospitalUnit: input.hospitalUnit,
      leadId: input.leadId,
    });
    stages.push("medical_team_notified");

    await prepareAdmission({
      patientName: input.patientName,
      hospitalUnit: input.hospitalUnit,
      leadId: input.leadId,
    });
    stages.push("admission_prepared");

    await updateArrivalStatus({
      patientName: input.patientName,
      hospitalUnit: input.hospitalUnit,
      status: "Ready for Arrival",
      leadId: input.leadId,
    });
    stages.push("ready_for_arrival");

    if (input.leadId) {
      await updateLead(input.leadId, {
        patientName: input.patientName,
        hospitalUnit: input.hospitalUnit,
        transportType: input.transportType,
        attenderName: input.attenderName,
        eta: input.estimatedArrival,
        isTravelling: true,
        arrivalStage: "ready_for_arrival",
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/voice");
    return { success: true, stages };
  } catch (error) {
    return {
      success: false,
      stages: [],
      error: error instanceof Error ? error.message : "Arrival coordination failed",
    };
  }
}
