"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast"; // ✅ import this

type Order = {
  id: string;
  created_at: string;
  qty: number;
  amount_mad: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  city: string | null;
  phone: string | null;
  address: string | null;
  product_id: string | null;
  products?: {
    id: string;
    title: string;
    photos: string[] | null;
    price_mad: number;
    shop_id: string;
  } | null;
};

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default function SellerOrdersPage() {
  return (
    <RequireAuth>
      <OrdersInner />
    </RequireAuth>
  );
}

function OrdersInner() {
  const { push } = useToast(); // ✅ define push from context
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`*, products:products(*)`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setOrders([]);
    } else {
      setOrders((data as any[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("orders-rt")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  async function updateStatus(id: string, status: Order["status"]) {
    const prev = orders;
    // optimistic UI
    setOrders((p) => p.map((o) => (o.id === id ? { ...o, status } : o)));

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      // rollback & error toast
      setOrders(prev);
      push({
        title: "Failed to update status",
        desc: error.message,
        variant: "error",
      });
      return;
    }
    push({
      title: `Status changed ✅`,
      desc: `Order set to “${status}”.`,
      variant: "success",
    });
  }

  function SellerSummary() {
    const [revenue, setRevenue] = useState(0);
    const [pending, setPending] = useState(0);
    const [total, setTotal] = useState(0);

    useEffect(() => {
      (async () => {
        // total orders (fast head-count)
        const { count: totalCount } = await supabase
          .from("orders")
          .select("*", { head: true, count: "exact" });
        setTotal(totalCount ?? 0);

        // pending count
        const { data: pendRows } = await supabase
          .from("orders")
          .select("count:count()")
          .eq("status", "pending");
        setPending(pendRows?.[0]?.count ?? 0);

        // delivered revenue (sum)
        const { data: revRow } = await supabase
          .from("orders")
          .select("sum:sum(amount_mad)")
          .eq("status", "delivered")
          .single();
        setRevenue(revRow?.sum ?? 0);
      })();
    }, []);

    return (
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border p-3">
          <div className="text-xs text-ink/60">Revenue</div>
          <div className="text-lg font-semibold">MAD {revenue}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-ink/60">Pending</div>
          <div className="text-lg font-semibold">{pending}</div>
        </div>
        <div className="rounded-xl border p-3">
          <div className="text-xs text-ink/60">Total orders</div>
          <div className="text-lg font-semibold">{total}</div>
        </div>
      </section>
    );
  }

  function KPI({
    title,
    value,
    note,
    loading,
  }: {
    title: string;
    value: string | number;
    note?: string;
    loading?: boolean;
  }) {
    return (
      <div className="rounded-xl border border-black/5 bg-sand p-3">
        <div className="text-xs text-ink/60">{title}</div>
        <div className="text-xl font-semibold mt-1">
          {loading ? "…" : value}
        </div>
        {note ? <div className="text-xs text-ink/60 mt-0.5">{note}</div> : null}
      </div>
    );
  }

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Orders </h1>

        <select
          className="rounded-xl border px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </header>
      {loading ? (
        <div className="text-sm text-ink/70">Loading…</div>
      ) : !filtered.length ? (
        <div className="text-sm text-ink/70">No orders found.</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((o) => {
            const img = Array.isArray(o.products?.photos)
              ? o.products?.photos[0]
              : undefined;
            return (
              <li
                key={o.id}
                className="rounded-xl bg-sand p-3 border border-black/5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg bg-white overflow-hidden shrink-0">
                    {img ? (
                      <img
                        src={img}
                        alt={o.products?.title ?? "Product"}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      {/* ✅ Title is now clickable */}
                      <Link
                        href={`/seller/orders/${o.id}`}
                        className="font-medium text-blue-600 hover:underline truncate"
                      >
                        {o.products?.title ?? "Product"}
                      </Link>
                      <StatusBadge status={o.status} />
                    </div>
                    <div className="text-sm text-ink/70">
                      MAD {o.amount_mad} · Qty {o.qty}
                    </div>
                    <div className="text-xs text-ink/60">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                    <div className="text-xs text-ink/70 mt-1">
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {o.phone && (
                          <>
                            <a className="underline" href={`tel:${o.phone}`}>
                              Call
                            </a>
                            <a
                              className="underline"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://wa.me/${o.phone.replace(
                                /\D/g,
                                ""
                              )}?text=${encodeURIComponent(
                                `Salam! Your order for "${o.products?.title}" (MAD ${o.amount_mad})`
                              )}`}
                            >
                              WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                      {o.city ? ` · ${o.city}` : ""}{" "}
                      {o.address ? ` · ${o.address}` : ""}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(o.id, s)}
                          className={`rounded-full px-3 py-1 text-xs border ${
                            o.status === s
                              ? "bg-terracotta text-white border-terracotta"
                              : "hover:bg-paper"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
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
