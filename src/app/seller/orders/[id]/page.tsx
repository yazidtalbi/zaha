"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Phone,
  MessageCircle,
  Copy,
  Printer,
  ExternalLink,
  CheckCircle2,
  Truck,
  PackageCheck,
  Clock,
  Ban,
} from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

// ————————————————————————————————————————
// shadcn/ui
// ————————————————————————————————————————
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

type Product = {
  id: string;
  title: string;
  photos: string[] | null;
  price_mad: number;
  shop_id?: string;
  shop_owner?: string | null;
};

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
  products?: Product | null;

  // Optional quality-of-life columns (safe if missing)
  payment_confirmed?: boolean | null;
  tracking_number?: string | null;
  seller_notes?: string | null;
};

type OrderEvent = {
  id: string;
  order_id: string;
  type:
    | "status_changed"
    | "note_updated"
    | "payment_confirmed"
    | "tracking_updated"
    | "created";
  payload: Record<string, any> | null;
  created_at: string;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

// Icon for status / timeline
function statusIcon(s: OrderStatus) {
  switch (s) {
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

function StatusBadge({ status }: { status: OrderStatus }) {
  const variant =
    status === "pending"
      ? "secondary"
      : status === "confirmed"
      ? "outline"
      : status === "shipped"
      ? "default"
      : status === "delivered"
      ? "success"
      : "destructive";
  const classes = status === "success" ? "" : ""; // using standard variants; add custom styles if you have them
  return (
    <Badge variant={variant as any} className={classes + " capitalize"}>
      {status}
    </Badge>
  );
}

export default function SellerOrderDetails() {
  const params = useParams<{ id: string }>();
  const orderId = useMemo(
    () => (params?.id ? String(params.id) : ""),
    [params]
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  async function confirmPaymentOneWay() {
    if (!order || paymentConfirmed) return;
    setSavingPayment(true);
    const { error } = await supabase
      .from("orders")
      .update({ payment_confirmed: true })
      .eq("id", order.id);

    setSavingPayment(false);

    if (error) {
      toast.error("Couldn’t mark as paid", { description: error.message });
      return;
    }
    setPaymentConfirmed(true); // lock
    setShowPaymentSheet(false);
    insertEvent?.("payment_confirmed", { value: true }); // if you have events table
    toast.success("Payment marked as confirmed ✅");
  }

  // enrichments
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [buyerOrdersCount, setBuyerOrdersCount] = useState<number | null>(null);

  // locals for editable fields
  const [notes, setNotes] = useState("");
  const [tracking, setTracking] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const saveNotesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load data
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*, products:products(*)")
        .eq("id", orderId)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error("Failed to load order", { description: error.message });
        setOrder(null);
        setLoading(false);
        return;
      }

      const o = (data as Order) ?? null;
      setOrder(o);
      setNotes(o?.seller_notes ?? "");
      setTracking(o?.tracking_number ?? "");
      setPaymentConfirmed(Boolean(o?.payment_confirmed));

      // Load buyer history if phone available
      if (o?.phone) {
        const { count, error: countErr } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("phone", o.phone);
        if (!countErr) setBuyerOrdersCount(count ?? 0);
      }

      // Load timeline if table exists
      try {
        const { data: ev, error: evErr } = await supabase
          .from("order_events")
          .select("*")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });
        if (!evErr && ev) setEvents(ev as OrderEvent[]);
        else setEvents(null);
      } catch {
        setEvents(null);
      }

      setLoading(false);
    })();
  }, [orderId]);

  async function insertEvent(
    type: OrderEvent["type"],
    payload: Record<string, any> = {}
  ) {
    try {
      await supabase
        .from("order_events")
        .insert({ order_id: orderId, type, payload });
      // best-effort refresh
      setEvents((prev) => [
        ...(prev ?? []),
        {
          id: crypto.randomUUID(),
          order_id: orderId,
          type,
          payload,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch {
      // Table may not exist; silently ignore
    }
  }

  async function updateStatus(next: OrderStatus) {
    if (!order) return;
    setSaving(true);
    const prev = order;
    setOrder({ ...order, status: next }); // optimistic

    const { data, error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", order.id)
      .select("id, status")
      .maybeSingle();

    if (error || !data) {
      setOrder(prev);
      toast.error("Failed to update status", {
        description: error?.message ?? "Try again.",
      });
      setSaving(false);
      return;
    }

    setOrder((o) => (o ? { ...o, status: data.status as OrderStatus } : o));
    toast.success("Status changed ✅", {
      description: `Order set to “${data.status}”.`,
    });
    insertEvent("status_changed", { from: prev.status, to: next });
    setSaving(false);
  }

  async function savePaymentConfirmed(next: boolean) {
    if (!order) return;
    setPaymentConfirmed(next);
    const { error } = await supabase
      .from("orders")
      .update({ payment_confirmed: next })
      .eq("id", order.id);
    if (error) {
      toast.error("Couldn’t save payment status", {
        description: error.message,
      });
      setPaymentConfirmed(!next);
    } else {
      insertEvent("payment_confirmed", { value: next });
    }
  }

  async function saveTracking(next: string) {
    if (!order) return;
    setTracking(next);
    const { error } = await supabase
      .from("orders")
      .update({ tracking_number: next })
      .eq("id", order.id);
    if (error) {
      toast.error("Couldn’t save tracking number", {
        description: error.message,
      });
    } else {
      insertEvent("tracking_updated", { value: next });
      toast.success("Tracking saved");
    }
  }

  // Debounced notes autosave
  useEffect(() => {
    if (!order) return;
    if (saveNotesTimer.current) clearTimeout(saveNotesTimer.current);
    saveNotesTimer.current = setTimeout(async () => {
      const { error } = await supabase
        .from("orders")
        .update({ seller_notes: notes })
        .eq("id", order.id);
      if (error) {
        toast.error("Couldn’t save notes", { description: error.message });
      } else {
        insertEvent("note_updated", { length: notes.length });
      }
    }, 700);
    return () => {
      if (saveNotesTimer.current) clearTimeout(saveNotesTimer.current);
    };
  }, [notes, order]);

  if (!orderId) return <main className="p-4">Invalid order id.</main>;
  if (loading) return <main className="p-4">Loading…</main>;
  if (!order) return <main className="p-4">Order not found.</main>;

  const p = order.products ?? null;
  const phoneDigits = order.phone?.replace(/\D/g, "");
  const whatsappLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Salam! 👋 I'm contacting you about your order "${
          p?.title ?? "—"
        }" (Order ID: ${order.id}).`
      )}`
    : null;

  const trackingDeepLink = tracking
    ? `https://www.google.com/search?q=${encodeURIComponent(
        "track " + tracking
      )}`
    : null;

  const nextAction: { label: string; to: OrderStatus } | null =
    order.status === "pending"
      ? { label: "Mark as confirmed", to: "confirmed" }
      : order.status === "confirmed"
      ? { label: "Mark as shipped", to: "shipped" }
      : order.status === "shipped"
      ? { label: "Mark as delivered", to: "delivered" }
      : null;

  return (
    <main className="pb-28 md:pb-6 p-4 mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Order details</h1>

          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
            <span>Order ID:</span>
            <code className="rounded bg-muted px-1.5 py-0.5">{order.id}</code>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                navigator.clipboard.writeText(order.id);
                toast.success("Order ID copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <span className="ml-2">
              Placed {new Date(order.created_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <Select
            value={order.status}
            onValueChange={(v) => updateStatus(v as OrderStatus)}
            disabled={saving}
          >
            <SelectTrigger className="w-[150px] capitalize">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            title="Print invoice"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          {p?.photos?.[0] ? (
            <img
              src={p.photos[0]}
              alt={p.title}
              className="w-20 h-20 object-cover rounded-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-muted grid place-items-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{p?.title ?? "Product"}</div>
            <div className="text-sm text-muted-foreground">
              Qty {order.qty} · Total MAD {order.amount_mad}
            </div>
            <div className="mt-1">
              <Link
                href={`/product/${p?.id ?? ""}`}
                className="text-xs underline"
              >
                View product
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyer & payment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Buyer & Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <div className="flex items-center gap-2">
                <Input value={order.phone ?? "—"} readOnly />
                {phoneDigits && (
                  <>
                    <Button asChild variant="outline">
                      <a href={`tel:${phoneDigits}`}>
                        <Phone className="h-4 w-4 mr-1" /> Call
                      </a>
                    </Button>
                    {whatsappLink && (
                      <Button asChild>
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                        </a>
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(order.phone ?? "");
                    toast.success("Phone copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label>City</Label>
              <Input value={order.city ?? "—"} readOnly />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <div className="flex items-center gap-2">
                <Input value={order.address ?? "—"} readOnly />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(order.address ?? "");
                    toast.success("Address copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <Label>Payment method</Label>
              <div className="text-sm text-muted-foreground">
                Cash on Delivery
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Payment confirmed</Label>

              {/* One-way toggle: opens Sheet; once true it's disabled */}
              <Switch
                checked={paymentConfirmed}
                disabled={paymentConfirmed || savingPayment}
                onCheckedChange={(next) => {
                  if (!paymentConfirmed && next) setShowPaymentSheet(true);
                  // ignore any attempt to turn it off
                }}
                aria-label="Toggle payment confirmed"
              />

              <span className="ml-2 text-xs text-muted-foreground">
                One-way action — cannot be undone.
              </span>
            </div>

            {/* Confirmation Sheet */}
            <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
              <SheetContent side="bottom" className="sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Confirm payment?</SheetTitle>
                  <SheetDescription>
                    This will mark the order as <strong>paid</strong>. This
                    action is
                    <strong> permanent</strong> and cannot be reverted.
                  </SheetDescription>
                </SheetHeader>

                {/* Optional context summary */}
                <div className="mt-3 text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Order ID:</span>{" "}
                    <code className="px-1 py-0.5 bg-muted rounded">
                      {order.id}
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span> MAD{" "}
                    {order.amount_mad}
                  </div>
                  {order.phone && (
                    <div>
                      <span className="text-muted-foreground">Buyer:</span>{" "}
                      {order.phone}
                    </div>
                  )}
                </div>

                <SheetFooter className="mt-4">
                  <SheetClose asChild>
                    <Button variant="outline" disabled={savingPayment}>
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button
                    onClick={confirmPaymentOneWay}
                    disabled={savingPayment}
                  >
                    {savingPayment ? "Saving…" : "Yes, mark as paid"}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </CardContent>
      </Card>

      {/* Fulfillment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <div className="space-y-1">
              <Label>Tracking number</Label>
              <Input
                placeholder="e.g. ABC123456MA"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value !== (order.tracking_number ?? ""))
                    saveTracking(e.target.value);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                disabled={!tracking}
                onClick={() =>
                  trackingDeepLink && window.open(trackingDeepLink, "_blank")
                }
              >
                Open tracking <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Add tracking for your courier; we’ll keep it for your records.
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Only you can see these notes. Example: 'Deliver after 6pm', 'Buyer requested gift wrap'…"
            rows={5}
          />
          <div className="text-xs text-muted-foreground">
            Autosaves after you stop typing.
          </div>
        </CardContent>
      </Card>

      {/* Analytics / History */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customer history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {buyerOrdersCount === null ? (
                "—"
              ) : (
                <>
                  This buyer has{" "}
                  <span className="font-medium text-foreground">
                    {buyerOrdersCount}
                  </span>{" "}
                  total order{buyerOrdersCount === 1 ? "" : "s"}.
                </>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Activity timeline (statuses only) */}
        {/* Activity timeline (statuses + payment) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {/* Always show creation */}
              <li className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 mt-0.5" />
                <div>
                  Order placed
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>
              </li>

              {/* Status change + payment confirmed events */}
              {events && events.length > 0 ? (
                events
                  .filter(
                    (ev) =>
                      ev.type === "status_changed" ||
                      ev.type === "payment_confirmed"
                  )
                  .map((ev) => (
                    <li key={ev.id} className="flex items-start gap-2 text-sm">
                      {ev.type === "status_changed"
                        ? statusIcon(
                            (ev.payload?.to as OrderStatus) || "pending"
                          )
                        : ev.type === "payment_confirmed" && (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                          )}
                      <div>
                        {ev.type === "status_changed" && (
                          <>
                            Status changed to{" "}
                            <span className="capitalize font-medium">
                              {ev.payload?.to}
                            </span>
                          </>
                        )}
                        {ev.type === "payment_confirmed" && (
                          <>
                            Payment marked as{" "}
                            <span className="font-medium text-green-700">
                              confirmed
                            </span>
                          </>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(ev.created_at).toLocaleString()}
                        </div>
                      </div>
                    </li>
                  ))
              ) : (
                <li className="text-sm text-muted-foreground">
                  No status updates yet.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Back link */}
      <div className="pt-2">
        <Link href="/seller/orders" className="text-sm underline">
          Back to orders
        </Link>
      </div>

      {/* Sticky mobile actions */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3">
        <div className="flex items-center gap-2">
          {phoneDigits && (
            <Button asChild variant="outline" className="flex-1">
              <a href={`tel:${phoneDigits}`}>
                <Phone className="h-4 w-4 mr-1" /> Call
              </a>
            </Button>
          )}
          {whatsappLink && (
            <Button asChild className="flex-1">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
              </a>
            </Button>
          )}
        </div>
        {nextAction && (
          <Button
            className="w-full mt-2"
            onClick={() => updateStatus(nextAction.to)}
            disabled={saving}
          >
            {statusIcon(nextAction.to)}{" "}
            <span className="ml-2">{nextAction.label}</span>
          </Button>
        )}
      </div>
    </main>
  );
}
