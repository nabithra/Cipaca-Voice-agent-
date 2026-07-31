"use client";

import { motion } from "framer-motion";
import { BookOpen, Database, GraduationCap, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TRAINING_DATASETS } from "@/lib/knowledge-base";

export function TrainingView() {
  const totalRecords = TRAINING_DATASETS.reduce((s, d) => s + d.recordCount, 0);
  const avgProgress = Math.round(
    TRAINING_DATASETS.reduce((s, d) => s + d.progress, 0) / TRAINING_DATASETS.length
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] hospital-bg">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            AI Training Module
          </h1>
          <p className="text-muted-foreground mt-2">
            Knowledge sources and training datasets powering CIPACA AI Voice Assistant
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-3xl font-bold mt-1">{totalRecords.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Training Progress</p>
              <p className="text-3xl font-bold mt-1">{avgProgress}%</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">Datasets</p>
              <p className="text-3xl font-bold mt-1">{TRAINING_DATASETS.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Training Datasets
            </CardTitle>
            <CardDescription>Knowledge sources used to train the voice assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {TRAINING_DATASETS.map((ds, i) => (
                <motion.div
                  key={ds.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/50 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                    </div>
                    <BookOpen className="h-5 w-5 text-primary shrink-0" />
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{ds.recordCount.toLocaleString()} records</span>
                    <span className="text-muted-foreground">Updated {ds.lastUpdated}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Progress</span>
                      <span>{ds.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                        style={{ width: `${ds.progress}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Knowledge Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Existing Call Recordings — historical helpline patterns</li>
              <li>• Frequently Asked Questions — verified patient Q&A</li>
              <li>• Hospital Services — department and service descriptions</li>
              <li>• Emergency Conversations — triage and escalation protocols</li>
              <li>• Appointment Conversations — booking dialogues</li>
              <li>• Departments & Diagnostics — structured routing knowledge</li>
              <li>• Knowledge Base — admin-managed hospital information</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
