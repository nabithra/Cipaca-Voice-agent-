"use client";

import { useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PhoneOff, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MicrophoneButton } from "@/components/voice/microphone-button";
import { Waveform } from "@/components/voice/waveform";
import { ConnectionStatusBadge } from "@/components/voice/connection-status";
import { ConversationBubbles } from "@/components/voice/conversation-bubbles";
import { AIOrb } from "@/components/voice/ai-orb";
import { LanguageSelector } from "@/components/voice/language-selector";
import { EmergencyMode } from "@/components/voice/emergency-mode";
import { ArrivalTimeline } from "@/components/voice/arrival-timeline";
import { EscalationOverlay } from "@/components/voice/escalation-overlay";
import { DebugPanel } from "@/components/voice/debug-panel";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { useVoiceStore } from "@/lib/store";

export function VoiceInterface() {
  const { connect, disconnect } = useVoiceAssistant();
  const {
    status,
    mode,
    isMuted,
    language,
    languageSelected,
    userTranscript,
    aiTranscript,
    messages,
    isEmergency,
    emergencyStage,
    arrivalStage,
    emergencyTicketId,
    escalationId,
    isEscalating,
    greAssigned,
    error,
    isDemoMode,
    setMuted,
    setLanguage,
    setLanguageSelected,
    setDemoMode,
    resetConversation,
    dismissEmergencyBanner,
  } = useVoiceStore();

  const isActive = status !== "disconnected" && status !== "error";
  const isListening = status === "listening";
  const isSpeaking = status === "speaking";
  const isProcessing = status === "processing";

  const handleStart = useCallback(async () => {
    if (!languageSelected) return;
    await connect();
  }, [connect, languageSelected]);

  const handleMicClick = async () => {
    if (isActive) {
      disconnect();
      resetConversation(language);
    } else if (languageSelected) {
      await connect();
    }
  };

  // Demo keypad: 1 = English, 2 = Tamil
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isActive) return;
      if (e.key === "1") {
        setLanguage("en");
        setLanguageSelected(true);
      } else if (e.key === "2") {
        setLanguage("ta");
        setLanguageSelected(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, setLanguage, setLanguageSelected]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => setDemoMode(h.demoMode ?? !h.openaiConfigured))
      .catch(() => setDemoMode(true));
  }, [setDemoMode]);

  const showError =
    error && (!isDemoMode || /microphone|permission/i.test(error));

  return (
    <div className="min-h-[calc(100vh-4rem)] hospital-bg relative">
      <EmergencyMode
        isVisible={isEmergency}
        stage={emergencyStage}
        ticketId={emergencyTicketId}
        greAssigned={greAssigned}
        onDismiss={dismissEmergencyBanner}
      />

      <EscalationOverlay
        isVisible={isEscalating && !isEmergency}
        escalationId={escalationId}
        greAssigned={greAssigned}
      />

      <DebugPanel />

      <div className="container mx-auto px-4 py-8">
        {!languageSelected && !isActive ? (
          <LanguageSelector onStart={handleStart} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card className="glass-card">
                <CardContent className="p-8">
                  <div className="flex flex-col items-center">
                    <ConnectionStatusBadge
                      status={status}
                      mode={mode}
                      demoMode={isDemoMode}
                      className="mb-6"
                    />

                    <MicrophoneButton
                      isActive={isActive}
                      isListening={isListening}
                      isSpeaking={isSpeaking}
                      isMuted={isMuted}
                      onClick={handleMicClick}
                      disabled={status === "connecting"}
                    />

                    <Waveform
                      isActive={isListening || isSpeaking}
                      color={
                        isEmergency ? "emergency" : isSpeaking ? "speaking" : "primary"
                      }
                      className="mt-8"
                    />

                    {showError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-4 text-sm text-destructive text-center"
                      >
                        {error}
                      </motion.p>
                    )}

                    <div className="mt-8 w-full grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Your Speech</p>
                        <p className="text-sm min-h-[2rem]">
                          {userTranscript || (
                            <span className="text-muted-foreground italic">
                              {isListening ? "Listening..." : "—"}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="rounded-xl bg-muted/50 p-4">
                        <p className="text-xs font-medium text-muted-foreground mb-2">AI Response</p>
                        <p className="text-sm min-h-[2rem]">
                          {aiTranscript || (
                            <span className="text-muted-foreground italic">
                              {isSpeaking ? "Speaking..." : "—"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {arrivalStage && (
                      <ArrivalTimeline stage={arrivalStage} className="mt-6 w-full" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Select
                        value={language}
                        onValueChange={(v) => setLanguage(v as "en" | "ta")}
                        disabled={isActive}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ta">Tamil</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMuted(!isMuted)}
                        disabled={!isActive}
                      >
                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        {isMuted ? "Unmute" : "Mute"}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          disconnect();
                          resetConversation(language);
                        }}
                        disabled={!isActive}
                      >
                        <PhoneOff className="h-4 w-4 mr-1" /> End
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          disconnect();
                          const lang = language;
                          resetConversation(lang);
                          setLanguage(lang);
                          setLanguageSelected(true);
                          setTimeout(() => connect(), 500);
                        }}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" /> Restart
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="glass-card h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <AIOrb isActive={isActive} isSpeaking={isSpeaking} />
                    <CardTitle className="text-lg">Conversation</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <ConversationBubbles
                    messages={messages}
                    isProcessing={isProcessing}
                    className="max-h-[500px] min-h-[300px]"
                  />
                  {messages.length === 0 && !isProcessing && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Tap the microphone to start
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
