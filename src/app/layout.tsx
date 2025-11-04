// app/layout.tsx
import ClientChrome from "@/components/ClientChrome";
import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";

export const metadata: Metadata = {
  title: "Zaha",
  description: "Crafted in Morocco",
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
        <ClientChrome>{children}</ClientChrome>
      </body>
    </html>
  );
}
