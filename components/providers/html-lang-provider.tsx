"use client";

import { useEffect } from "react";
import { useVoiceStore } from "@/lib/store";

export function HtmlLangProvider({ children }: { children: React.ReactNode }) {
  const language = useVoiceStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language === "ta" ? "ta" : "en";
  }, [language]);

  return <>{children}</>;
}
