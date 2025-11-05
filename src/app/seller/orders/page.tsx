// app/seller/orders/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "sonner";
import {
  Phone,
  MapPin,
  Search as SearchIcon,
  Download,
  Check,
  Truck,
  Package,
  XCircle,
  Copy,
  Printer,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from "lucide-react";

/* ───────────────── Types ───────────────── */
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
  personalization?: string | null;
  options?: any | null;
  products?: {
    id: string;
    title: string;
    photos: string[] | null;
    price_mad: number;
    shop_id: string;
    stock?: number | null;
  } | null;
};

const STATUS: Order["status"][] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

type RangeKey = "7d" | "30d" | "90d" | "all";
type SortKey = "new" | "old" | "amount_desc" | "amount_asc";

/* ───────────────── Utils ───────────────── */
function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const head = cols.join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => {
          const v = r[c] ?? "";
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(",")
    )
    .join("\n");
  return head + "\n" + body;
}

const debounce = <F extends (...a: any[]) => void>(fn: F, ms = 300) => {
  let t: any;
  return (...a: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
};

function canTransition(from: Order["status"], to: Order["status"]) {
  const allowed: Record<Order["status"], Order["status"][]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

/* ───────────────── Page ───────────────── */
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

  // filters / UI state
  const [status, setStatus] = useState<"all" | Order["status"]>("all");
  const [range, setRange] = useState<RangeKey>("30d");
  const [sort, setSort] = useState<SortKey>("new");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  // load
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(*)")
      .order("created_at", { ascending: false });

    if (!error) setRows((data as any[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("orders-seller-rt-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  // actions
  async function updateStatus(id: string, next: Order["status"]) {
    setBusyId(id);
    const prev = rows.find((r) => r.id === id)?.status;
    // optimistic
    setRows((xs) => xs.map((o) => (o.id === id ? { ...o, status: next } : o)));
    const { error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      // revert
      setRows((xs) =>
        xs.map((o) => (o.id === id ? { ...o, status: prev! } : o))
      );
      toast.error(error.message);
      return;
    }
    toast.success(`Status changed to ${next} ✅`);
  }

  // bulk actions
  async function bulkUpdate(next: Order["status"]) {
    if (!selected.size) return;
    const ids = Array.from(selected);
    // optimistic
    setRows((xs) =>
      xs.map((o) => (selected.has(o.id) ? { ...o, status: next } : o))
    );
    setSelected(new Set());
    const { error } = await supabase
      .from("orders")
      .update({ status: next })
      .in("id", ids);
    if (error) {
      toast.error(error.message);
      load();
      return;
    }
    toast.success(`Updated ${ids.length} orders → ${next}`);
  }

  function exportCSV(onlySelected = false) {
    const data = (
      onlySelected ? rows.filter((r) => selected.has(r.id)) : filtered
    ).map((o) => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      amount_mad: o.amount_mad,
      qty: o.qty,
      product_title: o.products?.title ?? "",
      phone: o.phone ?? "",
      city: o.city ?? "",
      address: o.address ?? "",
    }));
    if (!data.length) {
      toast.info("Nothing to export.");
      return;
    }
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaha_orders_${onlySelected ? "selected" : "filtered"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPickList() {
    const data = (
      selected.size ? rows.filter((r) => selected.has(r.id)) : filtered
    ).map((o) => {
      const opts =
        o.options && typeof o.options === "object"
          ? JSON.stringify(o.options)
          : String(o.options ?? "");
      return `#${o.id}
Product: ${o.products?.title ?? "-"}
Qty: ${o.qty}
Amount: MAD ${o.amount_mad}
Address: ${o.address ?? ""}, ${o.city ?? ""}
Phone: ${o.phone ?? ""}
Options: ${opts}
---`;
    });
    if (!data.length) {
      toast.info("Nothing to print.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(
      `<pre style="font:13px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; white-space:pre-wrap; padding:16px;">${data.join(
        "\n\n"
      )}</pre>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  // search debounced
  const [qLive, setQLive] = useState("");
  const doDebouncedQ = useMemo(
    () =>
      debounce((v: string) => {
        setQ(v);
        setPage(0);
      }, 250),
    []
  );

  /* ────────────── derived filters ────────────── */
  const dateFilter = useMemo(() => {
    if (range === "all") return null as null | { from: Date; to: Date };
    const to = new Date();
    const len = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const from = new Date();
    from.setDate(to.getDate() - len);
    return { from, to };
  }, [range]);

  const filtered = useMemo(() => {
    let xs = rows.slice();

    if (status !== "all") {
      xs = xs.filter((r) => r.status === status);
    }

    if (dateFilter) {
      xs = xs.filter((r) => {
        const d = new Date(r.created_at).getTime();
        return d >= dateFilter.from.getTime() && d <= dateFilter.to.getTime();
      });
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      xs = xs.filter((r) => {
        const title = r.products?.title?.toLowerCase() ?? "";
        const id = r.id.toLowerCase();
        const phone = (r.phone ?? "").toLowerCase();
        const city = (r.city ?? "").toLowerCase();
        return (
          title.includes(needle) ||
          id.includes(needle) ||
          phone.includes(needle) ||
          city.includes(needle)
        );
      });
    }

    // sort
    xs.sort((a, b) => {
      if (sort === "new")
        return +new Date(b.created_at) - +new Date(a.created_at);
      if (sort === "old")
        return +new Date(a.created_at) - +new Date(b.created_at);
      if (sort === "amount_desc")
        return (b.amount_mad ?? 0) - (a.amount_mad ?? 0);
      if (sort === "amount_asc")
        return (a.amount_mad ?? 0) - (b.amount_mad ?? 0);
      return 0;
    });

    return xs;
  }, [rows, status, dateFilter, q, sort]);

  const paged = useMemo(() => {
    const end = (page + 1) * PAGE_SIZE;
    return filtered.slice(0, end);
  }, [filtered, page]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      paged.forEach((o) => {
        if (next.has(o.id)) next.delete(o.id);
        else next.add(o.id);
      });
      return next;
    });
  }

  /* ────────────── render ────────────── */
  if (loading) return <main className="p-4">Loading…</main>;
  if (!rows.length)
    return <main className="p-4 text-sm text-ink/70">No orders yet.</main>;

  const selectedCount = selected.size;

  return (
    <main className="p-4 space-y-4">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-40 -mx-4 px-4 py-3 bg-paper/95 backdrop-blur border-b">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(["all", ...STATUS] as const).map((s) => {
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(0);
                }}
                className={[
                  "px-3 py-1.5 rounded-full border text-sm whitespace-nowrap",
                  active
                    ? "bg-terracotta text-white border-terracotta"
                    : "bg-white hover:bg-sand",
                ].join(" ")}
              >
                {s}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            {/* Date range */}
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value as RangeKey);
                setPage(0);
              }}
              className="rounded-full border bg-white text-sm px-3 py-1.5"
            >
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
              <option value="90d">Last 90d</option>
              <option value="all">All time</option>
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setPage(0);
              }}
              className="rounded-full border bg-white text-sm px-3 py-1.5"
            >
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
              <option value="amount_desc">Amount ↓</option>
              <option value="amount_asc">Amount ↑</option>
            </select>

            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-ink/60" />
              <input
                defaultValue={qLive}
                onChange={(e) => {
                  setQLive(e.target.value);
                  doDebouncedQ(e.target.value);
                }}
                placeholder="Search ID, product, phone, city…"
                className="w-[220px] rounded-full border bg-white pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Bulk bar */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={toggleSelectVisible}
            className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm"
          >
            {selectedCount ? "Toggle visible selection" : "Select visible"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => exportCSV(false)}
              className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm inline-flex items-center gap-2"
            >
              <Download size={14} />
              Export filtered
            </button>
            <button
              onClick={() => exportCSV(true)}
              className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
              disabled={!selectedCount}
            >
              <Download size={14} />
              Export selected ({selectedCount})
            </button>
            <button
              onClick={printPickList}
              className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
              disabled={!selectedCount && !paged.length}
            >
              <Printer size={14} />
              Print pick list
            </button>
          </div>
        </div>
      </div>

      {/* Orders list */}
      <ul className="space-y-3">
        {paged.map((o) => {
          const img = o.products?.photos?.[0];
          const isSelected = selected.has(o.id);
          return (
            <li
              key={o.id}
              className={[
                "rounded-xl bg-white p-3 border transition-shadow",
                isSelected ? "ring-2 ring-terracotta/50" : "border-black/5",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <label className="pt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(o.id)}
                    className="accent-terracotta h-4 w-4"
                  />
                </label>

                <div className="w-16 h-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    {/* Only the title is clickable */}
                    <Link
                      href={`/seller/orders/${o.id}`}
                      className="font-medium truncate underline decoration-ink/30 hover:decoration-ink"
                      title={o.products?.title ?? "Product"}
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

                  {/* Contact row */}
                  <div className="text-xs text-ink/70 mt-2 flex flex-wrap items-center gap-2">
                    {o.phone && (
                      <>
                        <a
                          className="inline-flex items-center gap-1 underline"
                          href={`tel:${o.phone}`}
                        >
                          <Phone size={12} /> Call
                        </a>
                        <a
                          className="inline-flex items-center gap-1 underline"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://wa.me/${o.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                            `Salam! Your order for "${o.products?.title}" (MAD ${o.amount_mad}).`
                          )}`}
                        >
                          <MessageSquare size={12} /> WhatsApp
                        </a>
                      </>
                    )}
                    {o.address && (
                      <>
                        <span className="opacity-50">·</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {o.city ?? ""}
                        </span>
                        <button
                          onClick={async () => {
                            await navigator.clipboard.writeText(
                              `${o.address}${o.city ? ", " + o.city : ""}`
                            );
                            toast.success("Address copied");
                          }}
                          className="inline-flex items-center gap-1 underline"
                        >
                          <Copy size={12} /> Copy
                        </button>
                        {o.address && (
                          <a
                            className="underline"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${o.address} ${o.city ?? ""}`
                            )}`}
                          >
                            Open map
                          </a>
                        )}
                      </>
                    )}
                  </div>

                  {/* Personalization */}
                  {o.personalization ? (
                    <section className="mt-3">
                      <h4 className="text-xs font-semibold text-ink/70 mb-1">
                        Personalization
                      </h4>
                      <div className="whitespace-pre-wrap text-sm rounded-lg border border-black/5 bg-paper px-3 py-2">
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

                  {/* Status controls */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(
                      [
                        { key: "confirmed", label: "Confirm", icon: Check },
                        { key: "shipped", label: "Ship", icon: Truck },
                        { key: "delivered", label: "Deliver", icon: Package },
                        { key: "cancelled", label: "Cancel", icon: XCircle },
                      ] as const
                    ).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        disabled={
                          busyId === o.id || !canTransition(o.status, key)
                        }
                        onClick={() => updateStatus(o.id, key)}
                        className={[
                          "rounded-full border px-3 py-1 text-xs inline-flex items-center gap-1",
                          canTransition(o.status, key)
                            ? "bg-white hover:bg-sand"
                            : "bg-white opacity-40 cursor-not-allowed",
                        ].join(" ")}
                        title={
                          canTransition(o.status, key)
                            ? ""
                            : "Not available from current status"
                        }
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2">
        <button
          className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          <ChevronLeft size={16} /> Newer
        </button>
        <div className="text-sm text-ink/70">
          Showing {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
          {filtered.length}
        </div>
        <button
          className="rounded-full border bg-white hover:bg-sand px-3 py-1.5 text-sm inline-flex items-center gap-2 disabled:opacity-50"
          onClick={() =>
            setPage((p) => ((p + 1) * PAGE_SIZE < filtered.length ? p + 1 : p))
          }
          disabled={(page + 1) * PAGE_SIZE >= filtered.length}
        >
          Older <ChevronRight size={16} />
        </button>
      </div>
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
      <ul className="text-sm rounded-lg border border-black/5 bg-paper px-3 py-2 space-y-1">
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
      <ul className="text-sm rounded-lg border border-black/5 bg-paper px-3 py-2 space-y-1">
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
    <div className="text-sm rounded-lg border border-black/5 bg-paper px-3 py-2">
      {String(options)}
    </div>
  );
}
