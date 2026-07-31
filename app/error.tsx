"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CIPACA Error]", error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 py-16 text-center space-y-4">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        The application encountered an unexpected error. You can try again or return to the voice assistant.
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/voice")}>
          Go to Voice
        </Button>
      </div>
    </div>
  );
}
