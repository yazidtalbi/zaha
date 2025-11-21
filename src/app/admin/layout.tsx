// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/dashboard", label: "Dashboard" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/shops", label: "Shops" },
    { href: "/admin/orders", label: "Orders" },
  ];

  return (
    <RequireAuth>
      <AdminGuard>
        <div className="min-h-screen bg-neutral-50 text-neutral-900">
          <header className="border-b bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded bg-neutral-900 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Admin
                </span>
                <h1 className="text-base font-semibold">Amzy / Zaha</h1>
              </div>

              <nav className="flex items-center gap-2 text-sm">
                {navItems.map((item) => {
                  const active = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "rounded-full px-3 py-1.5 transition",
                        active
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-700 hover:bg-neutral-200/80"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
      </AdminGuard>
    </RequireAuth>
  );
}
