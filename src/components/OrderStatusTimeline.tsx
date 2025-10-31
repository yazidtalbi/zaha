// components/OrderStatusTimeline.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Clock, CheckCircle2, Truck, PackageCheck, Ban } from "lucide-react";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

type OrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
};

type OrderEvent = {
  id: string;
  order_id: string;
  type: "status_changed";
  payload: { from?: OrderStatus; to?: OrderStatus } | null;
  created_at: string;
};

function statusIcon(s: OrderStatus | "created") {
  switch (s) {
    case "created":
      return <Clock className="h-4 w-4" />;
    case "pending":
      return <Clock className="h-4 w-4" />;
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4" />;
    case "shipped":
      return <Truck className="h-4 w-4" />;
    case "delivered":
      return <PackageCheck className="h-4 w-4" />;
    case "cancelled":
      return <Ban className="h-4 w-4" />;
  }
}

function labelFor(s: OrderStatus | "created") {
  if (s === "created") return "Order placed";
  return `Status: ${s}`;
}

function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}

export default function OrderStatusTimeline({
  orderId,
  className = "",
}: {
  orderId: string;
  className?: string;
}) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [supportsEvents, setSupportsEvents] = useState(true);

  // Initial fetch
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      // order (created_at + current status)
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .select("id, created_at, status")
        .eq("id", orderId)
        .maybeSingle();
      if (!orderErr) setOrder(orderData as OrderRow);

      // events (if table exists)
      try {
        const { data: ev, error: evErr } = await supabase
          .from("order_events")
          .select("id, order_id, type, payload, created_at")
          .eq("order_id", orderId)
          .eq("type", "status_changed")
          .order("created_at", { ascending: true });
        if (evErr) {
          setSupportsEvents(false);
          setEvents(null);
        } else {
          setSupportsEvents(true);
          setEvents((ev as OrderEvent[]) ?? []);
        }
      } catch {
        setSupportsEvents(false);
        setEvents(null);
      }
    })();
  }, [orderId]);

  // Realtime for status updates and new events
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status:${orderId}`)
      // orders.status changes
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = payload?.new?.status as OrderStatus | undefined;
          if (newStatus) {
            setOrder((o) => (o ? { ...o, status: newStatus } : o));
            // If events table is missing, push a synthetic event so the timeline still moves
            if (!supportsEvents) {
              setEvents((prev) => [
                ...(prev ?? []),
                {
                  id: crypto.randomUUID(),
                  order_id: orderId,
                  type: "status_changed",
                  payload: { to: newStatus },
                  created_at: new Date().toISOString(),
                },
              ]);
            }
          }
        }
      )
      // order_events inserts
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "order_events",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (payload?.new?.type === "status_changed") {
            setEvents((prev) => [
              ...(prev ?? []),
              payload.new as unknown as OrderEvent,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supportsEvents]);

  // Compose timeline rows
  const rows = useMemo(() => {
    const base: Array<{
      key: string;
      status: OrderStatus | "created";
      at: string;
    }> = [];
    if (order?.created_at)
      base.push({ key: "created", status: "created", at: order.created_at });

    if (events && events.length > 0) {
      for (const ev of events) {
        const to = (ev.payload?.to as OrderStatus | undefined) ?? "pending";
        base.push({ key: ev.id, status: to, at: ev.created_at });
      }
    } else if (order?.status) {
      // Fallback: show the current status (if different from pending)
      if (order.status !== "pending" && order.created_at) {
        base.push({
          key: "current",
          status: order.status,
          at: order.created_at, // unknown time; use created_at as placeholder
        });
      }
    }
    return base;
  }, [order, events]);

  if (!order) {
    return <div className={className}>Loading timeline…</div>;
  }

  return (
    <div className={`relative ${className}`}>
      <ul className="space-y-4">
        {rows.map((r, i) => (
          <li key={r.key} className="relative pl-7">
            {/* vertical line */}
            {i !== rows.length - 1 && (
              <span className="absolute left-[11px] top-5 h-[calc(100%-1.25rem)] w-px bg-border" />
            )}
            {/* dot */}
            <span className="absolute left-0 top-0 h-5 w-5 rounded-full bg-muted grid place-items-center border">
              {statusIcon(r.status)}
            </span>
            <div className="text-sm">
              <div className="font-medium capitalize">{labelFor(r.status)}</div>
              <div className="text-xs text-muted-foreground">{fmt(r.at)}</div>
            </div>
          </li>
        ))}
      </ul>
      {!supportsEvents && (
        <p className="mt-3 text-xs text-muted-foreground">
          Tip: create a table{" "}
          <code className="px-1 py-0.5 rounded bg-muted">order_events</code> and
          insert a row on each status change to get a full history.
        </p>
      )}
    </div>
  );
}
