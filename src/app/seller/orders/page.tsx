// app/seller/orders/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "sonner";

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

  // NEW
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

const STATUS: Order["status"][] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export default function SellerOrdersPage() {
  return (
    <RequireAuth>
      <OrdersInner />
    </RequireAuth>
  );
}

function OrdersInner() {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Order["status"]>("all");

  // load
  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(*)")
      .order("created_at", { ascending: false });

    if (!error) setRows((data as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("orders-seller-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // actions
  async function updateStatus(id: string, status: Order["status"]) {
    setBusyId(id);
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(`Status changed to ${status} ✅`);
  }

  const list = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter]
  );

  if (loading) return <main className="p-4">Loading…</main>;
  if (!rows.length)
    return <main className="p-4 text-sm text-ink/70">No orders yet.</main>;

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Orders</h1>
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
                      href={`/seller/orders/${o.id}`}
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

                  {/* Call / WhatsApp + address */}
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
                              `Salam! Your order for "${o.products?.title}" (MAD ${o.amount_mad}).`
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

                  {/* ——— Personalization ——— */}
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

                  {/* ——— Options ——— */}
                  {o.options ? (
                    <section className="mt-3">
                      <h4 className="text-xs font-semibold text-ink/70 mb-1">
                        Options
                      </h4>
                      <OptionsList options={o.options} />
                    </section>
                  ) : null}

                  {/* status controls */}
                  {/* <div className="mt-2 flex flex-wrap items-center gap-2">
                    {STATUS.map((s) => (
                      <button
                        key={s}
                        disabled={busyId === o.id}
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
                  </div> */}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
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

/* ==========================================
   OptionsList — robust renderer (array/object)
   ========================================== */
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
