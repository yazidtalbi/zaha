// app/orders/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

type Order = {
  id: string;
  created_at: string;
  qty: number;
  amount_mad: number;
  status: OrderStatus;
  city: string | null;
  phone: string | null;
  address: string | null;
  product_id: string | null;
  buyer?: string | null;

  // extras
  personalization?: string | null;
  options?: any | null;

  products?: {
    id: string;
    title: string;
    photos: string[] | null;
    price_mad: number;
    shop_id: string;
  } | null;
};

const STATUS: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export default function MyOrdersPage() {
  return (
    <RequireAuth>
      <OrdersInner />
    </RequireAuth>
  );
}

function OrdersInner() {
  const { push } = useToast();
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [uid, setUid] = useState<string | null>(null);

  // Load current user's orders (as buyer)
  async function load(_uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(*)")
      .eq("buyer", _uid)
      .order("created_at", { ascending: false });

    if (error) {
      push({
        title: "Failed to load your orders",
        desc: error.message ?? "Unknown error",
        variant: "error",
      });
      setRows([]);
    } else {
      setRows((data as any[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const _uid = data.user?.id ?? null;
      if (cancelled) return;

      setUid(_uid);
      if (_uid) await load(_uid);
      else setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [push]);

  // Realtime scoped to this buyer
  useEffect(() => {
    if (!uid) return;

    const ch = supabase
      .channel("orders-buyer-rt")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `buyer=eq.${uid}`,
        },
        () => load(uid)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  const list = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  if (loading) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">My orders</h1>
        <select
          className="rounded-xl border px-3 py-2 text-sm bg-paper"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </header>

      {!rows.length ? (
        <div className="text-sm text-ink/70">You don’t have orders yet.</div>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => {
            const img = o.products?.photos?.[0];
            return (
              <li
                key={o.id}
                className="rounded-xl bg-sand p-3 border border-black/5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-lg bg-white overflow-hidden shrink-0">
                    {img && (
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      {/* Only the title is clickable */}
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-medium truncate underline decoration-ink/30 hover:decoration-ink"
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

                    {/* Address summary (buyer view) */}
                    {(o.city || o.address) && (
                      <div className="text-xs text-ink/70 mt-1">
                        {o.city ? ` ${o.city}` : ""}{" "}
                        {o.address ? ` · ${o.address}` : ""}
                      </div>
                    )}

                    {/* Personalization */}
                    {o.personalization ? (
                      <section className="mt-3">
                        <h4 className="text-xs font-semibold text-ink/70 mb-1">
                          Personalization
                        </h4>
                        <div className="whitespace-pre-wrap text-sm rounded-lg border border-black/5 bg-white px-3 py-2">
                          {o.personalization}
                        </div>
                      </section>
                    ) : null}

                    {/* Options */}
                    {o.options ? (
                      <section className="mt-3">
                        <h4 className="text-xs font-semibold text-ink/70 mb-1">
                          Options
                        </h4>
                        <OptionsList options={o.options} />
                      </section>
                    ) : null}
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

function StatusBadge({ status }: { status: OrderStatus }) {
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

/* =========================================================
   OptionsList — robust renderer (array or object)
   ========================================================= */
function OptionsList({ options }: { options: any }) {
  if (Array.isArray(options)) {
    if (!options.length) return null;
    return (
      <ul className="text-sm rounded-lg border border-black/5 bg-white px-3 py-2 space-y-1">
        {options.map((opt: any, i: number) => {
          const group =
            opt.group ?? opt.name ?? opt.key ?? opt.title ?? "Option";
          const value = opt.value ?? opt.label ?? opt.choice ?? "";
          const price =
            opt.price_delta_mad != null ? ` (+${opt.price_delta_mad} MAD)` : "";
          return (
            <li key={i} className="flex items-start justify-between gap-4">
              <span className="text-ink/80">{group}</span>
              <span className="font-medium">
                {String(value)}
                <span className="ml-1 text-ink/60">{price}</span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (options && typeof options === "object") {
    const entries = Object.entries(options);
    if (!entries.length) return null;
    return (
      <ul className="text-sm rounded-lg border border-black/5 bg-white px-3 py-2 space-y-1">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-start justify-between gap-4">
            <span className="text-ink/80">{k}</span>
            <span className="font-medium">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="text-sm rounded-lg border border-black/5 bg-white px-3 py-2">
      {String(options)}
    </div>
  );
}
