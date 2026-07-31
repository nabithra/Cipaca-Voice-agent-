"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AIOrbProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

export function AIOrb({ isActive = false, isSpeaking = false, className }: AIOrbProps) {
  return (
    <div className={cn("relative", className)}>
      <motion.div
        className={cn(
          "h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-500 shadow-lg",
          isSpeaking && "from-blue-400 via-cyan-400 to-teal-400"
        )}
        animate={
          isActive
            ? {
                scale: isSpeaking ? [1, 1.15, 1] : [1, 1.08, 1],
                rotate: [0, 5, -5, 0],
              }
            : { scale: 1 }
        }
        transition={{
          duration: isSpeaking ? 0.8 : 3,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-400/50 to-blue-500/50 blur-xl"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}
