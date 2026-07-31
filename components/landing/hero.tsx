"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  Globe,
  Headphones,
  Mic,
  Phone,
  Shield,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AIOrb } from "@/components/voice/ai-orb";

const features = [
  {
    icon: AlertTriangle,
    title: "Emergency Detection",
    description:
      "Instantly identifies medical emergencies and triggers escalation with ticket generation.",
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  {
    icon: Calendar,
    title: "Appointment Requests",
    description:
      "Collects patient details and schedules appointment requests with reference IDs.",
    color: "text-teal-500",
    bg: "bg-teal-500/10",
  },
  {
    icon: Headphones,
    title: "Human Escalation",
    description:
      "Seamlessly connects callers to human executives when requested.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: Globe,
    title: "Tamil + English",
    description:
      "Bilingual support with natural conversation in Tamil and English.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Users,
    title: "Lead Capture",
    description:
      "Automatically captures and stores patient leads from every conversation.",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Real-time dashboard with charts, filters, and export capabilities.",
    color: "text-orange-500",
    bg: "bg-orange-500/10",
  },
];

const stats = [
  { label: "24/7 Available", icon: Phone },
  { label: "AI Powered", icon: Activity },
  { label: "Secure & Private", icon: Shield },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 hospital-bg" />
      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <AIOrb isActive className="mx-auto scale-150" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            <span className="gradient-text">CIPACA</span>
            <br />
            <span className="text-foreground">AI Voice Assistant</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            AI-powered centralized hospital helpline. Speak naturally in Tamil
            or English for emergencies, appointments, and general inquiries.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            <Button asChild variant="gradient" size="xl">
              <Link href="/voice">
                <Mic className="mr-2 h-5 w-5" />
                Start Voice
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/dashboard">
                <BarChart3 className="mr-2 h-5 w-5" />
                View Dashboard
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-12 flex flex-wrap justify-center gap-6"
          >
            {stats.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Intelligent Hospital Helpline
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Built for CIPACA Hospital with production-grade voice AI, emergency
            workflows, and comprehensive analytics.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="glass-card h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">
              Ready to experience AI-powered healthcare?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Start a voice conversation now. No phone required — works
              directly in your browser with your microphone.
            </p>
            <Button asChild variant="gradient" size="lg" className="mt-8">
              <Link href="/voice">
                <Mic className="mr-2 h-5 w-5" />
                Start Voice Assistant
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
