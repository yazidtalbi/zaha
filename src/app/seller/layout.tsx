/* eslint-disable react/no-unescaped-entities */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren } from "react";

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
  const pathname = usePathname();

  return (
    <div className="max-w-screen-sm mx-auto pb-24">
      <div className="px-4 pt-4">
        {/* Route-driven "tabs" */}
        <div className="w-full overflow-x-auto">
          <div className="inline-flex min-w-full items-center gap-2 rounded-lg border bg-muted/30 p-1">
            {TABS.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-4 py-2 text-sm whitespace-nowrap rounded-md transition",
                    active
                      ? "bg-background shadow text-foreground"
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

      <div className="px-4 pt-4">{children}</div>
    </div>
  );
}
