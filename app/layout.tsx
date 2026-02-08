import type { Metadata } from "next";
import "./globals.css";
import { TokenGate } from "@/components/auth/TokenGate";

export const metadata: Metadata = {
  title: "Time Tracker - Track Your Daily Activities",
  description: "A minimal, Apple-style time tracking application with AI-powered insights",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased bg-background text-foreground"
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        <TokenGate>{children}</TokenGate>
      </body>
    </html>
  );
}
