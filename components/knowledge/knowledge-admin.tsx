"use client";

import { useEffect, useState } from "react";
import { BookOpen, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getKnowledge, resetKnowledge } from "@/server/actions/knowledge";
import { KNOWLEDGE_STORAGE_KEY } from "@/lib/constants";
import type { KnowledgeBase, KnowledgeBaseEntry } from "@/types";

function readKnowledgeFromStorage(): KnowledgeBase | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as KnowledgeBase;
  } catch {
    return null;
  }
}

function saveKnowledgeToStorage(kb: KnowledgeBase): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(kb));
  } catch {
    // ignore quota errors
  }
}

export function KnowledgeAdminView() {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [search, setSearch] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const cached = readKnowledgeFromStorage();
    if (cached) {
      setKb(cached);
      return;
    }
    getKnowledge().then((data) => {
      setKb(data);
      saveKnowledgeToStorage(data);
    });
  }, []);

  const filterEntries = (entries: KnowledgeBaseEntry[]) =>
    entries.filter(
      (e) =>
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    );

  const handleReset = async () => {
    if (!confirm("Reset all knowledge base entries to hospital defaults?")) return;
    setResetting(true);
    try {
      const { kb: defaultKb } = await resetKnowledge();
      saveKnowledgeToStorage(defaultKb);
      setKb(defaultKb);
    } finally {
      setResetting(false);
    }
  };

  if (!kb) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-muted-foreground">Loading knowledge base...</p>
      </div>
    );
  }

  const sections = [
    { key: "departments", label: "Departments", data: kb.departments },
    { key: "doctors", label: "Doctors", data: kb.doctors },
    { key: "specialties", label: "Specialties", data: kb.specialties },
    { key: "diagnostics", label: "Diagnostics", data: kb.diagnostics },
    { key: "services", label: "Hospital Services", data: kb.services },
    { key: "processes", label: "Workflows", data: kb.processes },
    { key: "faqs", label: "FAQs", data: kb.faqs },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-4rem)] hospital-bg">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              Knowledge Base
            </h1>
            <p className="text-muted-foreground mt-1">
              Browse verified hospital information used by the voice assistant
            </p>
          </div>
          <Button variant="outline" onClick={handleReset} disabled={resetting}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {resetting ? "Resetting…" : "Reset to defaults"}
          </Button>
        </div>

        <Card className="glass-card">
          <CardContent className="p-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Visiting Hours</p>
              <p className="text-sm font-medium">{kb.visitingHours}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Billing</p>
              <p className="text-sm font-medium">{kb.billing}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Insurance</p>
              <p className="text-sm font-medium">{kb.insurance}</p>
            </div>
          </CardContent>
        </Card>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments, doctors, services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-4">
          {sections.map(({ key, label, data }) => {
            const filtered = filterEntries(data);
            if (search && filtered.length === 0) return null;
            return (
              <Card key={key} className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{label}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No entries in this section.</p>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-border/50 p-3">
                          <p className="font-medium text-sm">{entry.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                            {entry.content}
                          </p>
                          {entry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {entry.tags.map((t) => (
                                <span
                                  key={t}
                                  className="text-xs bg-muted px-2 py-0.5 rounded-full"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
