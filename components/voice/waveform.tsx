"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
  color?: "primary" | "emergency" | "speaking";
}

export function Waveform({
  isActive = false,
  barCount = 24,
  className,
  color = "primary",
}: WaveformProps) {
  const colorClasses = {
    primary: "bg-gradient-to-t from-teal-500 to-cyan-400",
    emergency: "bg-gradient-to-t from-red-600 to-red-400",
    speaking: "bg-gradient-to-t from-blue-500 to-cyan-400",
  };

  return (
    <div className={cn("flex items-center justify-center gap-1 h-16", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={cn("w-1 rounded-full", colorClasses[color])}
          animate={
            isActive
              ? {
                  height: [
                    `${Math.random() * 20 + 8}px`,
                    `${Math.random() * 48 + 16}px`,
                    `${Math.random() * 20 + 8}px`,
                  ],
                }
              : { height: "8px" }
          }
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}
