"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, MapPin, Rocket } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PILOT_UNITS } from "@/lib/knowledge-base";
import { cn } from "@/lib/utils";

const statusConfig = {
  ready: { label: "Ready", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle2 },
  pilot: { label: "Pilot", color: "bg-yellow-500/10 text-yellow-600", icon: Rocket },
  live: { label: "Live", color: "bg-green-500/10 text-green-600", icon: CheckCircle2 },
  planned: { label: "Planned", color: "bg-muted text-muted-foreground", icon: Clock },
};

export function PilotView() {
  const phase1 = PILOT_UNITS.filter((u) => u.phase === 1);
  const future = PILOT_UNITS.filter((u) => u.phase > 1);

  return (
    <div className="min-h-[calc(100vh-4rem)] hospital-bg">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Rocket className="h-8 w-8 text-primary" />
            Pilot Implementation
          </h1>
          <p className="text-muted-foreground mt-2">
            CIPACA AI Voice Assistant rollout roadmap
          </p>
        </div>

        <Card className="glass-card border-primary/30">
          <CardHeader>
            <CardTitle>Phase 1 — Active Pilot</CardTitle>
            <CardDescription>Thiruvannamalai Unit — AI Voice Assistant deployment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {phase1.map((unit, i) => {
                const cfg = statusConfig[unit.status];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={unit.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center justify-between rounded-xl border border-border/50 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                        <MapPin className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{unit.name}</p>
                        <p className="text-sm text-muted-foreground">{unit.location}</p>
                        {unit.launchDate && (
                          <p className="text-xs text-muted-foreground mt-1">Launch: {unit.launchDate}</p>
                        )}
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", cfg.color)}>
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Future Rollout</CardTitle>
            <CardDescription>Planned hospital expansion across Tamil Nadu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {future.map((unit, i) => {
                  const cfg = statusConfig[unit.status];
                  return (
                    <motion.div
                      key={unit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-start gap-4 pl-12 relative"
                    >
                      <div className="absolute left-4 top-2 h-4 w-4 rounded-full bg-muted border-2 border-border" />
                      <div className="flex-1 rounded-xl border border-border/50 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{unit.name}</p>
                            <p className="text-sm text-muted-foreground">{unit.location}</p>
                          </div>
                          <div className="text-right">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", cfg.color)}>
                              {cfg.label}
                            </span>
                            <p className="text-xs text-muted-foreground mt-1">Phase {unit.phase}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
