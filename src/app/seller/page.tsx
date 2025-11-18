// app/seller/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useRequireShop } from "@/hooks/useRequireShop";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import {
  Settings,
  Eye,
  Plus,
  Package,
  ClipboardList,
  ChevronRight,
  Download,
  Bell,
  Store,
  Share2,
  Search as SearchIcon,
  Truck,
  ArrowLeft,
  MapPin,
  Star,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardHeader from "@/components/DashboardHeader";
import { Button } from "@/components/ui/button";

/* ---------------- Types (defensive/optional) ---------------- */
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
    stock?: number | null; // optional
  };
};

type Shop = {
  id: string;
  title?: string | null;
  is_verified?: boolean | null;
  avatar_url?: string | null;
  slug?: string | null;
  banner_url?: string | null;
  cover_urls?: string[] | null;
  payout_enabled?: boolean | null;
  is_active?: boolean | null;
  owner?: string;
  city?: string | null;
  avg_rating?: number | null;
  rating_count?: number | null;
  years_on_zaha?: number | null;
  open_for_commissions?: boolean | null;
};

type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
};

type RangeKey = "7d" | "30d" | "90d" | "all";

/* ---------------- Small utils ---------------- */
const fmtDate = (s: string) => {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const pctDelta = (curr: number, prev: number) => {
  if (!prev && !curr) return 0;
  if (!prev) return 100;
  return ((curr - prev) / prev) * 100;
};
const toCSV = (rows: Record<string, any>[]) => {
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
};

/* ---------------- UI bits ---------------- */
function StatusPill({ s }: { s: Order["status"] }) {
  const map: Record<Order["status"], string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  const label = s[0].toUpperCase() + s.slice(1);
  return (
    <span className={`px-2 py-0.5 text-xs rounded-md ${map[s]}`}>{label}</span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  positiveIsGood = true,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  delta?: number;
  positiveIsGood?: boolean;
  icon: any;
  isLoading?: boolean;
}) {
  const isUp = (delta ?? 0) >= 0;
  const tone =
    delta === undefined
      ? ""
      : isUp === positiveIsGood
        ? "text-green-700"
        : "text-red-700";
  const bg =
    delta === undefined
      ? "bg-white"
      : isUp === positiveIsGood
        ? "bg-green-50"
        : "bg-red-50";

  const showDelta = delta !== undefined && !isLoading;

  return (
    <div className="rounded-xl bg-neutral-100 px-3 py-3 items-center gap-3 block">
      <div className="text-xs text-ink/70">{label}</div>

      {isLoading ? (
        <div className="mt-1 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-ink/60" />
          <span className="text-xs text-ink/60">Loading…</span>
        </div>
      ) : (
        <>
          <div className="text-lg font-semibold truncate">{value}</div>
          {showDelta && (
            <div
              className={`mt-0.5 inline-block ${bg} ${tone} text-[11px] px-2 py-0.5 rounded-md`}
            >
              {isUp ? "▲" : "▼"} {Math.abs(delta!).toFixed(0)}%
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SegmentedBar({
  counts,
}: {
  counts: Partial<Record<Order["status"], number>>;
}) {
  const order = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ] as const;
  const total = order.reduce((t, k) => t + (counts[k] ?? 0), 0) || 1;
  const color: Record<(typeof order)[number], string> = {
    pending: "bg-yellow-400",
    confirmed: "bg-blue-500",
    shipped: "bg-purple-500",
    delivered: "bg-green-500",
    cancelled: "bg-red-500",
  };
  return (
    <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200">
      <div className="flex h-full">
        {order.map((k) =>
          (counts[k] ?? 0) > 0 ? (
            <div
              key={k}
              className={color[k]}
              style={{
                width: `${(((counts[k] ?? 0) / total) * 100).toFixed(2)}%`,
              }}
              title={`${k} ${counts[k] ?? 0}`}
            />
          ) : null
        )}
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function SellerDashboardPage() {
  // still runs redirects if user has no shop, but we DON'T hide the UI
  useRequireShop();

  return (
    <RequireAuth>
      <div className="pb-24 pt-4 px-4 max-w-screen-sm mx-auto">
        <OverviewInner />
      </div>
    </RequireAuth>
  );
}

function OverviewInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [prevOrders, setPrevOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<RangeKey>("30d");
  const [statusFilter, setStatusFilter] = useState<Order["status"] | "all">(
    "all"
  );
  const [page, setPage] = useState(0);
  const [shop, setShop] = useState<Shop | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [newOrderBanner, setNewOrderBanner] = useState<Order | null>(null);
  const [localQuery, setLocalQuery] = useState("");

  const PAGE_SIZE = 12;

  const cover =
    (Array.isArray(shop?.cover_urls) && shop?.cover_urls?.[0]) ||
    shop?.banner_url ||
    null;

  /* -------- Ranges -------- */
  const currentRange = useMemo(() => {
    if (range === "all")
      return {
        from: null as string | null,
        to: null as string | null,
        lenDays: 0,
      };
    const to = new Date();
    const lenDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const from = new Date();
    from.setDate(to.getDate() - lenDays);
    return { from: from.toISOString(), to: to.toISOString(), lenDays };
  }, [range]);

  const previousRange = useMemo(() => {
    if (range === "all")
      return { from: null as string | null, to: null as string | null };
    const to = new Date(currentRange.from!);
    const from = new Date(to);
    const lenDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    from.setDate(to.getDate() - lenDays);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [range, currentRange.from]);

  /* -------- Bootstrap: shop & profile -------- */
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const [{ data: shopRow }, { data: profRow }] = await Promise.all([
        supabase.from("shops").select("*").eq("owner", uid).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      ]);
      setShop((shopRow as Shop) || null);
      setProfile((profRow as Profile) || null);
    })();
  }, []);

  /* -------- Fetch orders for current & previous periods -------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // current
        let q = supabase
          .from("orders")
          .select("*, products:products(*)")
          .order("created_at", { ascending: false });
        if (currentRange.from && currentRange.to) {
          q = q
            .gte("created_at", currentRange.from)
            .lte("created_at", currentRange.to);
        }
        const { data: nowData, error: nowErr } = await q;
        if (!cancelled && !nowErr && nowData) setOrders(nowData as any[]);

        // previous
        if (previousRange.from && previousRange.to) {
          const { data: prevData } = await supabase
            .from("orders")
            .select("id, amount_mad, status, created_at")
            .gte("created_at", previousRange.from!)
            .lte("created_at", previousRange.to!)
            .order("created_at", { ascending: false });
          if (!cancelled && prevData) setPrevOrders(prevData as any[]);
        } else {
          setPrevOrders([]);
        }
        setPage(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    range,
    currentRange.from,
    currentRange.to,
    previousRange.from,
    previousRange.to,
  ]);

  /* -------- Realtime: ping on new/updated orders -------- */
  useEffect(() => {
    const ch = supabase
      .channel("seller_orders_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload: any) => {
          const rec = payload.new as Order;
          setNewOrderBanner(rec);
          setOrders((prev) => {
            if (!rec?.id) return prev;
            const idx = prev.findIndex((o) => o.id === rec.id);
            if (idx === -1) return [rec, ...prev].slice(0, 200);
            const next = [...prev];
            next[idx] = { ...next[idx], ...rec };
            return next;
          });
          setTimeout(() => setNewOrderBanner(null), 4000);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  /* -------- Metrics -------- */
  const clean = useMemo(
    () => orders.filter((o) => o.status !== "cancelled"),
    [orders]
  );
  const gross = useMemo(
    () => sum(clean.map((o) => o.amount_mad || 0)),
    [clean]
  );
  const ordersCount = orders.length;
  const delivered = useMemo(
    () => orders.filter((o) => o.status === "delivered").length,
    [orders]
  );
  const pending = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );
  const aov = useMemo(() => mean(clean.map((o) => o.amount_mad || 0)), [clean]);

  const prevClean = useMemo(
    () => prevOrders.filter((o) => o.status !== "cancelled"),
    [prevOrders]
  );
  const prevGross = useMemo(
    () => sum(prevClean.map((o) => o.amount_mad || 0)),
    [prevClean]
  );
  const prevCount = prevOrders.length;
  const prevDelivered = useMemo(
    () => prevOrders.filter((o) => o.status === "delivered").length,
    [prevOrders]
  );
  const prevAov = useMemo(
    () => mean(prevClean.map((o) => o.amount_mad || 0)),
    [prevClean]
  );

  const grossDelta = useMemo(
    () => pctDelta(gross, prevGross),
    [gross, prevGross]
  );
  const ordersDelta = useMemo(
    () => pctDelta(ordersCount, prevCount),
    [ordersCount, prevCount]
  );
  const deliveredDelta = useMemo(
    () => pctDelta(delivered, prevDelivered),
    [delivered, prevDelivered]
  );
  const aovDelta = useMemo(() => pctDelta(aov, prevAov), [aov, prevAov]);

  const statusCounts = useMemo(() => {
    const acc: Partial<Record<Order["status"], number>> = {};
    orders.forEach((o) => (acc[o.status] = (acc[o.status] ?? 0) + 1));
    return acc;
  }, [orders]);

  /* -------- Local search + filters + pagination -------- */
  const localFiltered = useMemo(() => {
    const base =
      statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter);
    if (!localQuery.trim()) return base;
    const q = localQuery.toLowerCase();
    return base.filter((o) => {
      const t = o.products?.title?.toLowerCase() ?? "";
      return t.includes(q) || o.id.toLowerCase().includes(q);
    });
  }, [orders, statusFilter, localQuery]);

  const paged = useMemo(() => {
    const end = (page + 1) * PAGE_SIZE;
    return localFiltered.slice(0, end);
  }, [localFiltered, page]);

  /* -------- Derived helper lists -------- */
  const fulfillmentQueue = useMemo(
    () =>
      orders
        .filter((o) => o.status === "pending" || o.status === "confirmed")
        .slice(0, 5),
    [orders]
  );

  const lowStock = useMemo(
    () =>
      orders
        .map((o) => o.products)
        .filter(Boolean)
        .filter(
          (p) => typeof p!.stock === "number" && (p!.stock as number) <= 2
        )
        .slice(0, 3) as NonNullable<Order["products"]>[],
    [orders]
  );

  /* -------- Actions -------- */
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const exportCSV = useCallback(() => {
    const rows = orders.map((o) => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      amount_mad: o.amount_mad,
      qty: o.qty,
      product_id: o.product_id,
      product_title: o.products?.title ?? "",
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    if (downloadRef.current) {
      downloadRef.current.href = url;
      downloadRef.current.download = `zaha_orders_${range}.csv`;
      downloadRef.current.click();
      URL.revokeObjectURL(url);
    }
  }, [orders, range]);

  const shareShop = useCallback(() => {
    if (!shop?.id && !shop?.slug) return;

    const origin = typeof window !== "undefined" ? window.location.origin : "";

    const url = shop.slug
      ? `${origin}/shop/${shop.slug}`
      : `${origin}/shop/${shop.id}`;
    const title = shop?.title ?? "My Zaha shop";

    if (typeof navigator !== "undefined" && (navigator as any).share) {
      (navigator as any).share({ title, url }).catch(() => {});
      return;
    }

    if (navigator && "clipboard" in navigator) {
      (navigator as any).clipboard
        .writeText(url)
        .then(() => {
          alert("Shop link copied to clipboard");
        })
        .catch(() => {
          window.prompt("Copy this shop link:", url);
        });
    } else {
      window.prompt("Copy this shop link:", url);
    }
  }, [shop]);

  const checklist = useMemo(() => {
    const steps = [
      { key: "shop", done: !!shop?.id, label: "Create your shop" },
      {
        key: "listing",
        done: orders.some((o) => !!o.products?.id),
        label: "Add your first listing",
      },
      {
        key: "profile",
        done: !!(profile?.full_name || profile?.username),
        label: "Complete profile",
      },
      { key: "payout", done: !!shop?.payout_enabled, label: "Enable payouts" },
    ];
    const done = steps.filter((s) => s.done).length;
    return { steps, done, total: steps.length };
  }, [shop, orders, profile]);

  const shopSales = delivered;
  const ratingDisplay =
    typeof shop?.avg_rating === "number" ? shop.avg_rating.toFixed(1) : "—";
  const ratingCountDisplay =
    typeof shop?.rating_count === "number" ? shop.rating_count : undefined;
  const yearsDisplay =
    typeof shop?.years_on_zaha === "number" ? shop.years_on_zaha : null;

  return (
    <main className="space-y-6">
      {/* hidden anchor for CSV download */}
      <a ref={downloadRef} className="hidden" />

      {/* Live banner for new/changed orders */}
      {newOrderBanner && (
        <div className="rounded-xl border bg-[#371837]/10 text-ink px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} />
            <span className="text-sm">
              Order <strong>{newOrderBanner.id.slice(0, 7)}</strong> updated ·{" "}
              <StatusPill s={newOrderBanner.status} />
            </span>
          </div>
          <Link
            href={`/seller/orders/${newOrderBanner.id}`}
            className="text-sm underline"
          >
            Open
          </Link>
        </div>
      )}

      {/* Top bar */}
      <div className="mb-3 relative flex justify-between">
        <DashboardHeader
          title="Dashboard"
          subtitle="Manage your shop"
          withDivider={false}
          withBackButton={false}
        />

        <Link
          href="/home"
          aria-label="Return to buyer"
          className="rounded-full border border-ink/15 bg-white hover:bg-sand transition h-9 px-3 inline-flex items-center gap-1.5 text-sm text-ink/80"
        >
          <ArrowLeft className="h-[15px] w-[15px] opacity-70" /> Switch to buyer
        </Link>
      </div>

      {/* Shop preview card */}
      <div className="relative rounded-2xl border border-sand/70 bg-white shadow-[0_6px_18px_rgba(11,16,32,0.06)] overflow-hidden">
        {shop?.id && (
          <Link
            href={`/shop/${shop.slug ?? shop.id}`}
            className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink text-sand px-3 h-8 text-[11px] font-medium shadow-sm hover:brightness-110 active:scale-[0.98]"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </Link>
        )}

        {/* Top-right actions */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <button
            type="button"
            onClick={shareShop}
            className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-3 h-8 text-[11px] text-ink/70 hover:bg-sand/70 shadow-sm"
          >
            <Share2 className="h-3 w-3" />
            <span>Share</span>
          </button>

          <Link
            href="/seller/shop"
            aria-label="Customize shop"
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-ink/10 bg-white text-ink/70 hover:bg-sand/70 shadow-sm"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        {/* Cover */}
        <div className="relative h-28 w-full overflow-hidden bg-sand/60">
          {cover && (
            <img
              src={cover}
              alt={shop?.title ?? "Shop banner"}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Header row with avatar + name */}
        <div className="px-4 pb-5">
          <div className="-mt-7 flex items-end gap-3">
            <div className="relative h-14 w-14 rounded-lg border-2 border-white bg-sand overflow-hidden shadow-sm">
              {shop?.avatar_url ? (
                <img
                  src={shop.avatar_url}
                  alt={shop.title ?? "Shop avatar"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full grid place-items-center bg-sand/60">
                  <Store className="h-5 w-5 text-ink/80" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-8">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-semibold text-ink">
                  {shop?.title || "Your shop"}
                </p>
                {shop?.is_verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-[#371837]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#371837] mt-1">
                    <Star className="h-3 w-3 fill-terracotta text-[#371837]" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <div className=" flex items-center gap-1 text-xs text-ink/60">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{shop?.city || "Morocco"}</span>
              </div>
            </div>
          </div>

          {/* Optional stats row */}
          {false && (
            <div className="mt-4 flex items-center justify-between gap-3 text-[11px] text-ink/80">
              <div className="flex flex-col">
                <span className="font-medium">
                  {shopSales.toLocaleString()} sales
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{ratingDisplay}</span>
                  {ratingCountDisplay !== undefined && (
                    <span className="text-ink/50">({ratingCountDisplay})</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-medium">
                  {yearsDisplay ? `${yearsDisplay} yr` : "New"}
                </span>
                <span className="text-ink/50">on Zaha</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date range + analytics link */}
      <div className="flex items-center justify-between gap-3">
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-auto inline-flex shadow-none rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        <Link
          href="/seller/analytics"
          className="text-sm underline whitespace-nowrap"
        >
          View analytics
        </Link>
      </div>

      {/* KPIs + status bar */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Gross sales"
            value={`MAD ${gross.toLocaleString()}`}
            delta={range === "all" ? undefined : grossDelta}
            icon={Package}
            isLoading={loading}
          />
          <KpiCard
            label="Orders"
            value={String(ordersCount)}
            delta={range === "all" ? undefined : ordersDelta}
            icon={ClipboardList}
            isLoading={loading}
          />
          <KpiCard
            label="Delivered"
            value={String(delivered)}
            delta={range === "all" ? undefined : deliveredDelta}
            icon={ChevronRight}
            isLoading={loading}
          />
          <KpiCard
            label="Avg order value"
            value={`MAD ${Math.round(aov).toLocaleString()}`}
            delta={range === "all" ? undefined : aovDelta}
            icon={ChevronRight}
            isLoading={loading}
          />
        </div>
        <div className="space-y-1 mt-3">
          <div className="text-xs text-ink/70">Order status mix</div>
          <SegmentedBar counts={statusCounts} />
          <div className="text-[11px] text-ink/60">
            P:{statusCounts.pending ?? 0} · C:{statusCounts.confirmed ?? 0} · S:
            {statusCounts.shipped ?? 0} · D:{statusCounts.delivered ?? 0} · X:
            {statusCounts.cancelled ?? 0}
          </div>
        </div>
      </div>

      {/* Fulfillment queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium flex items-center gap-2">
              <Truck size={16} /> Fulfillment queue
            </div>
            <Link href="/seller/orders?tab=queue" className="text-sm underline">
              Open queue
            </Link>
          </div>
          {loading ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-ink/60" />
            </div>
          ) : !fulfillmentQueue.length ? (
            <div className="text-sm text-ink/70">
              No orders waiting for action.
            </div>
          ) : (
            <ul className="space-y-2">
              {fulfillmentQueue.map((o) => {
                const img = o.products?.photos?.[0];
                const ageH = Math.max(
                  0,
                  Math.round(
                    (Date.now() - new Date(o.created_at).getTime()) / 36e5
                  )
                );
                const overdue =
                  ageH >= 48 &&
                  (o.status === "pending" || o.status === "confirmed");
                return (
                  <li
                    key={o.id}
                    className={`rounded-lg border p-2 flex items-center gap-3 ${overdue ? "border-red-300" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-md bg-neutral-100 overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm">
                          {o.products?.title ?? "Product"}
                        </div>
                        <StatusPill s={o.status} />
                      </div>
                      <div
                        className={`text-[11px] ${overdue ? "text-red-700" : "text-ink/70"}`}
                      >
                        Age: {ageH}h
                      </div>
                    </div>
                    <Link
                      href={`/seller/orders/${o.id}`}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-neutral-50 transition"
                    >
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Low stock block left commented-out for now */}
      </div>

      {/* Filters + search */}
      <div className="flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "confirmed", label: "Confirmed" },
            { key: "shipped", label: "Shipped" },
            { key: "delivered", label: "Delivered" },
            { key: "cancelled", label: "Cancelled" },
          ].map((f) => {
            const active = statusFilter === (f.key as any);
            return (
              <button
                key={f.key}
                onClick={() => {
                  setStatusFilter(f.key as any);
                  setPage(0);
                }}
                className={[
                  "px-3 py-1.5 rounded-full border text-sm transition",
                  active
                    ? "bg-[#371837] text-white border-[#371837]"
                    : "bg-white hover:bg-neutral-50",
                ].join(" ")}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-ink/60" />
          <input
            value={localQuery}
            onChange={(e) => {
              setLocalQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Search orders by product or ID…"
            className="w-full rounded-full border bg-white pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Orders list */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={exportCSV}
              className="hidden sm:inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs bg-white hover:bg-neutral-50"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <Link href="/seller/orders" className="text-sm underline">
              View all
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-ink/60" />
          </div>
        ) : !paged.length ? (
          <div className="rounded-xl border bg-white p-6 text-center">
            <div className="text-sm text-ink/80">
              {localQuery
                ? "No orders matching your search."
                : statusFilter === "all"
                  ? "No orders yet."
                  : "No orders for this status."}
            </div>
            <div className="mt-3">
              <Link
                href="/sell"
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-white hover:bg-neutral-50 transition"
              >
                <Plus size={16} />
                Add your first listing
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {paged.map((o) => {
                const img = o.products?.photos?.[0];
                return (
                  <li
                    key={o.id}
                    className="rounded-xl border p-3 flex items-center gap-3 bg-white"
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
                      <div className="flex items-center gap-2">
                        <div className="truncate font-medium">
                          {o.products?.title ?? "Product"}
                        </div>
                        <StatusPill s={o.status} />
                      </div>
                      <div className="text-xs text-ink/70">
                        MAD {o.amount_mad} · {fmtDate(o.created_at)}
                      </div>
                    </div>
                    <Link
                      href={`/seller/orders/${o.id}`}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-neutral-50 transition"
                    >
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
            {paged.length < localFiltered.length && (
              <div className="pt-2">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="w-full rounded-xl border bg-white hover:bg-neutral-50 transition px-4 py-2 text-sm"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
