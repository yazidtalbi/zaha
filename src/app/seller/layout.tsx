/* eslint-disable react/no-unescaped-entities */
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useMemo } from "react";

const TABS = [
  { value: "/seller", label: "Dashboard" },
  { value: "/seller/orders", label: "Orders" },
  { value: "/seller/products", label: "Products" }, // ✅ added
  { value: "/seller/customers", label: "Customers" },
  { value: "/seller/analytics", label: "Analytics" },
  { value: "/seller/settings", label: "Settings" },
];

export default function SellerLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const current = useMemo(() => {
    // match by prefix so /seller and /seller?x still select Dashboard
    const found = TABS.find(
      (t) => pathname === t.value || pathname.startsWith(t.value + "/")
    );
    return found?.value ?? "/seller";
  }, [pathname]);

  return (
    <div className="max-w-screen-sm mx-auto pb-24">
      <div className="px-4 pt-4">
        <Tabs value={current}>
          <TabsList className="w-full justify-start gap-2 overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} asChild>
                <Link href={t.value} className="px-4 py-2 whitespace-nowrap">
                  {t.label}
                </Link>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 pt-4">{children}</div>
    </div>
  );
}
