"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types";
import { formatDate } from "@/lib/utils";
import { AIOrb } from "@/components/voice/ai-orb";
import { TypingIndicator } from "@/components/voice/typing-indicator";

interface ConversationBubbleProps {
  messages: ConversationMessage[];
  isProcessing?: boolean;
  className?: string;
}

export function ConversationBubbles({
  messages,
  isProcessing = false,
  className,
}: ConversationBubbleProps) {
  return (
    <div className={cn("flex flex-col gap-3 overflow-y-auto", className)}>
      {messages.map((msg, i) => (
        <motion.div
          key={`${msg.timestamp}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            "flex gap-3",
            msg.role === "user" ? "flex-row-reverse" : "flex-row"
          )}
        >
          {msg.role === "assistant" && (
            <AIOrb isActive className="shrink-0 mt-1" />
          )}
          <div
            className={cn(
              "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "glass-card rounded-bl-md"
            )}
          >
            <p>{msg.content}</p>
            <p
              className={cn(
                "mt-1 text-xs opacity-60",
                msg.role === "user"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {formatDate(msg.timestamp)}
            </p>
          </div>
        </motion.div>
      ))}
      {isProcessing && (
        <div className="flex gap-3">
          <AIOrb isActive isSpeaking />
          <div className="glass-card rounded-2xl rounded-bl-md">
            <TypingIndicator />
          </div>
        </div>
      )}
    </div>
  );
}
