/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useEffect } from "react";
import { useRequireShop } from "@/hooks/useRequireShop";

// tiny helper; you likely already have cn() in "@/lib/utils"
function cn(...xs: (string | false | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

const TABS = [
  { href: "/seller", label: "Dashboard" },
  { href: "/seller/orders", label: "Orders" },
  { href: "/seller/products", label: "Products" },
  { href: "/seller/customers", label: "Customers" },
  { href: "/seller/analytics", label: "Analytics" },
  { href: "/seller/settings", label: "Settings" },
];

export default function SellerLayout({ children }: PropsWithChildren) {
  // ALWAYS call hooks at the top-level and in the same order
  const router = useRouter();
  const pathname = usePathname();
  const loading = useRequireShop(); // handles: not logged in → /login?next=/seller, no shop → /onboarding/seller

  // Optional: hide bottom nav or do other side-effects here (but don't redirect again)
  useEffect(() => {
    // side-effects only; do not duplicate redirects already handled in useRequireShop
  }, []);

  // Safe early return AFTER all hooks
  if (loading) return null;

  return (
    <div className="">
      {/* Top tabs (optional)
      <div className="px-4 pt-4">
        <div className="w-full overflow-x-auto">
          <div className="inline-flex min-w-full items-center gap-2 rounded-lg border bg-muted/30 p-1">
            {TABS.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-4 py-2 text-sm whitespace-nowrap rounded-md transition",
                    active
                      ? "bg-yellow-200 shadow text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      */}

      <div className="">{children}</div>
    </div>
  );
}
