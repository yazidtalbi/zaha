// app/admin/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type Stats = {
  totalSellers: number;
  totalProducts: number;
  totalOrders7d: number;
  newOrdersToday: number;
  activeShops: number;
  inactiveShops: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);

        const [
          sellersRes,
          productsRes,
          orders7dRes,
          ordersTodayRes,
          activeShopsRes,
          inactiveShopsRes,
        ] = await Promise.all([
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
          // using is_verified as "active" flag for MVP
          supabase
            .from("shops")
            .select("*", { count: "exact", head: true })
            .eq("is_verified", true),
          supabase
            .from("shops")
            .select("*", { count: "exact", head: true })
            .eq("is_verified", false),
        ]);

        if (!mounted) return;

        setStats({
          totalSellers: sellersRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
          totalOrders7d: orders7dRes.count ?? 0,
          newOrdersToday: ordersTodayRes.count ?? 0,
          activeShops: activeShopsRes.count ?? 0,
          inactiveShops: inactiveShopsRes.count ?? 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    { label: "Total sellers", value: stats?.totalSellers ?? 0 },
    { label: "Total products", value: stats?.totalProducts ?? 0 },
    { label: "Orders (last 7 days)", value: stats?.totalOrders7d ?? 0 },
    { label: "New orders today", value: stats?.newOrdersToday ?? 0 },
    { label: "Active shops", value: stats?.activeShops ?? 0 },
    { label: "Inactive shops", value: stats?.inactiveShops ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-3">
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
    </div>
  );
}
