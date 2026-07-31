"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Phone, ShieldAlert } from "lucide-react";
import { EMERGENCY_STAGES } from "@/lib/constants";
import type { EmergencyStage } from "@/types";
import { cn } from "@/lib/utils";

interface EmergencyModeProps {
  isVisible: boolean;
  stage: EmergencyStage | null;
  ticketId?: string | null;
  greAssigned?: string | null;
}

export function EmergencyMode({
  isVisible,
  stage,
  ticketId,
  greAssigned,
}: EmergencyModeProps) {
  if (!isVisible) return null;

  const currentIndex = EMERGENCY_STAGES.findIndex((s) => s.id === stage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-red-950/95 backdrop-blur-xl flex items-center justify-center p-4"
    >
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500 mb-4"
          >
            <AlertTriangle className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-red-100">Emergency Mode</h1>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-red-500/30 text-red-200 text-sm font-medium">
            <ShieldAlert className="h-4 w-4" />
            PRIORITY — Highest
          </div>
          {ticketId && (
            <p className="mt-4 text-red-200">
              Ticket: <span className="font-mono font-bold text-white">{ticketId}</span>
            </p>
          )}
        </div>

        <div className="space-y-3">
          {EMERGENCY_STAGES.map((s, i) => {
            const isActive = s.id === stage;
            const isDone = currentIndex > i;
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 transition-all",
                  isActive && "bg-red-500/30 ring-2 ring-red-400",
                  isDone && "bg-red-900/50 opacity-80",
                  !isActive && !isDone && "bg-red-950/50 opacity-50"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-5 w-5 text-red-200 animate-spin shrink-0" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-red-700 shrink-0" />
                )}
                <span className={cn("text-sm font-medium", isActive ? "text-white" : "text-red-300")}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {greAssigned && stage === "connecting_human" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-red-100 bg-red-500/20 rounded-xl py-4"
          >
            <Phone className="h-5 w-5 animate-pulse" />
            <span className="font-medium">Connecting to GRE Executive ({greAssigned})...</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
