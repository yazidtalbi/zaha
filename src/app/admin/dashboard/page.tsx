// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  totalUsers: number;
  totalSellers: number;
  totalProducts: number;
  totalOrders7d: number;
  newOrdersToday: number;
  activeShops: number;
  inactiveShops: number;
  lastOrderAt: string | null;
  lastProductAt: string | null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const [
          usersRes,
          sellersRes,
          productsRes,
          orders7dRes,
          ordersTodayRes,
          activeShopsRes,
          inactiveShopsRes,
          lastOrderRes,
          lastProductRes,
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "seller"),
          supabase.from("products").select("*", { count: "exact", head: true }),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sevenDaysAgo.toISOString()),
          supabase
            .from("orders")
            .select("*", { count: "exact", head: true })
            .gte("created_at", todayStart.toISOString()),
          supabase
            .from("shops")
            .select("*", { count: "exact", head: true })
            .eq("is_verified", true),
          supabase
            .from("shops")
            .select("*", { count: "exact", head: true })
            .eq("is_verified", false),

          // latest order
          supabase
            .from("orders")
            .select("created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),

          // latest product
          supabase
            .from("products")
            .select("created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (ignore) return;

        setStats({
          totalUsers: usersRes.count ?? 0,
          totalSellers: sellersRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
          totalOrders7d: orders7dRes.count ?? 0,
          newOrdersToday: ordersTodayRes.count ?? 0,
          activeShops: activeShopsRes.count ?? 0,
          inactiveShops: inactiveShopsRes.count ?? 0,
          lastOrderAt: (lastOrderRes.data as any)?.created_at ?? null,
          lastProductAt: (lastProductRes.data as any)?.created_at ?? null,
        });
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const cards = [
    { label: "Total users", value: stats?.totalUsers ?? 0 },
    { label: "Total sellers", value: stats?.totalSellers ?? 0 },
    { label: "Total products", value: stats?.totalProducts ?? 0 },
    { label: "Orders (last 7 days)", value: stats?.totalOrders7d ?? 0 },
    { label: "New orders today", value: stats?.newOrdersToday ?? 0 },
    { label: "Active shops", value: stats?.activeShops ?? 0 },
    { label: "Inactive shops", value: stats?.inactiveShops ?? 0 },
  ];

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString();
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="border-neutral-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-neutral-500">
                {c.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-semibold">{c.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-xs text-neutral-600">
        <div>
          Last order:&nbsp;
          <span className="font-medium">
            {loading ? "…" : formatDate(stats?.lastOrderAt ?? null)}
          </span>
        </div>
        <div>
          Last product created:&nbsp;
          <span className="font-medium">
            {loading ? "…" : formatDate(stats?.lastProductAt ?? null)}
          </span>
        </div>
      </div>
    </div>
  );
}
