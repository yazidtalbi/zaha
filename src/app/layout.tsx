// app/layout.tsx
import ClientChrome from "@/components/ClientChrome";
import "./globals.css";
import type { Metadata } from "next";

import { Instrument_Sans, Playfair_Display } from "next/font/google";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { AuthProvider } from "@/lib/AuthContext"; // 👈 added
import CacheVersionGuard from "@/components/CacheVersionGuard";

export const dynamic = "force-dynamic";

// ---- Fonts ----
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

// ---- Global Metadata ----
export const metadata: Metadata = {
  metadataBase: new URL("https://zaha.ma"),

  title: {
    default: "Zaha – Discover products made with soul",
    template: "%s • zaha.ma",
  },

  description:
    "Zaha is a modern Moroccan marketplace for handmade and small-batch goods. Discover products made with soul from artisans, designers, and makers across Morocco.",

  manifest: "/manifest.json",
  themeColor: "#0B0B0C",

  icons: {
    icon: [
      { url: "favicon.ico", sizes: "any" },
      { url: "icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      {
        url: "icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    type: "website",
    url: "https://zaha.ma",
    title: "zaha.ma – Discover products made with soul",
    description:
      "Connect with Morocco's most talented artisans. Explore handmade goods, home décor, jewelry, fashion, and more — crafted with soul.",
    siteName: "zaha.ma",
    images: [
      {
        url: "/og/zaha-og.jpg",
        width: 1200,
        height: 630,
        alt: "zaha.ma marketplace preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "zaha.ma – Discover products made with soul",
    description:
      "A modern Moroccan marketplace for handmade goods and small-batch creations.",
    images: ["/og/zaha-og.jpg"],
  },

  appleWebApp: {
    capable: true,
    title: "zaha.ma",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body className="font-sans text-ink min-h-screen overflow-x-hidden">
        {/* <ServiceWorkerRegister /> */}

        {/* 👇 GLOBAL AUTH CONTEXT WRAPPER */}
        <AuthProvider>
          <CacheVersionGuard>
            <ClientChrome>{children}</ClientChrome>
          </CacheVersionGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
