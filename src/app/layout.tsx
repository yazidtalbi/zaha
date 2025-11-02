// import "./globals.css";
// import BottomNav from "@/components/BottomNav";
// import { ToastProvider } from "@/components/Toast";
// import ToastHost from "@/components/ToastHost";

// export const metadata = { title: "Zaha", description: "Crafted in Morocco" };

// export default function RootLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <html lang="en">
//       <body className="min-h-screen bg-paper text-ink">
//         <div className="mx-auto max-w-screen-sm pb-20">
//           {" "}
//           <ToastProvider>{children}</ToastProvider>
//           <ToastHost />
//         </div>
//         <BottomNav />
//       </body>
//     </html>
//   );
// }

// app/layout.tsx  (NO "use client")
import BottomNav from "@/components/BottomNav";
// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import ToastHost from "@/components/ToastHost";

export const metadata: Metadata = {
  title: "Zaha",
  description: "",
};

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans", // <-- change this line
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSans.variable}>
      <body className="font-sans" suppressHydrationWarning>
        <main className="min-h-screen bg-paper text-ink pb-16">
          {" "}
          {children}
          <ToastHost />
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
