"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  created_at: string;
  amount_mad: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  products?: { shop_id: string };
};

export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AnalyticsInner />
    </RequireAuth>
  );
}

function AnalyticsInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, amount_mad, status, products:products(shop_id)"
        )
        .order("created_at", { ascending: false })
        .limit(1000);

      if (!error && data) setOrders(data as any[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + (o.amount_mad || 0), 0);

    const delivered = orders.filter((o) => o.status === "delivered").length;
    const pending = orders.filter((o) => o.status === "pending").length;

    // last 6 months revenue buckets
    const now = new Date();
    const buckets: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const label = `${y}-${String(m).padStart(2, "0")}`;
      const val = orders
        .filter((o) => {
          const od = new Date(o.created_at);
          return (
            od.getFullYear() === y &&
            od.getMonth() + 1 === m &&
            o.status !== "cancelled"
          );
        })
        .reduce((s, o) => s + (o.amount_mad || 0), 0);
      buckets.push({ label, value: val });
    }

    const max = Math.max(1, ...buckets.map((b) => b.value));

    return { total, revenue, delivered, pending, buckets, max };
  }, [orders]);

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Analytics</h1>

      <div className="grid grid-cols-2 gap-3">
        <CardStat
          label="Revenue"
          value={`MAD ${stats.revenue.toLocaleString()}`}
        />
        <CardStat label="Orders" value={`${stats.total}`} />
        <CardStat label="Delivered" value={`${stats.delivered}`} />
        <CardStat label="Pending" value={`${stats.pending}`} />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Revenue (last 6 months)</h2>
        <div className="space-y-2">
          {stats.buckets.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs">
                <span>{b.label}</span>
                <span>MAD {b.value.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-neutral-200 rounded">
                <div
                  className="h-2 bg-terracotta rounded"
                  style={{ width: `${(b.value / stats.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-sand p-3">
      <div className="text-xs text-ink/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
