"use client";

import { useEffect, useState } from "react";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";
import { voiceDebug, type PipelineState, type PipelineStatus } from "@/lib/voice-client";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<keyof Omit<PipelineState, "lastError" | "lastLog" | "openaiConfigured" | "apiSource">, string> = {
  microphone: "Microphone",
  speechRecognition: "Speech Recognition",
  transcript: "Transcript",
  openaiRequest: "OpenAI Request",
  openaiResponse: "OpenAI Response",
  tts: "TTS",
  speaker: "Speaker",
};

function StatusDot({ status }: { status: PipelineStatus }) {
  const colors: Record<PipelineStatus, string> = {
    idle: "bg-gray-400",
    loading: "bg-yellow-400 animate-pulse",
    working: "bg-green-500",
    failed: "bg-red-500",
    fallback: "bg-orange-400",
  };
  const labels: Record<PipelineStatus, string> = {
    idle: "Idle",
    loading: "Loading",
    working: "Working",
    failed: "Failed",
    fallback: "Fallback",
  };
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2.5 w-2.5 rounded-full", colors[status])} />
      <span className="text-xs text-muted-foreground">{labels[status]}</span>
    </div>
  );
}

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PipelineState>(voiceDebug.getState());

  useEffect(() => {
    return voiceDebug.subscribe(setState);
  }, []);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl bg-black/80 text-white px-3 py-2 text-xs font-medium backdrop-blur-sm hover:bg-black/90 transition-colors ml-auto"
      >
        <Bug className="h-3.5 w-3.5" />
        Voice Debug
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-black/90 text-white p-3 text-xs backdrop-blur-sm space-y-2 shadow-xl">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-semibold">Pipeline Status</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
              state.openaiConfigured ? "bg-green-500/20 text-green-300" : "bg-orange-500/20 text-orange-300"
            )}>
              OpenAI: {state.openaiConfigured ? "Yes" : "No — local mode"}
            </span>
          </div>

          {(Object.keys(STAGE_LABELS) as Array<keyof typeof STAGE_LABELS>).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span>{STAGE_LABELS[key]}</span>
              <StatusDot status={state[key]} />
            </div>
          ))}

          {state.apiSource !== "none" && (
            <p className="text-[10px] text-white/60">Source: {state.apiSource}</p>
          )}
          {state.lastLog && (
            <p className="text-[10px] text-green-300/80 truncate">→ {state.lastLog}</p>
          )}
          {state.lastError && (
            <p className="text-[10px] text-red-300 break-words">✗ {state.lastError}</p>
          )}
        </div>
      )}
    </div>
  );
}
