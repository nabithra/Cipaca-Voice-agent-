"use client";

import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface MicrophoneButtonProps {
  isActive?: boolean;
  isListening?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  size?: "default" | "large";
}

export function MicrophoneButton({
  isActive = false,
  isListening = false,
  isSpeaking = false,
  isMuted = false,
  onClick,
  disabled = false,
  size = "large",
}: MicrophoneButtonProps) {
  const sizeClasses = size === "large" ? "h-32 w-32" : "h-20 w-20";
  const iconSize = size === "large" ? "h-12 w-12" : "h-8 w-8";

  return (
    <div className="relative flex items-center justify-center">
      {isActive && (
        <>
          <motion.div
            className={cn(
              "absolute rounded-full",
              sizeClasses,
              isListening
                ? "bg-teal-500/20"
                : isSpeaking
                  ? "bg-blue-500/20"
                  : "bg-teal-500/10"
            )}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className={cn(
              "absolute rounded-full",
              sizeClasses,
              isListening ? "bg-teal-500/15" : "bg-teal-500/10"
            )}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
        </>
      )}

      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full shadow-2xl transition-all",
          sizeClasses,
          isActive
            ? isListening
              ? "bg-gradient-to-br from-teal-400 to-teal-600 animate-pulse-glow"
              : isSpeaking
                ? "bg-gradient-to-br from-blue-400 to-cyan-500"
                : "bg-gradient-to-br from-teal-500 to-cyan-500"
            : "bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 hover:shadow-teal-500/30",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label={isActive ? "Stop voice session" : "Start voice session"}
      >
        {isMuted ? (
          <MicOff className={cn(iconSize, "text-white")} />
        ) : (
          <Mic className={cn(iconSize, "text-white")} />
        )}
      </motion.button>
    </div>
  );
}
