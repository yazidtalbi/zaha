// app/layout.tsx
import ClientChrome from "@/components/ClientChrome";
import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister"; // 👈 add this

import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"], // or ["500","600","700"] if you want more options
});

export const metadata: Metadata = {
  title: "Zaha",
  description: "Crafted in Morocco",
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
      <body className="font-sans text-ink min-h-screen overflow-x-hidden  mx-auto sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl bg-neutral-50">
        <ServiceWorkerRegister /> {/* 👈 now valid */}
        <ClientChrome>{children}</ClientChrome>
      </body>
    </html>
  );
}
