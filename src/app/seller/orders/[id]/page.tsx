// app/seller/orders/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  ArrowLeft,
  ArrowRight,
  Upload,
  Trash2,
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
import { Checkbox } from "@/components/ui/checkbox";

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
  stock?: number | null; // optional
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

  // ✅ display fields
  personalization?: string | null;
  options?: any | null;

  // QoL (optional in DB)
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

type FileObj = {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: { size: number } | null;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

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
  return (
    <Badge variant={variant as any} className="capitalize">
      {status}
    </Badge>
  );
}

export default function SellerOrderDetails() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = useMemo(
    () => (params?.id ? String(params.id) : ""),
    [params]
  );

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Payment confirm sheet
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // Timeline, buyer stats
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [buyerOrdersCount, setBuyerOrdersCount] = useState<number | null>(null);

  // Editable locals
  const [notes, setNotes] = useState("");
  const [tracking, setTracking] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  // Printing: choose invoice vs label
  const [printMode, setPrintMode] = useState<"invoice" | "label">("invoice");

  // Attachments (Supabase Storage: order_proofs)
  const [attachments, setAttachments] = useState<FileObj[]>([]);
  const [uploading, setUploading] = useState(false);

  // Optional stock decrement
  const [decrementOnShip, setDecrementOnShip] = useState(true);

  // Prev/next
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);

  const saveNotesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function safeUUID(): string {
    // Prefer secure, modern APIs
    try {
      if (typeof crypto !== "undefined") {
        // Newer browsers (secure context)
        if (typeof (crypto as any).randomUUID === "function") {
          return (crypto as any).randomUUID();
        }
        // Fallback: v4 using getRandomValues
        if (typeof crypto.getRandomValues === "function") {
          const b = new Uint8Array(16);
          crypto.getRandomValues(b);
          // Per RFC 4122
          b[6] = (b[6] & 0x0f) | 0x40;
          b[8] = (b[8] & 0x3f) | 0x80;
          const toHex = (n: number) => n.toString(16).padStart(2, "0");
          const h = Array.from(b, toHex).join("");
          return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
        }
      }
    } catch {}
    // Last-ditch (not RFC, but stable enough for React keys / optimistic UI)
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

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
      setAddress(o?.address ?? "");
      setCity(o?.city ?? "");

      // Prev/next ids (by created_at)
      if (o) {
        const { data: prev } = await supabase
          .from("orders")
          .select("id")
          .gt("created_at", o.created_at)
          .order("created_at", { ascending: true })
          .limit(1);
        setPrevId(prev?.[0]?.id ?? null);

        const { data: next } = await supabase
          .from("orders")
          .select("id")
          .lt("created_at", o.created_at)
          .order("created_at", { ascending: false })
          .limit(1);
        setNextId(next?.[0]?.id ?? null);
      }

      // Buyer history
      if (o?.phone) {
        const { count, error: countErr } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("phone", o.phone);
        if (!countErr) setBuyerOrdersCount(count ?? 0);
      }

      // Timeline (optional)
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

      // Storage attachments
      try {
        const { data: files } = await supabase.storage
          .from("order_proofs")
          .list(orderId, {
            limit: 50,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          });
        setAttachments((files as any) ?? []);
      } catch {
        setAttachments([]);
      }

      setLoading(false);
    })();
  }, [orderId]);

  const insertEvent = useCallback(
    async (type: OrderEvent["type"], payload: Record<string, any> = {}) => {
      try {
        await supabase
          .from("order_events")
          .insert({ order_id: orderId, type, payload });
        setEvents((prev) => [
          ...(prev ?? []),
          {
            id: safeUUID(),
            order_id: orderId,
            type,
            payload,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch {
        // ignore if table does not exist
      }
    },
    [orderId]
  );

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

    // Optional: decrement stock when marking as shipped
    if (next === "shipped" && decrementOnShip && order.products?.id) {
      await supabase.rpc?.("noop"); // harmless attempt to keep types happy if no rpc
      await supabase
        .from("products")
        .update({
          stock: Math.max(0, (order.products.stock ?? 0) - (order.qty ?? 0)),
        })
        .eq("id", order.products.id);
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

  // Editable address/city autosave
  useEffect(() => {
    if (!order) return;
    const t = setTimeout(async () => {
      await supabase
        .from("orders")
        .update({ address, city })
        .eq("id", order.id);
    }, 500);
    return () => clearTimeout(t);
  }, [address, city, order]);

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
  }, [notes, order, insertEvent]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!order) return;
      const k = e.key.toLowerCase();
      if (k === "p") {
        window.print();
      } else if (k === "c" && order.status === "pending") {
        updateStatus("confirmed");
      } else if (k === "s" && order.status === "confirmed") {
        updateStatus("shipped");
      } else if (k === "d" && order.status === "shipped") {
        updateStatus("delivered");
      } else if (
        k === "x" &&
        (order.status === "pending" || order.status === "confirmed")
      ) {
        updateStatus("cancelled");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [order]);

  if (!orderId) return <main className="p-4">Invalid order id.</main>;
  if (loading) return <main className="p-4">Loading…</main>;
  if (!order) return <main className="p-4">Order not found.</main>;

  const p = order.products ?? null;
  const phoneDigits = order.phone?.replace(/\D/g, "");
  const whatsappLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Salam! 👋 Your order "${p?.title ?? "—"}" (ID: ${order.id}) — how can I help?`
      )}`
    : null;

  const whatsappShip = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Good news! Your order "${p?.title ?? "—"}" has been shipped. Tracking: ${order.tracking_number ?? "-"}`
      )}`
    : null;
  const whatsappDeliver = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
        `Hello! Your order "${p?.title ?? "—"}" is out for delivery / delivered. Thank you!`
      )}`
    : null;

  const trackingDeepLink = tracking
    ? `https://www.google.com/search?q=${encodeURIComponent("track " + tracking)}`
    : null;

  const nextAction: { label: string; to: OrderStatus } | null =
    order.status === "pending"
      ? { label: "Mark as confirmed", to: "confirmed" }
      : order.status === "confirmed"
        ? { label: "Mark as shipped", to: "shipped" }
        : order.status === "shipped"
          ? { label: "Mark as delivered", to: "delivered" }
          : null;

  // Get public URL for storage file
  function filePublicURL(name: string) {
    const { data } = supabase.storage
      .from("order_proofs")
      .getPublicUrl(`${order.id}/${name}`);
    return data.publicUrl;
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const key = `${order.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from("order_proofs")
          .upload(key, file, {
            cacheControl: "3600",
            upsert: false,
          });
        if (error) throw error;
      }
      const { data: list } = await supabase.storage
        .from("order_proofs")
        .list(order.id, {
          limit: 50,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" },
        });
      setAttachments((list as any) ?? []);
      toast.success("Files uploaded");
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message });
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(name: string) {
    try {
      await supabase.storage
        .from("order_proofs")
        .remove([`${order.id}/${name}`]);
      setAttachments((xs) => xs.filter((f) => f.name !== name));
      toast.success("Attachment deleted");
    } catch (e: any) {
      toast.error("Delete failed", { description: e?.message });
    }
  }

  return (
    <main className="pb-28 md:pb-6 p-4 mx-auto max-w-3xl space-y-6 print:bg-white">
      {/* Nav row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/seller/orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Orders
          </Button>
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={!prevId}
              onClick={() => prevId && router.push(`/seller/orders/${prevId}`)}
              title="Previous (newer)"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={!nextId}
              onClick={() => nextId && router.push(`/seller/orders/${nextId}`)}
              title="Next (older)"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <Select
            value={printMode}
            onValueChange={(v) => setPrintMode(v as any)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="invoice">Print invoice</SelectItem>
              <SelectItem value="label">Print shipping label</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => window.print()}
            title="Print (P)"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 not-print">
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
            <div className="mt-1 flex items-center gap-2">
              <Link
                href={`/product/${p?.id ?? ""}`}
                className="text-xs underline"
              >
                View product
              </Link>
              {typeof p?.stock === "number" && (
                <span className="text-xs text-muted-foreground">
                  · Stock: {p.stock}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customization */}
      {(order.personalization || order.options) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.personalization ? (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Personalization
                </Label>
                <div className="whitespace-pre-wrap text-sm rounded-lg border border-black/5 bg-white px-3 py-2">
                  {order.personalization}
                </div>
              </div>
            ) : null}
            {order.options ? (
              <div>
                <Label className="text-xs text-muted-foreground">Options</Label>
                <OptionsList options={order.options} />
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

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
                          <MessageCircle className="h-4 w-4 mr-1" /> Chat
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
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(address);
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
              <Switch
                checked={paymentConfirmed}
                disabled={paymentConfirmed || savingPayment}
                onCheckedChange={(next) => {
                  if (!paymentConfirmed && next) setShowPaymentSheet(true);
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
                    action is permanent.
                  </SheetDescription>
                </SheetHeader>
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
                    onClick={async () => {
                      if (!order || paymentConfirmed) return;
                      setSavingPayment(true);
                      const { error } = await supabase
                        .from("orders")
                        .update({ payment_confirmed: true })
                        .eq("id", order.id);
                      setSavingPayment(false);
                      if (error) {
                        toast.error("Couldn’t mark as paid", {
                          description: error.message,
                        });
                        return;
                      }
                      setPaymentConfirmed(true);
                      setShowPaymentSheet(false);
                      await insertEvent("payment_confirmed", { value: true });
                      toast.success("Payment marked as confirmed ✅");
                    }}
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

          {/* Decrement stock toggle */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="dec-on-ship"
              checked={decrementOnShip}
              onCheckedChange={(v) => setDecrementOnShip(Boolean(v))}
            />
            <Label htmlFor="dec-on-ship" className="text-sm">
              Decrease product stock when marking as “Shipped”.
            </Label>
          </div>

          {/* WhatsApp quick templates */}
          <div className="flex flex-wrap gap-2">
            {whatsappShip && (
              <Button asChild variant="outline">
                <a href={whatsappShip} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1" /> Send shipping
                  message
                </a>
              </Button>
            )}
            {whatsappDeliver && (
              <Button asChild variant="outline">
                <a href={whatsappDeliver} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4 mr-1" /> Send delivery
                  message
                </a>
              </Button>
            )}
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

      {/* Attachments */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border px-3 py-2 bg-white hover:bg-sand cursor-pointer">
              <Upload className="h-4 w-4" />
              <span className="text-sm">
                {uploading ? "Uploading…" : "Upload files"}
              </span>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => uploadFiles(e.target.files)}
              />
            </label>
            <div className="text-xs text-muted-foreground">
              JPG/PNG/PDF — stored in <code>order_proofs</code>
            </div>
          </div>

          {!attachments.length ? (
            <div className="text-sm text-muted-foreground">
              No attachments yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {attachments.map((f) => {
                const url = filePublicURL(f.name);
                const isImg = /\.(png|jpe?g|gif|webp)$/i.test(f.name);
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-2 bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isImg ? (
                        <img
                          src={url}
                          alt={f.name}
                          className="w-10 h-10 rounded object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded grid place-items-center border text-xs">
                          PDF
                        </div>
                      )}
                      <a
                        href={url}
                        target="_blank"
                        className="truncate underline"
                      >
                        {f.name}
                      </a>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteFile(f.name)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <Clock className="h-4 w-4 mt-0.5" />
                <div>
                  Order placed
                  <div className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleString()}
                  </div>
                </div>
              </li>

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

      {/* Sticky mobile actions */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-3 not-print">
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

      {/* —— PRINT TEMPLATES —— */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 16mm;
          }
          .not-print {
            display: none !important;
          }
          body {
            background: #fff !important;
          }
        }
      `}</style>

      {/* Invoice */}
      <div
        className={printMode === "invoice" ? "print:block" : "print:hidden"}
        style={{ display: "none" }}
      >
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>Invoice</h2>
        <div style={{ fontSize: 12, marginBottom: 12 }}>
          <div>
            <b>Order ID:</b> {order.id}
          </div>
          <div>
            <b>Date:</b> {new Date(order.created_at).toLocaleString()}
          </div>
          <div>
            <b>Status:</b> {order.status}
          </div>
        </div>
        <hr />
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Ship To</div>
            <div>{order.phone ?? "-"}</div>
            <div>{address || "-"}</div>
            <div>{city || "-"}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Items</div>
            <div>{p?.title ?? "Product"}</div>
            <div>Qty {order.qty}</div>
            <div>Total MAD {order.amount_mad}</div>
          </div>
        </div>
      </div>

      {/* Shipping Label */}
      <div
        className={printMode === "label" ? "print:block" : "print:hidden"}
        style={{ display: "none" }}
      >
        <div style={{ border: "1px dashed #000", padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            SHIPPING LABEL
          </div>
          <div style={{ fontSize: 12 }}>
            <div>
              <b>Order:</b> {order.id}
            </div>
            <div>
              <b>To:</b> {address || "-"}, {city || "-"}
            </div>
            <div>
              <b>Phone:</b> {order.phone || "-"}
            </div>
            <div>
              <b>Item:</b> {p?.title ?? "-"}
            </div>
            <div>
              <b>Qty:</b> {order.qty}
            </div>
            <div>
              <b>Tracking:</b> {tracking || "-"}
            </div>
          </div>
        </div>
      </div>
    </main>
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
              <span className="text-muted-foreground">{group}</span>
              <span className="font-medium">
                {String(value)}
                <span className="ml-1 text-muted-foreground">{price}</span>
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
            <span className="text-muted-foreground">{k}</span>
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
