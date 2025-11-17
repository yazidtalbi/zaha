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
  Copy,
  Search as SearchIcon,
  AlertTriangle,
  Truck,
  ChevronDown,
  ArrowLeft,
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
import Home from "../page";

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
  payout_enabled?: boolean | null; // optional, handled defensively
  is_active?: boolean | null;
  owner?: string;
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
}: {
  label: string;
  value: string;
  delta?: number;
  positiveIsGood?: boolean;
  icon: any;
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
  return (
    <div className="rounded-xl    bg-neutral-50  px-3 py-3   items-center gap-3 block">
      {/* <div className="w-9 h-9 rounded-lg grid place-items-center bg-white border">
        <Icon size={18} />
      </div> */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink/70">{label}</div>
        <div className="text-lg font-semibold truncate">{value}</div>
        {delta !== undefined && (
          <div
            className={`mt-0.5 inline-block ${bg} ${tone} text-[11px] px-2 py-0.5 rounded-md`}
          >
            {isUp ? "▲" : "▼"} {Math.abs(delta).toFixed(0)}%
          </div>
        )}
      </div>
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
  const loading = useRequireShop();

  if (loading) return null; // or a nice loader
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
          // Refresh lightweight: prepend/patch without re-fetch
          setOrders((prev) => {
            if (!rec?.id) return prev;
            const idx = prev.findIndex((o) => o.id === rec.id);
            if (idx === -1) return [rec, ...prev].slice(0, 200);
            const next = [...prev];
            next[idx] = { ...next[idx], ...rec };
            return next;
          });
          // Auto-hide banner
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
        ) // optional field
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

  // put this near the top of the file (below RangeKey type)
  const RANGE_LABEL: Record<RangeKey, string> = {
    "7d": "Last 7 days",
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    all: "All time",
  };

  const shareShop = useCallback(async () => {
    const url = shop?.slug
      ? `${location.origin}/shop/${shop.slug}`
      : `${location.origin}/shop/${shop?.id}`;
    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({ title: shop?.name ?? "My Zaha shop", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Shop link copied!");
      }
    } catch {}
  }, [shop]);

  /* -------- Checklist progress -------- */
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

  return (
    <main className="space-y-6">
      {/* Live banner for new/changed orders */}
      {newOrderBanner && (
        <div className="rounded-xl border bg-terracotta/10 text-ink px-3 py-2 flex items-center justify-between">
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
          className="
    rounded-full border border-ink/15 bg-white
    hover:bg-sand transition
    h-9 px-3
    inline-flex items-center gap-1.5
    text-sm text-ink/80
  "
        >
          <ArrowLeft className="h-[15px] w-[15px] opacity-70" /> Switch to buyer
        </Link>
      </div>

      {/* Store card + checklist */}

      <Link href={`/shop/${shop?.slug ?? shop?.id}`}>
        <div className="rounded-xl   bg-neutral-50 ring ring-neutral-200   p-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ">
              <div className="w-10 h-10 border grid place-items-center  bg-neutral-50 rounded-md overflow-hidden">
                {shop?.avatar_url ? (
                  <img
                    src={shop.avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store size={18} />
                )}
              </div>
              <div>
                <div className="font-medium text-terracotta">
                  {shop?.title || "Your shop"}
                </div>
                <div className="text-xs  font-medium text-ink/70">
                  {shop?.is_verified ? (
                    <div className="flex">
                      {" "}
                      <Image
                        src="/icons/verified_zaha.svg"
                        alt="Verified"
                        width={14}
                        height={14}
                        className="opacity-90"
                      />{" "}
                      <span className="ml-1">Verified</span>
                    </div>
                  ) : (
                    "Unverified"
                  )}{" "}
                  {/* {shop?.payout_enabled ? "Payouts enabled" : "Payouts disabled"} */}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {shop?.id && (
                <Link
                  href={`/shop/${shop.slug ?? shop.id}`}
                  className="rounded-full border px-2 py-1 text-sm bg-white hover:bg-neutral-50 transition inline-flex items-center gap-1"
                >
                  <Eye size={16} /> Preview
                </Link>
              )}
              {/* <Link
              href="/seller/settings"
              className="rounded-full border px-3 py-1.5 text-sm bg-white hover:bg-neutral-50 transition"
            >
              Manage
            </Link> */}
            </div>
          </div>

          {/* Checklist */}
          {/* <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium">Setup checklist</div>
            <div className="text-ink/70">
              {checklist.done}/{checklist.total} done
            </div>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-neutral-200">
            <div
              className="h-full bg-terracotta"
              style={{
                width: `${(checklist.done / Math.max(1, checklist.total)) * 100}%`,
              }}
            />
          </div>
          <ul className="text-sm space-y-1">
            {checklist.steps.map((s) => (
              <li key={s.key} className="flex items-center justify-between">
                <span className={s.done ? "text-ink/60 line-through" : ""}>
                  {s.label}
                </span>
                {s.done ? (
                  <span className="text-xs text-green-700">Done</span>
                ) : s.key === "listing" ? (
                  <Link href="/sell" className="text-xs underline">
                    Add
                  </Link>
                ) : s.key === "payout" ? (
                  <Link
                    href="/seller/settings#payouts"
                    className="text-xs underline"
                  >
                    Enable
                  </Link>
                ) : (
                  <Link href="/seller/settings" className="text-xs underline">
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div> */}
        </div>
      </Link>

      {/* Date range + analytics link */}
      <div className="flex items-center justify-between gap-3">
        {/* Date range + analytics link */}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger
            className={" w-auto inline-flex shadow-none rounded-full"}
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

        <Link
          href="/seller/analytics"
          className="text-sm underline whitespace-nowrap"
        >
          View analytics
        </Link>
      </div>

      {/* KPIs + status bar */}
      <div className="">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Gross sales"
            value={`MAD ${gross.toLocaleString()}`}
            delta={range === "all" ? undefined : grossDelta}
            icon={Package}
          />
          <KpiCard
            label="Orders"
            value={String(ordersCount)}
            delta={range === "all" ? undefined : ordersDelta}
            icon={ClipboardList}
          />
          <KpiCard
            label="Delivered"
            value={String(delivered)}
            delta={range === "all" ? undefined : deliveredDelta}
            icon={ChevronRight}
          />
          <KpiCard
            label="Avg order value"
            value={`MAD ${Math.round(aov).toLocaleString()}`}
            delta={range === "all" ? undefined : aovDelta}
            icon={ChevronRight}
          />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-ink/70">Order status mix</div>
          <SegmentedBar counts={statusCounts} />
          <div className="text-[11px] text-ink/60">
            P:{statusCounts.pending ?? 0} · C:{statusCounts.confirmed ?? 0} · S:
            {statusCounts.shipped ?? 0} · D:{statusCounts.delivered ?? 0} · X:
            {statusCounts.cancelled ?? 0}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {/* <div className="grid grid-cols-3 gap-3">
        <Link
          href="/sell"
          className="rounded-xl border bg-white hover:bg-neutral-50 transition p-3 flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-lg grid place-items-center ">
            <Plus size={18} />
          </div>
          <div className="text-sm font-medium">Add listing</div>
        </Link>
        <Link
          href="/seller/products"
          className="rounded-xl border bg-white hover:bg-neutral-50 transition p-3 flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-lg grid place-items-center   ">
            <Package size={18} />
          </div>
          <div className="text-sm font-medium">Products</div>
        </Link>
        <Link
          href="/seller/orders"
          className="rounded-xl border bg-white hover:bg-neutral-50 transition p-3 flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-lg grid place-items-center   ">
            <ClipboardList size={18} />
          </div>
          <div className="text-sm font-medium">Orders</div>
        </Link>
      </div> */}

      {/* Fulfillment queue + Low stock */}
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
          {!fulfillmentQueue.length ? (
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

        {/* <div className="rounded-xl border bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium flex items-center gap-2">
              <AlertTriangle size={16} /> Low stock
            </div>
            <Link
              href="/seller/products?filter=low"
              className="text-sm underline"
            >
              View all
            </Link>
          </div>
          {!lowStock.length ? (
            <div className="text-sm text-ink/70">All good for now.</div>
          ) : (
            <ul className="space-y-2">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border p-2 flex items-center justify-between"
                >
                  <div className="truncate text-sm">{p.title}</div>
                  <div className="text-xs text-red-700">Stock: {p.stock}</div>
                </li>
              ))}
            </ul>
          )}
        </div> */}
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
                    ? "bg-terracotta text-white border-terracotta"
                    : "bg-white hover:bg-neutral-50 ",
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
          <Link href="/seller/orders" className="text-sm underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-3 bg-white animate-pulse flex items-center gap-3"
              >
                <div className="w-12 h-12 rounded-md bg-neutral-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-neutral-200 rounded w-2/3" />
                  <div className="h-3 bg-neutral-200 rounded w-1/3" />
                </div>
                <div className="w-16 h-6 bg-neutral-200 rounded" />
              </div>
            ))}
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
