// app/layout.tsx
import ClientChrome from "@/components/ClientChrome";
import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Zaha",
  description: "Crafted in Morocco",
  // 👇 PWA bits
  manifest: "/manifest.json",
  themeColor: "#0B0B0C",
};

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body className="font-sans text-ink min-h-screen overflow-x-hidden">
        {/* Registers the service worker (see component below) */}
        <ServiceWorkerRegister />
        <ClientChrome>{children}</ClientChrome>
      </body>
    </html>
  );
}

/* ───────────────── Service Worker Register ───────────────── */

("use client");

import { useEffect } from "react";

function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registration failed", err));
    }
  }, []);

  return null;
}
