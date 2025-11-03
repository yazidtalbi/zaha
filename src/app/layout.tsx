// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import ToastHost from "@/components/ToastHost";
import BottomNav from "@/components/BottomNav";

import { supabase } from "@/lib/supabaseClient";

const { data, error } = await supabase.rpc("suggest_categories", {
  title_text: "Handwoven wool berber rug 120x180",
  lang: "en",
  max_results: 6,
});
console.log({ data, error });

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
      <body className="font-sans bg-paper text-ink min-h-screen overflow-x-hidden">
        <main className="max-w-screen-sm mx-auto pb-[72px]">
          {children}
          <ToastHost />
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
