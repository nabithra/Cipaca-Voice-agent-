"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Headphones, Phone } from "lucide-react";

interface EscalationOverlayProps {
  isVisible: boolean;
  escalationId?: string | null;
  greAssigned?: string | null;
}

export function EscalationOverlay({
  isVisible,
  escalationId,
  greAssigned,
}: EscalationOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 mx-4"
        >
          <div className="rounded-2xl border border-blue-500/50 bg-blue-950/90 backdrop-blur-xl px-6 py-4 shadow-2xl shadow-blue-500/20 min-w-[280px]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 animate-pulse">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-100">Connecting to GRE Executive...</p>
                {greAssigned && (
                  <p className="text-sm text-blue-200">Assigned: {greAssigned}</p>
                )}
                {escalationId && (
                  <p className="text-xs text-blue-300 font-mono mt-1">ID: {escalationId}</p>
                )}
              </div>
              <Phone className="h-5 w-5 text-blue-300 animate-pulse ml-auto" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
