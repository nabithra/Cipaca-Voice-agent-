"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Phone, ShieldAlert, X } from "lucide-react";
import { EMERGENCY_STAGES } from "@/lib/constants";
import type { EmergencyStage } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmergencyModeProps {
  isVisible: boolean;
  stage: EmergencyStage | null;
  ticketId?: string | null;
  greAssigned?: string | null;
  onDismiss?: () => void;
}

export function EmergencyMode({
  isVisible,
  stage,
  ticketId,
  greAssigned,
  onDismiss,
}: EmergencyModeProps) {
  const currentIndex = EMERGENCY_STAGES.findIndex((s) => s.id === stage);
  const isComplete = stage === "connecting_human";

  // Auto-minimize after all stages complete so user can continue talking
  useEffect(() => {
    if (!isVisible || !isComplete) return;
    const timer = setTimeout(() => onDismiss?.(), 4000);
    return () => clearTimeout(timer);
  }, [isVisible, isComplete, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-[60] pointer-events-auto"
        >
          <div className="rounded-2xl border border-red-500/40 bg-red-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-red-500/20">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 animate-pulse">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-red-50">Emergency Alert</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-500/30 text-red-200">
                      <ShieldAlert className="h-3 w-3" /> PRIORITY HIGH
                    </span>
                    {ticketId && (
                      <span className="text-[10px] font-mono text-red-200 truncate">
                        {ticketId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 text-red-200 hover:text-white hover:bg-red-500/30"
                onClick={onDismiss}
                aria-label="Continue conversation"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-3 space-y-1.5 max-h-[200px] overflow-y-auto">
              {EMERGENCY_STAGES.map((s, i) => {
                const isActive = s.id === stage;
                const isDone = currentIndex > i;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all",
                      isActive && "bg-red-500/25 ring-1 ring-red-400/50",
                      isDone && "opacity-70",
                      !isActive && !isDone && "opacity-40"
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="h-3.5 w-3.5 text-red-200 animate-spin shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border border-red-600 shrink-0" />
                    )}
                    <span className={cn("font-medium", isActive ? "text-white" : "text-red-300")}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {greAssigned && stage === "connecting_human" && (
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-red-100 bg-red-500/15 border-t border-red-500/20">
                <Phone className="h-4 w-4 animate-pulse shrink-0" />
                <span>GRE Executive {greAssigned} notified. You can keep talking below.</span>
              </div>
            )}

            <div className="p-3 border-t border-red-500/20">
              <Button
                size="sm"
                variant="secondary"
                className="w-full bg-red-500/20 text-red-50 hover:bg-red-500/30 border-red-500/30"
                onClick={onDismiss}
              >
                Continue Conversation
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
