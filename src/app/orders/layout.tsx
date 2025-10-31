// app/orders/layout.tsx
"use client";

import { ReactNode } from "react";
import { ToastProvider } from "@/components/Toast"; // your custom provider
import { Toaster } from "sonner"; // if you also use sonner elsewhere

export default function OrdersLayout({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <Toaster richColors position="top-center" />
    </ToastProvider>
  );
}
