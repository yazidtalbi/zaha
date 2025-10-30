"use client";

import { useEffect } from "react";

export default function BottomSheet({
  open,
  onClose,
  title = "Filters",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-lg">
        <div className="mx-auto h-1 w-10 rounded-full bg-neutral-200 mb-3" />
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-sm underline">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
