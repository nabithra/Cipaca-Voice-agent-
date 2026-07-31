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
  isDemoMode?: boolean;
  isComplete?: boolean;
  handoffMessage?: string | null;
}

export function EmergencyMode({
  isVisible,
  stage,
  ticketId,
  greAssigned,
  isDemoMode,
  isComplete,
  handoffMessage,
}: EmergencyModeProps) {
  if (!isVisible) return null;

  const currentIndex = EMERGENCY_STAGES.findIndex((s) => s.id === stage);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed inset-y-0 right-0 z-50 w-full max-w-sm pointer-events-none p-3 sm:p-4"
    >
      <div className="pointer-events-auto h-full overflow-y-auto rounded-2xl bg-red-950/95 backdrop-blur-xl border border-red-500/40 shadow-2xl p-5 space-y-5">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-red-500 mb-3"
          >
            <AlertTriangle className="h-7 w-7 text-white" />
          </motion.div>
          <h2 className="text-xl font-bold text-red-100">Emergency Mode</h2>
          <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-red-500/30 text-red-200 text-xs font-medium">
            <ShieldAlert className="h-3.5 w-3.5" />
            PRIORITY — Highest
          </div>
          {ticketId && (
            <p className="mt-3 text-red-200 text-sm">
              Ticket: <span className="font-mono font-bold text-white">{ticketId}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          {EMERGENCY_STAGES.map((s, i) => {
            const isActive = s.id === stage;
            const isDone = currentIndex > i || (isComplete && i <= currentIndex);
            return (
              <div
                key={s.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
                  isActive && "bg-red-500/30 ring-2 ring-red-400",
                  isDone && !isActive && "bg-red-900/50 opacity-90",
                  !isActive && !isDone && "bg-red-950/50 opacity-50"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 text-red-200 animate-spin shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-red-700 shrink-0" />
                )}
                <span
                  className={cn(
                    "text-xs font-medium",
                    isActive || isDone ? "text-white" : "text-red-300"
                  )}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {isComplete && handoffMessage && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-500/20 p-4 text-sm text-red-100 leading-relaxed"
          >
            {handoffMessage}
          </motion.div>
        )}

        {isDemoMode && isComplete && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Demo Mode: Human transfer is simulated. GRE Executive would receive this emergency
            call.
          </div>
        )}

        {(greAssigned || isComplete) && stage === "connecting_human" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 text-red-100 bg-red-500/20 rounded-xl py-3 text-sm"
          >
            <Phone className="h-4 w-4 animate-pulse shrink-0" />
            <span className="font-medium">
              {greAssigned
                ? `Connecting to GRE Executive (${greAssigned})...`
                : "Connecting to GRE Executive..."}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
