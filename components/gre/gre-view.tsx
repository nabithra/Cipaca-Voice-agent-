"use client";

import { useEffect, useState } from "react";
import { Headphones, Phone, PhoneCall, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGRETeam, getGRELines } from "@/server/actions/gre";
import type { GREMember } from "@/types";
import { cn } from "@/lib/utils";

const statusColors = {
  available: "bg-green-500",
  busy: "bg-yellow-500",
  offline: "bg-gray-400",
};

export function GREView() {
  const [team, setTeam] = useState<GREMember[]>([]);
  const [lines, setLines] = useState({ emergency: "", support: "" });

  useEffect(() => {
    getGRETeam().then(setTeam);
    getGRELines().then(setLines);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] hospital-bg">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Headphones className="h-8 w-8 text-primary" />
            GRE Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Guest Relations Executive team — simulated routing (no personal phones)
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="glass-card border-red-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Emergency Line</p>
                  <p className="font-semibold">{lines.emergency}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <PhoneCall className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Support Line</p>
                  <p className="font-semibold">{lines.support}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>GRE Team — Shift Roster</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {team.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-border/50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold">{member.name}</p>
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-2.5 w-2.5 rounded-full", statusColors[member.status])} />
                      <span className="text-xs capitalize text-muted-foreground">{member.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Shift: <span className="capitalize text-foreground">{member.shift}</span></p>
                    <p>Line: <span className="capitalize text-foreground">{member.line}</span></p>
                    <p>Calls handled: <span className="text-foreground">{member.callsHandled}</span></p>
                  </div>
                  {member.status === "available" && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                      <Phone className="h-3 w-3" />
                      Ready for routing
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Simulated Call Routing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When emergencies or escalations occur, the system automatically routes to the next available GRE executive on the dedicated hospital line. No personal phone numbers are used — all routing is simulated through the CIPACA backend.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
