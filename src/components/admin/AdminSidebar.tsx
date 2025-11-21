// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Store,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

const navItems = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
  },
  {
    href: "/admin/shops",
    label: "Shops",
    icon: Store,
  },
  {
    href: "/admin/orders",
    label: "Orders",
    icon: ReceiptText,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo / brand */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">
            Amzy / Zaha
          </span>
          <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
            Admin panel
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-white")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3 text-[11px] text-neutral-500">
        Built for internal moderation.
        <br />
        Handle with care.
      </div>
    </aside>
  );
}
