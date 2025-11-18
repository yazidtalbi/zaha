// components/seller/SellerBottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  ClipboardList,
  MessageSquare,
  Settings,
  PlusCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function clsx(...xs: (string | boolean | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}

type ItemProps = {
  href: string;
  label: string;
  match: string | string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export default function SellerBottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? pathname : "";

  const Item = ({ href, label, match, icon: Icon }: ItemProps) => {
    const isActive = useMemo(() => {
      if (!mounted) return false;
      return Array.isArray(match)
        ? match.some((m) => path === m || path.startsWith(m + "/"))
        : path === match || path.startsWith(match + "/");
    }, [mounted, match, path]);

    return (
      <Link href={href} className="block">
        <div
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-2 text-[11px] transition-all duration-200",
            isActive
              ? "text-[#371837] font-semibold"
              : "text-gray-500 hover:text-ink"
          )}
        >
          <div
            className={clsx(
              "grid place-items-center w-10 h-9 rounded-lg transition-colors",
              isActive ? "bg-[#371837]/15" : "bg-transparent"
            )}
          >
            <Icon size={20} className={clsx(isActive && "scale-110")} />
          </div>
          <span className="leading-none">{label}</span>
        </div>
      </Link>
    );
  };

  if (!mounted) return null;

  return (
    <>
      {/* Floating Add button */}
      <Link
        href="/sell"
        className="fixed bottom-16 right-4 z-[60] rounded-full shadow-lg bg-[#371837] text-white px-4 py-2 flex items-center gap-2"
      >
        <PlusCircle size={18} />
        <span className="text-sm font-medium">Add listing</span>
      </Link>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <ul className="max-w-screen-sm mx-auto grid grid-cols-5">
          <li>
            <Item
              href="/seller"
              label="Dashboard"
              match="/seller"
              icon={Home}
            />
          </li>
          <li>
            <Item
              href="/seller/products"
              label="Products"
              match="/seller/products"
              icon={Package}
            />
          </li>
          <li>
            <Item
              href="/seller/orders"
              label="Orders"
              match="/seller/orders"
              icon={ClipboardList}
            />
          </li>
          <li>
            <Item
              href="/seller/inbox"
              label="Inbox"
              match="/seller/inbox"
              icon={MessageSquare}
            />
          </li>
          <li>
            <Item
              href="/seller/settings"
              label="Settings"
              match="/seller/settings"
              icon={Settings}
            />
          </li>
        </ul>
      </nav>
    </>
  );
}
