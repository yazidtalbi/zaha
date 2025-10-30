"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = {
  id: string;
  title: string;
  desc?: string;
  variant?: "default" | "success" | "error";
};
type Ctx = { push: (t: Omit<Toast, "id">) => void };

const ToastCtx = createContext<Ctx | null>(null);
export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider/>");
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push: Ctx["push"] = (t) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, ...t }]);
    // auto-hide after 2.5s
    setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      2500
    );
  };

  const value = useMemo(() => ({ push }), []);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* viewport */}
      <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-50 mx-auto flex w-full max-w-sm flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-xl border px-4 py-3 shadow-md bg-white",
              t.variant === "success"
                ? "border-green-200"
                : t.variant === "error"
                ? "border-rose-200"
                : "border-neutral-200",
            ].join(" ")}
          >
            <div className="text-sm font-medium">{t.title}</div>
            {t.desc ? (
              <div className="mt-0.5 text-xs text-neutral-600">{t.desc}</div>
            ) : null}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
