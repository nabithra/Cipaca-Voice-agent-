"use client";

import { cn } from "@/lib/utils";
import type { ConnectionStatus, VoiceMode } from "@/types";
import {
  Wifi,
  WifiOff,
  Loader2,
  Mic,
  Volume2,
  AlertCircle,
} from "lucide-react";

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
  mode?: VoiceMode;
  demoMode?: boolean;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  { label: string; color: string; icon: React.ElementType }
> = {
  disconnected: {
    label: "Disconnected",
    color: "bg-muted text-muted-foreground",
    icon: WifiOff,
  },
  connecting: {
    label: "Connecting...",
    color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    icon: Loader2,
  },
  connected: {
    label: "Connected",
    color: "bg-green-500/10 text-green-600 dark:text-green-400",
    icon: Wifi,
  },
  listening: {
    label: "Listening",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    icon: Mic,
  },
  speaking: {
    label: "Speaking",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    icon: Volume2,
  },
  processing: {
    label: "Processing",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    icon: Loader2,
  },
  error: {
    label: "Error",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    icon: AlertCircle,
  },
};

export function ConnectionStatusBadge({
  status,
  mode,
  demoMode,
  className,
}: ConnectionStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const isSpinning = status === "connecting" || status === "processing";

  return (
    <div className={cn("flex items-center gap-2 flex-wrap justify-center", className)}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium",
          config.color
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", isSpinning && "animate-spin")} />
        {config.label}
      </div>
      {demoMode && (
        <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1.5 text-xs font-medium">
          Demo Mode
        </span>
      )}
      {mode && status !== "disconnected" && !demoMode && (
        <span className="text-xs text-muted-foreground capitalize">
          ({mode})
        </span>
      )}
    </div>
  );
}
