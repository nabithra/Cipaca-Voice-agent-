"use client";

import { useEffect, useState } from "react";
import { Bug, ChevronDown, ChevronUp } from "lucide-react";
import { voiceDebug, type PipelineState, type PipelineStatus } from "@/lib/voice-client";
import { contextToLeadJson, getWorkflowDebugInfo } from "@/lib/conversation-engine";
import { useNotificationStore, useVoiceStore } from "@/lib/store";
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
  const { conversationContext, greAssigned, isEscalating } = useVoiceStore();
  const { notifications } = useNotificationStore();
  const workflow = getWorkflowDebugInfo(conversationContext);
  const leadJson = contextToLeadJson(conversationContext);

  useEffect(() => {
    return voiceDebug.subscribe(setState);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl bg-black/80 text-white px-3 py-2 text-xs font-medium backdrop-blur-sm hover:bg-black/90 transition-colors ml-auto"
      >
        <Bug className="h-3.5 w-3.5" />
        Debug Panel
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-black/90 text-white p-3 text-xs backdrop-blur-sm space-y-2 shadow-xl max-h-[70vh] overflow-y-auto">
          <div className="border-b border-white/10 pb-2 space-y-1">
            <p className="font-semibold">Conversation State</p>
            <p><span className="text-white/60">Intent:</span> {conversationContext.intent ?? "none"}</p>
            <p><span className="text-white/60">Category:</span> {workflow.callCategory ?? "unclassified"}</p>
            <p><span className="text-white/60">Workflow:</span> {workflow.workflow ?? "none"}</p>
            <p><span className="text-white/60">Status:</span> {workflow.workflowStatus}</p>
            <p><span className="text-white/60">Step:</span> {workflow.currentStep}</p>
            <p><span className="text-white/60">Next Step:</span> {workflow.nextStep ?? "—"}</p>
            <p><span className="text-white/60">Session:</span> {workflow.sessionState}</p>
            <p><span className="text-white/60">Language:</span> {conversationContext.language}</p>
            {isEscalating && (
              <p className="text-amber-300">Escalating → {greAssigned ?? "GRE Executive"}</p>
            )}
            <p className="text-white/60 truncate"><span className="text-white/60">Next Q:</span> {workflow.nextQuestion}</p>
            {Object.keys(workflow.collected).length > 0 && (
              <p className="text-green-300/80 break-words">
                Collected: {JSON.stringify(workflow.collected)}
              </p>
            )}
            {workflow.missing.length > 0 && (
              <p className="text-yellow-300/80">Missing: {workflow.missing.join(", ")}</p>
            )}
          </div>

          <div className="border-b border-white/10 pb-2 space-y-1">
            <p className="font-semibold">Lead Preview</p>
            <pre className="text-[10px] text-green-200/90 whitespace-pre-wrap break-all max-h-24 overflow-y-auto">
              {JSON.stringify(leadJson, null, 2)}
            </pre>
          </div>

          <div className="border-b border-white/10 pb-2 space-y-1">
            <p className="font-semibold">Notification Queue ({notifications.length})</p>
            {notifications.slice(0, 3).map((n) => (
              <p key={n.id} className="text-[10px] text-white/70 truncate">
                [{n.type}] {n.title}
              </p>
            ))}
            {notifications.length === 0 && (
              <p className="text-[10px] text-white/50">No notifications yet</p>
            )}
          </div>

          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-semibold">Pipeline</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
              state.openaiConfigured ? "bg-green-500/20 text-green-300" : "bg-orange-500/20 text-orange-300"
            )}>
              {state.openaiConfigured ? "OpenAI" : "Demo Mode"}
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
