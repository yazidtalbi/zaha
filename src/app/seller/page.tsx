"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Order = {
  id: string;
  created_at: string;
  qty: number;
  amount_mad: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  product_id: string | null;
  products?: {
    id: string;
    title: string;
    photos: string[] | null;
    shop_id: string;
  };
};

export default function SellerDashboardPage() {
  return (
    <RequireAuth>
      <OverviewInner />
    </RequireAuth>
  );
}

function OverviewInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, products:products(*)")
        .order("created_at", { ascending: false })
        .limit(10); // latest 10

      if (!error && data) setOrders(data as any[]);
      setLoading(false);
    })();
  }, []);

  const kpis = useMemo(() => {
    const gross = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + (o.amount_mad || 0), 0);

    const delivered = orders.filter((o) => o.status === "delivered").length;
    const pending = orders.filter((o) => o.status === "pending").length;

    return { gross, delivered, pending, total: orders.length };
  }, [orders]);

  function PreviewMyStoreButton() {
    const [shopId, setShopId] = useState<string | null>(null);

    useEffect(() => {
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("shops")
          .select("id")
          .eq("owner", user.id)
          .maybeSingle();
        if (data) setShopId(data.id);
      })();
    }, []);

    if (!shopId) return null;

    return (
      <Link
        href={`/shop/${shopId}`}
        className="rounded-full border px-4 py-2 text-sm bg-white hover:bg-sand transition"
      >
        Preview my store
      </Link>
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>

        {/* 👇 Preview my store button */}
        <PreviewMyStoreButton />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Gross sales"
          value={`MAD ${kpis.gross.toLocaleString()}`}
        />
        <KpiCard label="Orders" value={kpis.total.toString()} />
        <KpiCard label="Delivered" value={kpis.delivered.toString()} />
        <KpiCard label="Pending" value={kpis.pending.toString()} />
      </div>

      {/* Recent orders */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/seller/orders" className="text-sm underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="text-sm text-ink/70">Loading…</div>
        ) : !orders.length ? (
          <div className="text-sm text-ink/70">No orders yet.</div>
        ) : (
          <ul className="space-y-2">
            {orders.slice(0, 5).map((o) => {
              const img = o.products?.photos?.[0];
              return (
                <li
                  key={o.id}
                  className="rounded-xl border p-3 flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-md bg-neutral-100 overflow-hidden">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">
                      {o.products?.title ?? "Product"}
                    </div>
                    <div className="text-xs text-ink/70">
                      MAD {o.amount_mad} ·{" "}
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Link
                    href={`/seller/orders/${o.id}`}
                    className="rounded-full border px-3 py-1 text-xs"
                  >
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-sand p-3">
      <div className="text-xs text-ink/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
