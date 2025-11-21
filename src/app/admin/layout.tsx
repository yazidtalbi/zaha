// app/admin/layout.tsx
"use client";

import { ReactNode } from "react";
import RequireAuth from "@/components/RequireAuth";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminGuard>
        <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
          <AdminSidebar />
          <div className="flex flex-1 flex-col">
            <main className="mx-auto w-full max-w-6xl px-6 py-6">
              {children}
            </main>
          </div>
        </div>
      </AdminGuard>
    </RequireAuth>
  );
}
