"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmergencyBannerProps {
  isVisible: boolean;
  ticketId?: string | null;
  isEscalating?: boolean;
  onDismiss?: () => void;
}

export function EmergencyBanner({
  isVisible,
  ticketId,
  isEscalating = false,
  onDismiss,
}: EmergencyBannerProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-0 right-0 z-50 mx-4"
        >
          <div className="mx-auto max-w-2xl rounded-2xl border-2 border-red-500 bg-red-950/90 backdrop-blur-xl p-4 shadow-2xl shadow-red-500/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 animate-pulse">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-100 text-lg">
                  Emergency Detected
                </h3>
                {ticketId && (
                  <p className="text-red-200 text-sm mt-1">
                    Ticket: <span className="font-mono font-bold">{ticketId}</span>
                  </p>
                )}
                {isEscalating && (
                  <div className="flex items-center gap-2 mt-2 text-red-200">
                    <Phone className="h-4 w-4 animate-pulse" />
                    <span className="text-sm font-medium">
                      Connecting to Human Executive...
                    </span>
                  </div>
                )}
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDismiss}
                  className="text-red-200 hover:text-white hover:bg-red-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
