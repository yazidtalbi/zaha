// app/seller/orders/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "sonner";

// —— shadcn/ui bits ——
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Phone,
  MapPin,
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
  Search,
  Sparkles,
  CornerDownRight,
  ChevronDown,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

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

type RangeKey = "7d" | "30d" | "90d" | "all";
type SortKey = "new" | "old" | "amount_desc" | "amount_asc";

const MAIN_CLASS = "px-4 pt-4 pb-24 max-w-screen-sm mx-auto";

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

/* ───────────────── Option Chips (small pills) ───────────────── */
function OptionChips({ options }: { options: any }) {
  if (!options) return null;

  const pairs: { label: string; value: string }[] = [];

  if (Array.isArray(options)) {
    options.forEach((opt: any) => {
      const label = opt.group ?? opt.name ?? opt.key ?? opt.title ?? "";
      const value = opt.value ?? opt.label ?? opt.choice ?? "";
      if (label && value !== undefined)
        pairs.push({ label, value: String(value) });
    });
  } else if (typeof options === "object") {
    Object.entries(options).forEach(([k, v]) =>
      pairs.push({
        label: k,
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
      })
    );
  } else {
    return null;
  }

  if (!pairs.length) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {pairs.slice(0, 6).map((p, i) => (
        <span
          key={i}
          className="text-[11px] px-2 py-0.5 rounded-full bg-sand text-ink"
        >
          {p.label}: <span className="font-medium">{p.value}</span>
        </span>
      ))}
      {pairs.length > 6 && (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-sand border border-ink/10">
          +{pairs.length - 6}
        </span>
      )}
    </div>
  );
}

/* ───────────────── Header ───────────────── */
function OrdersHeaderCompact({
  counts,
  qLive,
  setQLive,
  onDebouncedQ,
  status,
  setStatus,
  range,
  setRange,
  sort,
  setSort,
  groupByProduct,
  setGroupByProduct,
}: {
  counts: {
    total: number;
    pending: number;
    confirmed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  qLive: string;
  setQLive: (v: string) => void;
  onDebouncedQ: (v: string) => void;
  status: "all" | Order["status"];
  setStatus: (v: "all" | Order["status"]) => void;
  range: RangeKey;
  setRange: (v: RangeKey) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
  groupByProduct: boolean;
  setGroupByProduct: (v: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.isContentEditable;
      if (!typing && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pill = (active: boolean) =>
    [
      "px-4 h-8 rounded-full text-sm inline-flex items-center gap-2 shrink-0",
      active ? "bg-terracotta text-white" : "bg-white text-ink/90 border",
    ].join(" ");

  return (
    <header className="mb-3">
      <div className="mb-6 relative">
        <DashboardHeader
          title="Orders"
          subtitle="Manage your received orders"
          withDivider={false}
          withBackButton={false}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink/50" />
        <Input
          ref={inputRef}
          value={qLive}
          onChange={(e) => {
            setQLive(e.target.value);
            onDebouncedQ(e.target.value);
          }}
          placeholder="Search ID, product, phone, city…"
          className="h-14 pl-12 pr-12 text-base rounded-full border-0 bg-neutral-100"
        />
        {!!qLive && (
          <button
            aria-label="Clear"
            onClick={() => {
              setQLive("");
              onDebouncedQ("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full hover:bg-neutral-50d text-ink/60"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ROW 1: Status | Sort | Range …… [Group by product toggle] */}
      <div className="mt-3 -mx-4 px-4">
        <div className="flex items-center gap-2">
          {/* Status */}
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger
              className={pill(false) + " w-auto inline-flex shadow-none"}
            >
              <SelectValue>
                {status === "all"
                  ? "All"
                  : status[0].toUpperCase() + status.slice(1)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl min-w-[200px] py-1">
              {[
                {
                  key: "all",
                  label: "All",
                  count: counts.total,
                  color: "bg-ink/30",
                },
                {
                  key: "pending",
                  label: "Pending",
                  count: counts.pending,
                  color: "bg-yellow-400",
                },
                {
                  key: "confirmed",
                  label: "Confirmed",
                  count: counts.confirmed,
                  color: "bg-blue-500",
                },
                {
                  key: "shipped",
                  label: "Shipped",
                  count: counts.shipped,
                  color: "bg-purple-500",
                },
                {
                  key: "delivered",
                  label: "Delivered",
                  count: counts.delivered,
                  color: "bg-green-500",
                },
                {
                  key: "cancelled",
                  label: "Cancelled",
                  count: counts.cancelled,
                  color: "bg-rose-500",
                },
              ].map(({ key, label, count, color }) => (
                <SelectItem key={key} value={key} className="py-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${color}`}
                    />
                    <span className="flex-1 text-sm">{label}</span>
                    <span className="text-xs text-ink/60">{count}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Vertical separator */}
          <div className="mx-1 h-6 w-px bg-black/30 border-l" />

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              className={pill(false) + " w-auto inline-flex shadow-none"}
            >
              <SelectValue>
                {sort === "new"
                  ? "Newest"
                  : sort === "old"
                    ? "Oldest"
                    : sort === "amount_desc"
                      ? "Amount ↓"
                      : "Amount ↑"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl min-w-[180px] py-1">
              <SelectItem value="new">Newest</SelectItem>
              <SelectItem value="old">Oldest</SelectItem>
              <SelectItem value="amount_desc">Amount ↓</SelectItem>
              <SelectItem value="amount_asc">Amount ↑</SelectItem>
            </SelectContent>
          </Select>

          {/* Range */}
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger
              className={pill(false) + " w-auto inline-flex shadow-none"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink/70">{counts.total} total</p>
        </div>

        {/* Group by product toggle */}
        <button
          className={pill(groupByProduct)}
          onClick={() => setGroupByProduct(!groupByProduct)}
          aria-pressed={groupByProduct}
        >
          <Sparkles className="h-4 w-4" />
          Group by: Product
        </button>
      </div>
    </header>
  );
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

  const [groupByProduct, setGroupByProduct] = useState(false);

  // track collapsible groups (open/closed)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // search debounced (surfaced in header)
  const [qLive, setQLive] = useState("");
  const doDebouncedQ = useMemo(
    () =>
      debounce((v: string) => {
        setQ(v);
        setPage(0);
      }, 250),
    []
  );

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

  // bulk helpers kept (bar hidden in grouped)
  function exportCSV(onlySelected = false) {
    const data = (
      onlySelected ? rows.filter((r) => selected.has(r.id)) : filteredVisible
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
    const data = filteredVisible.map((o) => {
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

  /* ────────────── derived filters ────────────── */
  const dateFilter = useMemo(() => {
    if (range === "all") return null as null | { from: Date; to: Date };
    const to = new Date();
    const len = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const from = new Date();
    from.setDate(to.getDate() - len);
    return { from, to };
  }, [range]);

  // Base list for counts: apply date + search (NO status)
  const baseNoStatus = useMemo(() => {
    let xs = rows.slice();

    if (dateFilter) {
      xs = xs.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= dateFilter.from.getTime() && t <= dateFilter.to.getTime();
      });
    }

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      xs = xs.filter((r) => {
        const title = (r.products?.title ?? "").toLowerCase();
        const id = (r.id ?? "").toLowerCase();
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

    return xs;
  }, [rows, dateFilter, q]);

  // Counts for the dropdown (stable across selected status)
  const counts = useMemo(() => {
    return {
      total: baseNoStatus.length,
      pending: baseNoStatus.filter((x) => x.status === "pending").length,
      confirmed: baseNoStatus.filter((x) => x.status === "confirmed").length,
      shipped: baseNoStatus.filter((x) => x.status === "shipped").length,
      delivered: baseNoStatus.filter((x) => x.status === "delivered").length,
      cancelled: baseNoStatus.filter((x) => x.status === "cancelled").length,
    };
  }, [baseNoStatus]);

  // Visible list — now apply status + sort on top of baseNoStatus
  const filteredVisible = useMemo(() => {
    let xs = baseNoStatus.slice();

    if (status !== "all") {
      xs = xs.filter((r) => r.status === status);
    }

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
  }, [baseNoStatus, status, sort]);

  const paged = useMemo(() => {
    const end = (page + 1) * PAGE_SIZE;
    return filteredVisible.slice(0, end);
  }, [filteredVisible, page]);

  /* ────────────── grouping ────────────── */
  type ProductGroup = {
    productId: string;
    title: string;
    thumb?: string;
    orders: Order[];
    totalQty: number;
    totalAmount: number;
  };

  const groupedByProduct = useMemo<ProductGroup[]>(() => {
    const map = new Map<string, ProductGroup>();
    for (const o of filteredVisible) {
      const productId = o.products?.id ?? o.product_id ?? "unknown";
      const g = map.get(productId) ?? {
        productId,
        title: o.products?.title ?? "—",
        thumb: o.products?.photos?.[0],
        orders: [],
        totalQty: 0,
        totalAmount: 0,
      };
      g.orders.push(o);
      g.totalQty += o.qty || 0;
      g.totalAmount += o.amount_mad || 0;
      map.set(productId, g);
    }
    return Array.from(map.values()).sort(
      (a, b) => b.orders.length - a.orders.length
    );
  }, [filteredVisible]);

  /* ────────────── render ────────────── */
  if (loading) {
    return (
      <main className={MAIN_CLASS}>
        <OrdersHeaderCompact
          counts={{
            total: 0,
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
          }}
          qLive={qLive}
          setQLive={setQLive}
          onDebouncedQ={doDebouncedQ}
          status={status}
          setStatus={setStatus}
          range={range}
          setRange={setRange}
          sort={sort}
          setSort={setSort}
          groupByProduct={groupByProduct}
          setGroupByProduct={setGroupByProduct}
        />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-16 h-16 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!rows.length) {
    return (
      <main className={MAIN_CLASS}>
        <OrdersHeaderCompact
          counts={{
            total: 0,
            pending: 0,
            confirmed: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0,
          }}
          qLive={qLive}
          setQLive={setQLive}
          onDebouncedQ={doDebouncedQ}
          status={status}
          setStatus={setStatus}
          range={range}
          setRange={setRange}
          sort={sort}
          setSort={setSort}
          groupByProduct={groupByProduct}
          setGroupByProduct={setGroupByProduct}
        />
        <div className="rounded-2xl border bg-neutral-50 p-6 text-center">
          <div className="text-sm text-ink/70">No orders yet.</div>
        </div>
      </main>
    );
  }

  return (
    <main className={MAIN_CLASS}>
      <OrdersHeaderCompact
        counts={counts}
        qLive={qLive}
        setQLive={setQLive}
        onDebouncedQ={doDebouncedQ}
        status={status}
        setStatus={setStatus}
        range={range}
        setRange={setRange}
        sort={sort}
        setSort={setSort}
        groupByProduct={groupByProduct}
        setGroupByProduct={setGroupByProduct}
      />

      {/* Orders list */}
      {groupByProduct ? (
        /* ——— GROUPED RENDER (collapsible) ——— */
        <ul className="mt-3 space-y-3">
          {groupedByProduct.map((g) => {
            const isOpen = openGroups[g.productId] ?? true;
            return (
              <li
                key={g.productId}
                className="rounded-2xl border bg-white overflow-hidden"
              >
                {/* Group header (click to toggle) */}
                <button
                  className="w-full p-3 flex items-center gap-3 text-left"
                  onClick={() =>
                    setOpenGroups((s) => ({
                      ...s,
                      [g.productId]: !(s[g.productId] ?? true),
                    }))
                  }
                >
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                    {g.thumb ? (
                      <img
                        src={g.thumb}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate text-sm">
                        {g.title}
                      </h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100">
                        {g.orders.length} order{g.orders.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="text-xs text-ink/70 mt-0.5">
                      Total qty {g.totalQty} · MAD {g.totalAmount}
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Orders in group */}
                {isOpen && (
                  <ul className="px-3 pb-3 space-y-2">
                    {g.orders.map((o) => {
                      const img = o.products?.photos?.[0];
                      return (
                        <li
                          key={o.id}
                          className="rounded-xl bg-white p-3 border border-black/5"
                        >
                          <div className="flex items-start gap-3">
                            {/* Corner icon instead of checkbox */}
                            <div className="pt-1 text-ink/50 shrink-0">
                              <CornerDownRight className="h-4 w-4" />
                            </div>

                            <div className="w-10 h-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
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
                                <Link
                                  href={`/seller/orders/${o.id}`}
                                  className="text-xs font-medium truncate underline decoration-ink/30 hover:decoration-ink"
                                >
                                  #{o.id.slice(0, 6)}
                                </Link>
                                <StatusBadge status={o.status} />
                              </div>

                              <div className="mt-0.5 text-xs text-ink/70 flex flex-wrap items-center gap-2">
                                <span className="font-medium">
                                  MAD {o.amount_mad}
                                </span>
                                <span>·</span>
                                <span>Qty {o.qty}</span>
                                <span>·</span>
                                <span>
                                  {new Date(o.created_at).toLocaleString()}
                                </span>
                              </div>

                              {(o.address || o.city) && (
                                <div className="mt-1 text-[11px] text-ink/70 flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1 min-w-0">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="truncate">
                                      {(o.address ?? "") +
                                        (o.city ? `, ${o.city}` : "")}
                                    </span>
                                  </span>
                                  <button
                                    onClick={async () => {
                                      await navigator.clipboard.writeText(
                                        `${o.address ?? ""}${
                                          o.city ? ", " + o.city : ""
                                        }`
                                      );
                                      toast.success("Address copied");
                                    }}
                                    className="underline shrink-0 inline-flex items-center gap-1"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copy
                                  </button>
                                  {o.address && (
                                    <a
                                      className="underline shrink-0"
                                      target="_blank"
                                      rel="noreferrer"
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        `${o.address} ${o.city ?? ""}`
                                      )}`}
                                    >
                                      Open map
                                    </a>
                                  )}
                                </div>
                              )}

                              {(o.personalization || o.options) && (
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  {o.personalization && (
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-400/10 font-semibold text-orange-600">
                                      With personalization
                                    </span>
                                  )}
                                  <OptionChips options={o.options} />
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        /* ——— FLAT RENDER (unified with Products list style) ——— */
        <ul className="mt-3 space-y-2">
          {paged.map((o) => {
            const img = o.products?.photos?.[0];
            const hasAddress = o.address || o.city;
            const hasExtras = o.personalization || o.options;

            return (
              <Link key={o.id} href={`/seller/orders/${o.id}`}>
                <li className="rounded-2xl bg-white p-3 border border-black/5">
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl bg-neutral-100 overflow-hidden shrink-0">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-[10px] text-ink/40">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      {/* Top row: ID + Status */}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] text-ink/60 font-medium">
                          #{o.id.slice(0, 6)}
                        </span>
                        <StatusBadge status={o.status} />
                      </div>

                      {/* Title */}
                      <h4
                        className="mt-0.5 text-[15px] font-semibold truncate"
                        title={o.products?.title ?? "Order"}
                      >
                        {o.products?.title ?? "Order"}
                      </h4>

                      {/* Meta row (like Products list) */}
                      <div className="mt-0.5 text-xs text-ink/70 flex flex-wrap items-center gap-1">
                        <span className="font-medium">MAD {o.amount_mad}</span>
                        <span>·</span>
                        <span>Qty {o.qty}</span>
                        <span>·</span>
                        <span>{new Date(o.created_at).toLocaleString()}</span>
                      </div>

                      {/* Address, if any */}
                      {hasAddress && (
                        <div className="mt-1 text-[11px] text-ink/70 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {(o.address ?? "") + (o.city ? `, ${o.city}` : "")}
                          </span>
                        </div>
                      )}

                      {/* Extras: personalization + options as pills */}
                      {hasExtras && (
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {o.personalization && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-400/10 font-semibold text-orange-600">
                              With personalization
                            </span>
                          )}
                          <OptionChips options={o.options} />
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              </Link>
            );
          })}
        </ul>
      )}

      {/* Pagination (hidden in grouped mode) */}
      {!groupByProduct && (
        <div className="flex items-center justify-between pt-3">
          <Button
            variant="outline"
            className="rounded-full h-8 px-3 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft size={16} className="mr-1" /> Newer
          </Button>
          <div className="text-sm text-ink/70">
            Showing {Math.min((page + 1) * PAGE_SIZE, filteredVisible.length)}{" "}
            of {filteredVisible.length}
          </div>
          <Button
            variant="outline"
            className="rounded-full h-8 px-3 disabled:opacity-50"
            onClick={() =>
              setPage((p) =>
                (p + 1) * PAGE_SIZE < filteredVisible.length ? p + 1 : p
              )
            }
            disabled={(page + 1) * PAGE_SIZE >= filteredVisible.length}
          >
            Older <ChevronRight size={16} className="ml-1" />
          </Button>
        </div>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const cls =
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
    <Badge
      variant="secondary"
      className={`text-[11px] rounded-full ${cls} capitalize`}
    >
      {status}
    </Badge>
  );
}

/* (kept for possible future detailed view – currently unused) */
function OptionsList({ options }: { options: any }) {
  if (Array.isArray(options)) {
    if (!options.length) return null;
    return (
      <ul className="text-sm rounded-lg border border-black/5 bg-paper px-3 py-2 divide-y divide-dashed divide-black/10">
        {options.map((opt: any, i: number) => {
          const group =
            opt.group ?? opt.name ?? opt.key ?? opt.title ?? "Option";
          const value = opt.value ?? opt.label ?? opt.choice ?? "";
          const price =
            opt.price_delta_mad != null ? ` (+${opt.price_delta_mad} MAD)` : "";
          return (
            <li
              key={i}
              className="flex items-start justify-between gap-4 py-2 first:pt-0 last:pb-0"
            >
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

function ActionMenu({
  status,
  busy,
  onChange,
}: {
  status: Order["status"];
  busy: boolean;
  onChange: (next: Order["status"]) => void;
}) {
  return (
    <div className="relative">
      <details className="group">
        <summary className="cursor-pointer list-none flex items-center gap-1 text-xs text-ink/70 hover:text-ink">
          <span>⋯</span>
        </summary>

        <div className="absolute right-0 mt-2 w-40 rounded-xl border bg-white shadow-lg p-1 text-sm z-50">
          {[
            { key: "confirmed", label: "Confirm", icon: Check },
            { key: "shipped", label: "Ship", icon: Truck },
            { key: "delivered", label: "Deliver", icon: Package },
            { key: "cancelled", label: "Cancel", icon: XCircle },
          ].map(({ key, label, icon: Icon }) => {
            const can = canTransition(status, key as Order["status"]);
            return (
              <button
                key={key}
                disabled={busy || !can}
                onClick={() => onChange(key as Order["status"])}
                className={[
                  "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                  can ? "hover:bg-neutral-50" : "opacity-40 cursor-not-allowed",
                ].join(" ")}
              >
                <Icon size={14} />
                {label}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}
