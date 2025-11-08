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

  // Load current user's orders
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

  // Realtime sync
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
    return () => supabase.removeChannel(ch);
  }, [uid]);

  const list = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  if (loading)
    return (
      <main className="p-8 text-center text-ink/60 animate-pulse">
        Loading your orders…
      </main>
    );

  return (
    <main className="max-w-4xl mx-auto px-5 py-6 md:p-8 space-y-6 mb-10">
      {/* Header */}
      <header className="flex items-center justify-between      pb-3">
        <h1 className="text-2xl font-semibold text-ink">My Orders</h1>
        <select
          className="rounded-xl border px-3 py-2 text-sm bg-white      focus:outline-none focus:ring-1 focus:ring-ink/20"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </header>

      {/* No orders */}
      {!rows.length ? (
        <div className="rounded-2xl border bg-white      p-6 text-center text-ink/70">
          You don’t have any orders yet.
          <div className="mt-3">
            <Link
              href="/"
              className="text-sm underline text-ink/60 hover:text-ink"
            >
              Browse products
            </Link>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {list.map((o) => {
            const img = o.products?.photos?.[0];
            return (
              <li
                key={o.id}
                className="rounded-2xl border bg-white     transition-all p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="w-20 h-20 rounded-lg bg-sand overflow-hidden shrink-0">
                    {img ? (
                      <img
                        src={img}
                        alt={o.products?.title ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-ink/40">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-medium text-ink underline decoration-ink/20 hover:decoration-ink"
                      >
                        {o.products?.title ?? "Product"}
                      </Link>
                      <StatusBadge status={o.status} />
                    </div>

                    <div className="text-sm text-ink/70">
                      MAD {o.amount_mad.toFixed(2)} · Qty {o.qty}
                    </div>
                    <div className="text-xs text-ink/60">
                      {new Date(o.created_at).toLocaleString()}
                    </div>

                    {(o.city || o.address) && (
                      <div className="text-xs text-ink/70 mt-1">
                        {o.city && <span>{o.city}</span>}
                        {o.address && <span> · {o.address}</span>}
                      </div>
                    )}

                    {o.personalization && (
                      <section className="mt-3">
                        <h4 className="text-xs font-semibold text-ink/70 mb-1">
                          Personalization
                        </h4>
                        <div className="whitespace-pre-wrap text-sm rounded-lg border border-neutral-200 bg-sand/30 px-3 py-2">
                          {o.personalization}
                        </div>
                      </section>
                    )}

                    {o.options && Object.keys(o.options).length > 0 && (
                      <section className="mt-3">
                        <h4 className="text-xs font-semibold text-ink/70 mb-1">
                          Options
                        </h4>
                        <OptionsList options={o.options} />
                      </section>
                    )}
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

/* ===========================================
   Status Badge
   =========================================== */
function StatusBadge({ status }: { status: OrderStatus }) {
  const map = {
    pending: "bg-amber-100 text-amber-900 border border-amber-200",
    confirmed: "bg-blue-100 text-blue-900 border     lue-200",
    shipped: "bg-indigo-100 text-indigo-900 border border-indigo-200",
    delivered: "bg-green-100 text-green-900 border border-green-200",
    cancelled: "bg-rose-100 text-rose-900 border border-rose-200",
  } as const;

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status]} capitalize`}
    >
      {status}
    </span>
  );
}

/* ===========================================
   Options List — flexible renderer
   =========================================== */
function OptionsList({ options }: { options: any }) {
  if (Array.isArray(options)) {
    if (!options.length) return null;
    return (
      <ul className="text-sm rounded-lg border border-neutral-200 bg-sand/30 px-3 py-2 space-y-1">
        {options.map((opt: any, i: number) => {
          const group =
            opt.group ?? opt.name ?? opt.key ?? opt.title ?? "Option";
          const value = opt.value ?? opt.label ?? opt.choice ?? "";
          const price =
            opt.price_delta_mad != null ? ` (+${opt.price_delta_mad} MAD)` : "";
          return (
            <li key={i} className="flex items-start justify-between gap-4">
              <span className="text-ink/70">{group}</span>
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
      <ul className="text-sm rounded-lg border border-neutral-200 bg-sand/30 px-3 py-2 space-y-1">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-start justify-between gap-4">
            <span className="text-ink/70">{k}</span>
            <span className="font-medium">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="text-sm rounded-lg border border-neutral-200 bg-sand/30 px-3 py-2">
      {String(options)}
    </div>
  );
}
