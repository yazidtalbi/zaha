// app/seller/analytics/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

// ⬇️ Recharts (for shadcn-style charts)
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/* ───────────────── Types ───────────────── */
type Order = {
  id: string;
  created_at: string;
  amount_mad: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  products?: { id: string; title?: string | null; shop_id: string };
};

type RangeKey = "7d" | "30d" | "90d" | "180d" | "365d" | "all";
type Granularity = "auto" | "daily" | "weekly" | "monthly";

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

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun
  x.setDate(x.getDate() - day); // week starts Sunday
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addWeeks(d: Date, n: number) {
  return addDays(d, n * 7);
}
function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

/* ───────────────── Page ───────────────── */
export default function AnalyticsPage() {
  return (
    <RequireAuth>
      <AnalyticsInner />
    </RequireAuth>
  );
}

function AnalyticsInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Controls
  // ⬇️ default to last 7 days (not 90)
  const [range, setRange] = useState<RangeKey>("7d");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [granularity, setGranularity] = useState<Granularity>("auto");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, created_at, amount_mad, status, products:products(id, title, shop_id)"
      )
      .order("created_at", { ascending: false })
      .limit(3000);
    if (!error && data) setOrders(data as any[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("analytics-rt")
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

  // Range filter
  const rangeFilter = useMemo(() => {
    if (range === "all") return null as null | { from: Date; to: Date };
    const to = new Date();
    const map = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "365d": 365,
    } as const;
    const from = new Date();
    from.setDate(to.getDate() - map[range as keyof typeof map]);
    return { from, to };
  }, [range]);

  // Filtered set
  const filtered = useMemo(() => {
    let xs = orders.slice();
    if (!includeCancelled) xs = xs.filter((o) => o.status !== "cancelled");
    if (rangeFilter) {
      xs = xs.filter((o) => {
        const t = +new Date(o.created_at);
        return t >= +rangeFilter.from && t <= +rangeFilter.to;
      });
    }
    return xs;
  }, [orders, includeCancelled, rangeFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const totalOrders = filtered.length;
    const revenue = filtered.reduce((s, o) => s + (o.amount_mad || 0), 0);
    const delivered = filtered.filter((o) => o.status === "delivered").length;
    const aov = totalOrders ? revenue / totalOrders : 0;
    const deliveredRate = totalOrders ? (delivered / totalOrders) * 100 : 0;
    return { revenue, totalOrders, delivered, aov, deliveredRate };
  }, [filtered]);

  // ----- Bucketing for chart -----
  const effectiveGranularity: Exclude<Granularity, "auto"> = useMemo(() => {
    if (granularity !== "auto") return granularity;
    // Auto: daily for <= 90d, monthly otherwise
    return range === "7d" || range === "30d" || range === "90d"
      ? "daily"
      : "monthly";
  }, [granularity, range]);

  type Bucket = { label: string; date: Date; value: number };
  const chartData: { max: number; items: Bucket[] } = useMemo(() => {
    if (!filtered.length) return { max: 1, items: [] };

    const map = new Map<string, Bucket>();
    let cursorFrom: Date;
    let cursorTo: Date;

    if (rangeFilter) {
      cursorFrom =
        effectiveGranularity === "weekly"
          ? startOfWeek(rangeFilter.from)
          : effectiveGranularity === "monthly"
            ? startOfMonth(rangeFilter.from)
            : startOfDay(rangeFilter.from);
      cursorTo = rangeFilter.to;
    } else {
      const newest = new Date(
        Math.max(...filtered.map((o) => +new Date(o.created_at)))
      );
      const oldest = new Date(
        Math.min(...filtered.map((o) => +new Date(o.created_at)))
      );
      cursorFrom =
        effectiveGranularity === "weekly"
          ? startOfWeek(oldest)
          : effectiveGranularity === "monthly"
            ? startOfMonth(oldest)
            : startOfDay(oldest);
      cursorTo = newest;
    }

    // Seed buckets with 0
    const adv =
      effectiveGranularity === "weekly"
        ? addWeeks
        : effectiveGranularity === "monthly"
          ? addMonths
          : addDays;

    const lab =
      effectiveGranularity === "weekly"
        ? (d: Date) => `${fmtDate(d)} (wk)`
        : effectiveGranularity === "monthly"
          ? fmtMonth
          : fmtDate;

    for (let d = new Date(cursorFrom); +d <= +cursorTo; d = adv(d, 1)) {
      const key = lab(d);
      map.set(key, { label: key, date: new Date(d), value: 0 });
    }

    // Sum into buckets
    filtered.forEach((o) => {
      const d = new Date(o.created_at);
      const start =
        effectiveGranularity === "weekly"
          ? startOfWeek(d)
          : effectiveGranularity === "monthly"
            ? startOfMonth(d)
            : startOfDay(d);
      const key =
        effectiveGranularity === "weekly"
          ? `${fmtDate(start)} (wk)`
          : effectiveGranularity === "monthly"
            ? fmtMonth(start)
            : fmtDate(start);
      const b = map.get(key);
      if (b) b.value += o.amount_mad || 0;
      else map.set(key, { label: key, date: start, value: o.amount_mad || 0 });
    });

    const items = Array.from(map.values()).sort((a, b) => +a.date - +b.date);
    const max = Math.max(1, ...items.map((i) => i.value));
    return { max, items };
  }, [filtered, effectiveGranularity, rangeFilter]);

  // Revenue by status (MAD)
  const byStatus = useMemo(() => {
    const keys: Order["status"][] = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    const sums: Record<Order["status"], number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    filtered.forEach((o) => (sums[o.status] += o.amount_mad || 0));
    const total = Object.values(sums).reduce((a, b) => a + b, 0) || 1;
    const pct = Object.fromEntries(
      keys.map((k) => [k, (sums[k] / total) * 100])
    ) as Record<Order["status"], number>;
    return { sums, pct, total };
  }, [filtered]);

  // ⬇️ Orders-by-status (for donut chart – counts, not MAD)
  const ordersByStatus = useMemo(() => {
    const keys: Order["status"][] = [
      "pending",
      "confirmed",
      "shipped",
      "delivered",
      "cancelled",
    ];
    const counts: Record<Order["status"], number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    filtered.forEach((o) => {
      counts[o.status] += 1;
    });
    const total = keys.reduce((acc, k) => acc + counts[k], 0);
    const pct: Record<Order["status"], number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    keys.forEach((k) => {
      pct[k] = total ? (counts[k] / total) * 100 : 0;
    });

    const chartRows = keys.map((k) => ({
      key: k,
      label: k[0].toUpperCase() + k.slice(1),
      value: counts[k],
    }));

    return { counts, pct, total, chartRows };
  }, [filtered]);

  // Top products
  const topProducts = useMemo(() => {
    const m = new Map<
      string,
      { title: string; revenue: number; count: number }
    >();
    filtered.forEach((o) => {
      const id = o.products?.id ?? "_unknown";
      const title = o.products?.title ?? "Product";
      const entry = m.get(id) ?? { title, revenue: 0, count: 0 };
      entry.revenue += o.amount_mad || 0;
      entry.count += 1;
      m.set(id, entry);
    });
    const arr = Array.from(m.entries()).map(([product_id, v]) => ({
      product_id,
      ...v,
    }));
    const byRevenue = arr
      .slice()
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    const byCount = arr
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return { byRevenue, byCount };
  }, [filtered]);

  // Weekday heat
  const weekdayHeat = useMemo(() => {
    const counts = Array.from({ length: 7 }, () => 0);
    filtered.forEach((o) => {
      const d = new Date(o.created_at);
      counts[d.getDay()] += 1;
    });
    const max = Math.max(1, ...counts);
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return { counts, max, names };
  }, [filtered]);

  function exportCSV() {
    const data = filtered.map((o) => ({
      id: o.id,
      created_at: o.created_at,
      status: o.status,
      amount_mad: o.amount_mad,
      product_id: o.products?.id ?? "",
      product_title: o.products?.title ?? "",
    }));
    const csv = toCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zaha_analytics_${range}${
      includeCancelled ? "_incl_cancelled" : ""
    }.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STATUS_COLORS: Record<Order["status"], string> = {
    pending: "#FACC15", // yellow
    confirmed: "#60A5FA", // blue
    shipped: "#A855F7", // purple
    delivered: "#22C55E", // green
    cancelled: "#F97373", // red-ish
  };

  return (
    <main className="space-y-6 p-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-2">
        <DashboardHeader
          title="Analytics"
          subtitle="Track performance and revenue"
          withDivider={false}
          withBackButton={false}
        />
      </div>

      {/* Controls row (wraps on mobile) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Range */}
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-[140px] rounded-full shadow-none">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="180d">Last 180 days</SelectItem>
            <SelectItem value="365d">Last 365 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>

        {/* Cancelled toggle */}
        <div className="flex items-center gap-2 pl-1">
          <Switch
            checked={includeCancelled}
            onCheckedChange={(v) => setIncludeCancelled(Boolean(v))}
            id="inc-cancel"
          />
          <Label htmlFor="inc-cancel" className="text-sm">
            Include cancelled
          </Label>
        </div>

        {/* Granularity */}
        <Select
          value={granularity}
          onValueChange={(v) => setGranularity(v as Granularity)}
        >
          <SelectTrigger className="w-[140px] rounded-full shadow-none">
            <SelectValue placeholder="Granularity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={exportCSV}
          className="ml-auto sm:ml-0 rounded-xl"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* KPIs (white, no bg-sand) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CardStat
          label="Revenue"
          value={`MAD ${kpis.revenue.toLocaleString()}`}
        />
        <CardStat label="Orders" value={`${kpis.totalOrders}`} />
        <CardStat label="AOV" value={`MAD ${kpis.aov.toFixed(0)}`} />
        <CardStat
          label="Delivered %"
          value={`${kpis.deliveredRate.toFixed(0)}%`}
        />
      </div>

      {/* Trend (Recharts) */}
      <section className="space-y-3">
        <h2 className="font-semibold">
          {granularity === "auto"
            ? "Revenue trend"
            : `${granularity} revenue trend`}
        </h2>
        {loading ? (
          <div className="text-sm text-ink/70">Loading…</div>
        ) : !chartData.items.length ? (
          <div className="text-sm text-ink/70">No data in this range.</div>
        ) : (
          <RevenueChart
            data={chartData.items.map((d) => ({
              label: d.label,
              value: d.value,
            }))}
            max={chartData.max}
          />
        )}
      </section>

      {/* ⬇️ NEW: Order status breakdown (donut chart – counts, not MAD) */}
      <section className="space-y-3">
        <h2 className="font-semibold">Order status breakdown</h2>
        {!filtered.length ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-ink/70">
            No orders in this range.
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative w-full sm:w-1/2 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus.chartRows}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="60%"
                    outerRadius="80%"
                    paddingAngle={2}
                    strokeWidth={2}
                  >
                    {ordersByStatus.chartRows.map((row) => (
                      <Cell
                        key={row.key}
                        fill={STATUS_COLORS[row.key as Order["status"]]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value, _name, entry) => [
                      `${value} orders`,
                      (entry?.payload as any)?.label ?? "Status",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-[11px] text-ink/60">Total orders</div>
                <div className="text-lg font-semibold">
                  {ordersByStatus.total}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full sm:w-1/2 grid grid-cols-2 gap-2 text-xs">
              {ordersByStatus.chartRows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between rounded-lg border bg-neutral-50 px-2 py-1"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[row.key as Order["status"]],
                      }}
                    />
                    <span>{row.label}</span>
                  </div>
                  <div className="text-[11px] text-ink/70">
                    {row.value} ·{" "}
                    {ordersByStatus.pct[row.key as Order["status"]].toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Revenue by status (stack – MAD) */}
      <section className="space-y-3">
        <h2 className="font-semibold">Revenue by status</h2>
        <div className="rounded-xl border p-3 bg-white">
          <div className="h-3 w-full bg-neutral-200 rounded overflow-hidden flex">
            <div
              className="h-3 bg-yellow-300"
              style={{ width: `${byStatus.pct.pending}%` }}
              title="Pending"
            />
            <div
              className="h-3 bg-blue-300"
              style={{ width: `${byStatus.pct.confirmed}%` }}
              title="Confirmed"
            />
            <div
              className="h-3 bg-purple-300"
              style={{ width: `${byStatus.pct.shipped}%` }}
              title="Shipped"
            />
            <div
              className="h-3 bg-green-300"
              style={{ width: `${byStatus.pct.delivered}%` }}
              title="Delivered"
            />
            <div
              className="h-3 bg-rose-300"
              style={{ width: `${byStatus.pct.cancelled}%` }}
              title="Cancelled"
            />
          </div>
          <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <Legend label="Pending" value={byStatus.sums.pending} />
            <Legend label="Confirmed" value={byStatus.sums.confirmed} />
            <Legend label="Shipped" value={byStatus.sums.shipped} />
            <Legend label="Delivered" value={byStatus.sums.delivered} />
            <Legend label="Cancelled" value={byStatus.sums.cancelled} />
          </div>
        </div>
      </section>

      {/* Top products */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <h2 className="font-semibold">Top products by revenue</h2>
          <ul className="space-y-2">
            {topProducts.byRevenue.map((p) => (
              <li key={p.product_id} className="rounded-xl border p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="truncate">{p.title}</div>
                  <div className="text-sm">
                    MAD {p.revenue.toLocaleString()}
                  </div>
                </div>
                <div className="h-1.5 bg-neutral-200 rounded mt-2">
                  <div
                    className="h-1.5 bg-ink rounded"
                    style={{
                      width: `${
                        topProducts.byRevenue[0]?.revenue
                          ? (p.revenue / topProducts.byRevenue[0].revenue) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </li>
            ))}
            {!topProducts.byRevenue.length && (
              <div className="text-sm text-ink/70">No products in range.</div>
            )}
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold">Top products by orders</h2>
          <ul className="space-y-2">
            {topProducts.byCount.map((p) => (
              <li key={p.product_id} className="rounded-xl border p-3 bg-white">
                <div className="flex items-center justify-between">
                  <div className="truncate">{p.title}</div>
                  <div className="text-sm">{p.count} orders</div>
                </div>
                <div className="h-1.5 bg-neutral-200 rounded mt-2">
                  <div
                    className="h-1.5 bg-terracotta rounded"
                    style={{
                      width: `${
                        topProducts.byCount[0]?.count
                          ? (p.count / topProducts.byCount[0].count) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </li>
            ))}
            {!topProducts.byCount.length && (
              <div className="text-sm text-ink/70">No products in range.</div>
            )}
          </ul>
        </div>
      </section>

      {/* Weekday heat */}
      <section className="space-y-3">
        <h2 className="font-semibold">Orders by weekday</h2>
        <div className="grid grid-cols-7 gap-2">
          {weekdayHeat.counts.map((v, i) => {
            const intensity = Math.round((v / weekdayHeat.max) * 80) + 20; // 20–100
            return (
              <div
                key={i}
                className="rounded-lg border bg-white p-2 text-center"
              >
                <div
                  className="h-8 rounded"
                  style={{
                    backgroundColor: `hsl(12, 60%, ${100 - intensity}%)`,
                  }}
                  title={`${weekdayHeat.names[i]}: ${v}`}
                />
                <div className="mt-1 text-xs">{weekdayHeat.names[i]}</div>
                <div className="text-xs text-ink/70">{v}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

/* ───────────────── Chart (Recharts) ───────────────── */
function RevenueChart({
  data,
}: {
  data: { label: string; value: number }[];
  max: number; // kept for API symmetry, but not needed by Recharts
}) {
  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value,
  }));

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <RechartsTooltip
              contentStyle={{
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
                fontSize: 12,
              }}
              formatter={(value) => [
                `MAD ${Math.round(value as number).toLocaleString()}`,
                "Revenue",
              ]}
              labelFormatter={(label) => String(label)}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="rgb(217, 87, 59)"
              strokeWidth={2}
              fill="rgba(217, 87, 59, 0.18)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ───────────────── UI bits (clean, no bg-sand) ───────────────── */
function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-ink/70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Legend({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-white px-2 py-1">
      <span className="text-xs">{label}</span>
      <span className="text-xs font-medium">MAD {value.toLocaleString()}</span>
    </div>
  );
}
