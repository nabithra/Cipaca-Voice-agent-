"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ fontFamily: "system-ui", padding: "4rem", textAlign: "center" }}>
          <h2>CIPACA Voice Assistant</h2>
          <p>Something went wrong. Please reload the page.</p>
          <button type="button" onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
