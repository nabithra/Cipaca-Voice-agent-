import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { HtmlLangProvider } from "@/components/providers/html-lang-provider";
import { Navbar } from "@/components/layout/navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CIPACA AI Voice Assistant",
  description:
    "AI-powered centralized hospital helpline for CIPACA Hospital. Voice assistant supporting Tamil and English.",
  keywords: ["CIPACA", "hospital", "voice assistant", "AI", "healthcare"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <HtmlLangProvider>
            <Navbar />
            <main>{children}</main>
          </HtmlLangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
