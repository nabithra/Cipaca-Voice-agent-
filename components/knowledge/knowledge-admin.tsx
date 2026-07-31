"use client";

import { useEffect, useState } from "react";
import { BookOpen, RotateCcw, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getKnowledge, resetKnowledge, updateKnowledge } from "@/server/actions/knowledge";
import type { KnowledgeBase, KnowledgeBaseEntry } from "@/types";

export function KnowledgeAdminView() {
  const [kb, setKb] = useState<KnowledgeBase | null>(null);
  const [search, setSearch] = useState("");
  const [jsonEdit, setJsonEdit] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getKnowledge().then((data) => {
      setKb(data);
      setJsonEdit(JSON.stringify(data, null, 2));
    });
  }, []);

  const filterEntries = (entries: KnowledgeBaseEntry[]) =>
    entries.filter(
      (e) =>
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase())
    );

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonEdit) as KnowledgeBase;
      await updateKnowledge(parsed);
      setKb(parsed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert("Invalid JSON format");
    }
  };

  const handleReset = async () => {
    const { kb: defaultKb } = await resetKnowledge();
    setKb(defaultKb);
    setJsonEdit(JSON.stringify(defaultKb, null, 2));
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
            <p className="text-muted-foreground mt-1">Manage verified hospital information</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" /> {saved ? "Saved!" : "Save JSON"}
            </Button>
          </div>
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
            placeholder="Search knowledge base..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="json">Edit JSON</TabsTrigger>
          </TabsList>
          <TabsContent value="browse" className="space-y-4">
            {sections.map(({ key, label, data }) => (
              <Card key={key} className="glass-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filterEntries(data).map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border/50 p-3">
                        <p className="font-medium text-sm">{entry.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{entry.content}</p>
                        <div className="flex gap-1 mt-2">
                          {entry.tags.map((t) => (
                            <span key={t} className="text-xs bg-muted px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="json">
            <Card className="glass-card">
              <CardContent className="p-4">
                <textarea
                  value={jsonEdit}
                  onChange={(e) => setJsonEdit(e.target.value)}
                  className="w-full h-[500px] font-mono text-xs bg-muted/50 rounded-xl p-4 border border-border resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  spellCheck={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
