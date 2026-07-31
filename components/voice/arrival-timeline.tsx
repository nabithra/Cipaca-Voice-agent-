"use client";

import { motion } from "framer-motion";
import { Ambulance, CheckCircle2, Loader2, Stethoscope, Building2 } from "lucide-react";
import { ARRIVAL_STAGES } from "@/lib/constants";
import type { ArrivalStage } from "@/types";
import { cn } from "@/lib/utils";

interface ArrivalTimelineProps {
  stage: ArrivalStage | null;
  className?: string;
}

const stageIcons = {
  patient_travelling: Ambulance,
  receiving_unit_notified: Building2,
  medical_team_notified: Stethoscope,
  admission_prepared: CheckCircle2,
  ready_for_arrival: CheckCircle2,
};

export function ArrivalTimeline({ stage, className }: ArrivalTimelineProps) {
  if (!stage) return null;

  const currentIndex = ARRIVAL_STAGES.findIndex((s) => s.id === stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4", className)}
    >
      <h3 className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-3 flex items-center gap-2">
        <Ambulance className="h-4 w-4" />
        Hospital Arrival Coordination
      </h3>
      <div className="space-y-2">
        {ARRIVAL_STAGES.map((s, i) => {
          const Icon = stageIcons[s.id as keyof typeof stageIcons] ?? CheckCircle2;
          const isActive = s.id === stage;
          const isDone = currentIndex > i;
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-2 text-xs",
                isActive && "text-teal-600 dark:text-teal-400 font-medium",
                isDone && "text-muted-foreground",
                !isActive && !isDone && "text-muted-foreground/50"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-500" />
              ) : isActive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
              {s.label}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
