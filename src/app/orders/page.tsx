"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(title, price_mad, photos)")
        .eq("buyer", user.id)
        .order("created_at", { ascending: false });
      if (!error) setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Your Orders</h1>

      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">No orders yet.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="block border rounded-xl p-3 hover:bg-neutral-50 transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={o.products?.photos?.[0] ?? "/placeholder.png"}
                  className="w-16 h-16 rounded-lg object-cover"
                  alt=""
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">
                      {o.products?.title}
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="text-sm text-neutral-600">
                    MAD {o.amount_mad} · Qty {o.qty}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "pending"
      ? "bg-yellow-200 text-yellow-900"
      : status === "confirmed"
      ? "bg-blue-200 text-blue-900"
      : status === "shipped"
      ? "bg-purple-200 text-purple-900"
      : status === "delivered"
      ? "bg-green-200 text-green-900"
      : "bg-rose-200 text-rose-900";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] ${color}`}>
      {status}
    </span>
  );
}
