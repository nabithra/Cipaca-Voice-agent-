"use client";

import { motion } from "framer-motion";
import { Globe, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useVoiceStore } from "@/lib/store";
import type { Language } from "@/types";

interface LanguageSelectorProps {
  onStart: () => void;
}

export function LanguageSelector({ onStart }: LanguageSelectorProps) {
  const { language, setLanguage, setLanguageSelected } = useVoiceStore();

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setLanguageSelected(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-8 py-8"
    >
      <div className="text-center">
        <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Select Your Language</h2>
        <p className="text-muted-foreground mt-2">
          தமிழ் or English — choose your preferred language
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 w-full max-w-md">
        <Card
          className={`glass-card cursor-pointer transition-all hover:shadow-lg ${
            language === "en" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => selectLanguage("en")}
        >
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold mb-2">1</p>
            <p className="font-semibold">English</p>
            <p className="text-sm text-muted-foreground mt-1">Press 1 or tap</p>
          </CardContent>
        </Card>

        <Card
          className={`glass-card cursor-pointer transition-all hover:shadow-lg ${
            language === "ta" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => selectLanguage("ta")}
        >
          <CardContent className="p-6 text-center">
            <p className="text-3xl font-bold mb-2">2</p>
            <p className="font-semibold">தமிழ் (Tamil)</p>
            <p className="text-sm text-muted-foreground mt-1">Press 2 or tap</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Phone className="h-4 w-4" />
        <span>Demo keypad: Press 1 for English, 2 for Tamil</span>
      </div>

      <Button
        variant="gradient"
        size="lg"
        onClick={onStart}
        disabled={!language}
        className="min-w-[200px]"
      >
        Start Conversation
      </Button>
    </motion.div>
  );
}
