// app/seller/orders/[id]/page.tsx
"use client";

import React from "react";
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
  ChevronDown,
  FileText,
  Download,
  AlertTriangle,
  PackageX,
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
  SheetTrigger,
} from "@/components/ui/sheet";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

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
  stock?: number | null;
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

  personalization?: string | null;
  options?: any | null;

  payment_confirmed?: boolean | null;
  tracking_number?: string | null;
  seller_notes?: string | null;

  invoice_url?: string | null;
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

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

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

function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

export default function SellerOrderDetails() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = useMemo(
    () => (params?.id ? String(params.id) : ""),
    [params]
  );

  const didFetch = useRef(false);

  // ——— SHEETS (mutually exclusive) ———
  const [confirmOpen, setConfirmOpen] = useState(false); // advance sheet
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false); // cancel sheet
  const [nextChoice, setNextChoice] = useState<OrderStatus | "">("");

  const [order, setOrder] = useState<Order | null>(null);
  // ——— Loading UX control ———
  const [loading, setLoading] = useState(true);
  const [loadingShown, setLoadingShown] = useState(false);
  const loadSeq = useRef(0); // increments each fetch
  const showTimer = useRef<number | undefined>(undefined); // delay before showing spinner
  const hideTimer = useRef<number | undefined>(undefined); // min visible enforcement

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

  const [savingStatus, setSavingStatus] = useState(false);
  const [invUploading, setInvUploading] = useState(false);
  const [invRemoving, setInvRemoving] = useState(false);
  const saveNotesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const locked = order?.status === "cancelled";
  const reachedEnd = order?.status === "delivered";
  const nextOptions = useMemo(
    () => (order ? NEXT_STATUS[order.status] : []),
    [order]
  );

  function safeUUID(): string {
    try {
      if (typeof crypto !== "undefined") {
        if (typeof (crypto as any).randomUUID === "function") {
          return (crypto as any).randomUUID();
        }
        if (typeof crypto.getRandomValues === "function") {
          const b = new Uint8Array(16);
          crypto.getRandomValues(b);
          b[6] = (b[6] & 0x0f) | 0x40;
          b[8] = (b[8] & 0x3f) | 0x80;
          const toHex = (n: number) => n.toString(16).padStart(2, "0");
          const h = Array.from(b, toHex).join("");
          return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
        }
      }
    } catch {}
    return `id-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  // Load data
  useEffect(() => {
    if (!orderId) return;

    const seq = ++loadSeq.current; // token for this run
    setLoading(true);

    // delay showing spinner to avoid flash on ultra-fast loads
    window.clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => {
      // only show if still on the same run and still loading
      if (loadSeq.current === seq) setLoadingShown(true);
    }, 120);

    (async () => {
      const t0 = performance.now();

      const { data, error } = await supabase
        .from("orders")
        .select("*, products:products(*)")
        .eq("id", orderId)
        .maybeSingle();

      if (loadSeq.current !== seq) return; // stale result

      if (error) {
        console.error(error);
        toast.error("Failed to load order", { description: error.message });
        setOrder(null);
        // ensure at least 400ms visibility if spinner was shown
        const elapsed = performance.now() - t0;
        const settle = async () => {
          if (loadingShown) {
            const minVisible = 400;
            const sinceShow = performance.now() - t0;
            const remaining = Math.max(0, minVisible - sinceShow);
            await new Promise((r) => setTimeout(r, remaining));
          }
        };
        await settle();
        setLoading(false);
        setLoadingShown(false);
        return;
      }

      const o = (data as Order) ?? null;
      setOrder(o);
      setNotes(o?.seller_notes ?? "");
      setTracking(o?.tracking_number ?? "");
      setPaymentConfirmed(Boolean(o?.payment_confirmed));
      setAddress(o?.address ?? "");
      setCity(o?.city ?? "");

      // parallel dependent loads
      const [prevRes, nextRes, buyerCountRes, eventsRes, filesRes] =
        await Promise.all([
          o
            ? supabase
                .from("orders")
                .select("id")
                .gt("created_at", o.created_at)
                .order("created_at", { ascending: true })
                .limit(1)
            : Promise.resolve({ data: [] as any[] }),
          o
            ? supabase
                .from("orders")
                .select("id")
                .lt("created_at", o.created_at)
                .order("created_at", { ascending: false })
                .limit(1)
            : Promise.resolve({ data: [] as any[] }),
          o?.phone
            ? supabase
                .from("orders")
                .select("id", { count: "exact", head: true })
                .eq("phone", o.phone)
            : Promise.resolve({ count: 0 } as any),
          supabase
            .from("order_events")
            .select("*")
            .eq("order_id", orderId)
            .order("created_at", { ascending: true }),
          supabase.storage.from("order_proofs").list(orderId, {
            limit: 50,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          }),
        ]);

      if (loadSeq.current !== seq) return; // stale guard

      setPrevId((prevRes as any)?.data?.[0]?.id ?? null);
      setNextId((nextRes as any)?.data?.[0]?.id ?? null);
      setBuyerOrdersCount((buyerCountRes as any)?.count ?? 0);
      setEvents((eventsRes.data as OrderEvent[]) ?? null);
      setAttachments((filesRes.data as any) ?? []);

      // ensure spinner stays at least 400ms if it was shown
      const minVisible = 400;
      const sinceStart = performance.now() - t0;

      if (loadingShown && sinceStart < minVisible) {
        window.clearTimeout(hideTimer.current);
        hideTimer.current = window.setTimeout(() => {
          if (loadSeq.current === seq) {
            setLoading(false);
            setLoadingShown(false);
          }
        }, minVisible - sinceStart);
      } else {
        setLoading(false);
        setLoadingShown(false);
      }
    })();

    return () => {
      // cleanup timers when orderId changes or unmounts
      window.clearTimeout(showTimer.current);
      window.clearTimeout(hideTimer.current);
    };
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

  // ——— Mutually exclusive open helpers ———
  function openConfirmFor(choice: OrderStatus) {
    setNextChoice(choice);
    setConfirmCancelOpen(false); // close cancel sheet
    setConfirmOpen(true); // open advance sheet
  }
  function openCancelSheet() {
    setConfirmOpen(false); // close advance sheet
    setConfirmCancelOpen(true); // open cancel sheet
  }

  async function persistStatus(next: OrderStatus) {
    if (!order) return;
    const allowed = NEXT_STATUS[order.status];
    if (!allowed.includes(next)) {
      toast.error("This transition isn’t allowed");
      return;
    }

    setSavingStatus(true);
    const prev = order.status;

    const { data, error } = await supabase
      .from("orders")
      .update({ status: next })
      .eq("id", order.id)
      .select("id, status")
      .maybeSingle();

    setSavingStatus(false);

    if (error || !data) {
      toast.error("Failed to update status", {
        description: error?.message ?? "Try again.",
      });
      return;
    }

    if (next === "shipped" && order.products?.id) {
      await supabase
        .from("products")
        .update({
          stock: Math.max(0, (order.products.stock ?? 0) - (order.qty ?? 0)),
        })
        .eq("id", order.products.id);
    }

    setOrder((o) => (o ? { ...o, status: data.status as OrderStatus } : o));
    insertEvent("status_changed", { from: prev, to: next });
    toast.success(`Advanced to “${data.status}”`);
    setConfirmOpen(false);
    setConfirmCancelOpen(false);
    setNextChoice("");
  }

  async function cancelOrder() {
    if (!order) return;
    if (order.status === "cancelled") return;

    setSavingStatus(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" as OrderStatus })
      .eq("id", order.id);
    setSavingStatus(false);

    if (error) {
      toast.error("Could not cancel order", { description: error.message });
      return;
    }
    setOrder((o) => (o ? { ...o, status: "cancelled" } : o));
    insertEvent("status_changed", { from: order.status, to: "cancelled" });
    toast.success("Order cancelled");
    setConfirmCancelOpen(false);
    setConfirmOpen(false);
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

  // Keyboard shortcuts (respect one-way)
  // useEffect(() => {
  //   const onKey = (e: KeyboardEvent) => {
  //     if (!order || locked || reachedEnd) return;
  //     const k = e.key.toLowerCase();
  //     if (k === "p") {
  //       window.print();
  //     } else if (k === "c" && order.status === "pending") {
  //       openConfirmFor("confirmed");
  //     } else if (k === "s" && order.status === "confirmed") {
  //       openConfirmFor("shipped");
  //     } else if (k === "d" && order.status === "shipped") {
  //       openConfirmFor("delivered");
  //     } else if (
  //       k === "x" &&
  //       ["pending", "confirmed", "shipped"].includes(order.status)
  //     ) {
  //       openCancelSheet();
  //     }
  //   };
  //   window.addEventListener("keydown", onKey);
  //   return () => window.removeEventListener("keydown", onKey);
  // }, [order, locked, reachedEnd]);
  if (!orderId) return <main className="p-4">Invalid order id.</main>;
  if (loadingShown) return <OrderDetailsSkeleton />; // 👈 change here
  if (loading) return null; // waiting inside delay window
  if (!order) return <main className="p-4">Order not found.</main>;

  function OrderDetailsSkeleton() {
    return (
      <main className="p-4 mx-auto max-w-3xl h-[80vh] flex items-center justify-center">
        <Spinner className="h-10 w-10 text-[#371837]" />
      </main>
    );
  }

  function TimelineSkeleton() {
    return (
      <div className="flex items-center w-full">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center min-w-16 flex-1">
            <div className="flex flex-col items-center">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="mt-1 h-3 w-14 rounded" />
            </div>
            {i < 3 && (
              <div className="h-px mx-3 flex-1 self-center bg-neutral-200" />
            )}
          </div>
        ))}
      </div>
    );
  }

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

  function filePublicURL(name: string) {
    if (!order) return "";
    const { data } = supabase.storage
      .from("order_proofs")
      .getPublicUrl(`${order.id}/${name}`);
    return data.publicUrl;
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !files.length || !order) return;
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
    if (!order) return;
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

  function generatePrintableInvoice() {
    if (!order) return;
    const doc = `
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Invoice #${order.id}</title>
          <style>
            body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; color: #111; }
            h1 { font-size: 20px; margin: 0 0 8px; }
            .row { margin-bottom: 6px; }
            .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
            .muted { color: #666; }
            .box { border: 1px solid #e5e5e5; padding: 12px; border-radius: 10px; }
          </style>
        </head>
        <body>
          <h1>Invoice</h1>
          <div class="box">
            <div class="row"><strong>Order ID:</strong> <span class="mono">#${order.id}</span></div>
            <div class="row"><strong>Placed on:</strong> ${new Date(order.created_at).toLocaleString()}</div>
            <div class="row"><strong>Status:</strong> ${order.status}</div>
            <div class="row"><strong>Ship to:</strong> ${order.phone ?? "—"} · ${order.address ?? "—"} · ${order.city ?? "—"}</div>
            <div class="row"><strong>Item:</strong> ${order.products?.title ?? "—"} (Qty ${order.qty})</div>
            <div class="row"><strong>Total:</strong> MAD ${order.amount_mad}</div>
          </div>
          <p class="muted">Generated from dashboard — print or save as PDF.</p>
          <script>window.print()</script>
        </body>
      </html>
    `;
    const w = window.open(
      "",
      "_blank",
      "noopener,noreferrer,width=800,height=900"
    );
    if (w) {
      w.document.open();
      w.document.write(doc);
      w.document.close();
    }
  }

  // Upload invoice to `invoices` bucket and save public URL on the order
  async function onUploadInvoice(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    if (!["pdf", "png", "jpg", "jpeg"].includes(ext)) {
      toast.error("Only PDF/JPG/PNG are allowed");
      e.currentTarget.value = "";
      return;
    }

    try {
      setInvUploading(true);

      // path: invoices/<orderId>/<timestamp>-<filename>
      const path = `${order.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("invoices")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (upErr) throw upErr;

      const { data: pub } = await supabase.storage
        .from("invoices")
        .getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      const { error: updErr } = await supabase
        .from("orders")
        .update({ invoice_url: publicUrl })
        .eq("id", order.id);

      if (updErr) throw updErr;

      setOrder((o) => (o ? { ...o, invoice_url: publicUrl } : o));
      toast.success("Invoice uploaded");
    } catch (err: any) {
      toast.error("Failed to upload invoice", { description: err?.message });
    } finally {
      setInvUploading(false);
      // allow selecting the same file again if needed
      e.currentTarget.value = "";
    }
  }

  async function removeInvoice() {
    if (!order?.invoice_url) return;
    setInvRemoving(true);
    try {
      // Extract the file path from the public URL or use order.id
      const { error } = await supabase
        .from("orders")
        .update({ invoice_url: null })
        .eq("id", order.id);

      if (error) throw error;
      setOrder((o) => (o ? { ...o, invoice_url: null } : o));
      toast.success("Invoice removed");
    } catch (err: any) {
      toast.error("Failed to remove invoice", { description: err?.message });
    } finally {
      setInvRemoving(false);
    }
  }

  return (
    <main className="  md:pb-6 p-4 mx-auto max-w-3xl space-y-6 print:bg-white pb-48">
      {/* Nav row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center justify-between w-full">
          <div>
            {" "}
            <Button
              variant="outline"
              onClick={() => router.push("/seller/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Orders
            </Button>
          </div>

          <div className="flex items-center gap-">
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

        {/* (Advance select removed for now) */}
      </div>

      {/* Header */}
      <div className="not-print">
        <h1 className="text-[22px] sm:text-[24px] font-semibold leading-tight tracking-tight text-ink">
          {p?.title ?? "Order"}
        </h1>

        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-[84px_1fr] items-center gap-x-4">
            <div className="text-sm text-ink/60">Order ID</div>
            <div className="flex items-center gap-2 min-w-0">
              <code className="px-2 py-0.5 rounded-md bg-muted text-[13px] break-all">
                #{order.id}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(order.id);
                  toast.success("Order ID copied");
                }}
                className="text-ink/60 hover:text-ink transition"
                aria-label="Copy order ID"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-[84px_1fr] items-center gap-x-4">
            <div className="text-sm text-ink/60">Placed</div>
            <div className="text-sm text-ink/80">
              {new Date(order.created_at).toLocaleString("en-US", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </div>
          </div>

          <div className="grid grid-cols-[84px_1fr] items-center gap-x-4">
            <div className="text-sm text-ink/60">Status</div>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[13px] capitalize">
                {statusIcon(order.status)}
                {order.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mt-4">
        <StatusTimeline status={order.status} />
      </div>

      {/* Item */}
      <Card className="mt-5 shadow-none  p-0">
        <CardHeader className="pb-2">
          <CardTitle className="text-base p-0">Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-0">
            {p?.photos?.[0] ? (
              <img
                src={p.photos[0]}
                alt={p.title}
                className="h-12 w-12 rounded-lg object-cover border"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg grid place-items-center border text-[11px] text-ink/60">
                No img
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">
                {p?.title ?? "Product"}
              </div>
              <div className="text-xs text-ink/60 mt-0.5">
                Qty {order.qty} · MAD {order.amount_mad}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                href={`/product/${p?.id ?? ""}`}
                className="text-xs underline text-ink/80 hover:text-ink"
              >
                View
              </Link>
              {typeof p?.stock === "number" && (
                <span className="text-xs text-ink/60">· Stock {p.stock}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(order.personalization || order.options) && (
        <Card className="shadow-none border rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.personalization ? (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Personalization
                </Label>
                <div className="whitespace-pre-wrap text-sm rounded-lg border bg-white px-3 py-2">
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
      <Card className="shadow-none border rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Buyer & Payment</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Phone */}
          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="flex items-center gap-2">
              <Input
                className="h-10 rounded-lg"
                value={order.phone ?? "—"}
                readOnly
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  navigator.clipboard.writeText(order.phone ?? "");
                  toast.success("Phone copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            {(phoneDigits || whatsappLink) && (
              <div className="mt-2 flex items-center gap-2">
                {phoneDigits && (
                  <Button asChild variant="outline" className="h-9 rounded-lg">
                    <a href={`tel:${phoneDigits}`}>
                      <Phone className="h-4 w-4 mr-1" />
                      Call
                    </a>
                  </Button>
                )}
                {whatsappLink && (
                  <Button asChild className="h-9 rounded-lg">
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              className="h-10 rounded-lg cursor-default select-text"
              onChange={(e) => setCity(e.target.value)}
              value={city ?? "—"}
              readOnly
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label>Address</Label>
            <div className="flex items-center gap-2">
              <Input
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 rounded-lg cursor-default select-text"
                value={address ?? "—"}
                readOnly
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Payment method */}
          <div className="space-y-1">
            <Label>Payment method</Label>
            <p className="text-sm text-muted-foreground">Cash on Delivery</p>
          </div>

          {/* Payment confirmed block */}
          <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
            <div>
              <div className="text-sm font-medium">Payment confirmed</div>
              <p className="text-xs text-muted-foreground">
                One-way action — cannot be undone.
              </p>
            </div>
            <Switch
              checked={paymentConfirmed}
              disabled={paymentConfirmed || savingPayment}
              onCheckedChange={(next) => {
                if (!paymentConfirmed && next) setShowPaymentSheet(true);
              }}
              aria-label="Toggle payment confirmed"
            />
          </div>

          {/* Confirmation Sheet (Payment) */}
          <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
            <SheetContent side="bottom" className="sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Confirm payment?</SheetTitle>
                <SheetDescription>
                  This will mark the order as <strong>paid</strong>. This action
                  is permanent.
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
        </CardContent>
      </Card>

      {/* Fulfillment */}
      <Card className="shadow-none border rounded-xl">
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

      {/* Invoice */}
      <Card className="shadow-none border rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.invoice_url ? (
            <div className="flex items-center gap-2">
              <a
                href={order.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm underline underline-offset-2"
              >
                <FileText className="h-4 w-4" />
                View invoice
              </a>
              <a
                href={order.invoice_url}
                download
                className="inline-flex items-center gap-2 text-sm"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <Button
                variant="ghost"
                className="h-8 px-2 rounded-full"
                onClick={removeInvoice}
                disabled={invRemoving}
              >
                {invRemoving ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No invoice attached.
            </div>
          )}

          <div className="flex items-center gap-3">
            <label
              htmlFor="invoice-file"
              className="inline-flex items-center gap-2 text-sm px-3 h-9 rounded-full border bg-white cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              {invUploading
                ? "Uploading…"
                : order.invoice_url
                  ? "Replace"
                  : "Upload"}
            </label>
            <Input
              id="invoice-file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={onUploadInvoice}
              disabled={invUploading}
            />

            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-full text-sm"
              onClick={generatePrintableInvoice}
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate (print)
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Stored in <code>invoices</code> bucket (public).
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="shadow-none border rounded-xl">
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
      <Card className="shadow-none border rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Attachments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border px-3 py-2 bg-white cursor-pointer">
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
        <Card className="shadow-none border rounded-xl">
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

        <Card className="shadow-none border rounded-xl">
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

        <Button
          variant="outline"
          className="h-9 rounded-full text-sm text-red-600 border border-red-500 py-5 mt-4"
          onClick={openCancelSheet}
          disabled={locked || reachedEnd || savingStatus}
        >
          <PackageX className="mr-2 h-4 w-4" />
          Cancel this order
        </Button>
      </div>

      {/* Sticky mobile actions */}
      <div className="fixed bottom-11 left-0 right-0 border-t border-b bg-background/95 backdrop-blur p-3 not-print">
        {nextAction && !locked && !reachedEnd && (
          <Button
            className="w-full py-5"
            onClick={() => openConfirmFor(nextAction.to)}
            disabled={savingStatus}
          >
            {statusIcon(nextAction.to)}{" "}
            <span className=" ">{nextAction.label}</span>
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

      {/* Invoice Print */}
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

      {/* Advance Status — rounded bottom sheet (mutually exclusive) */}
      <Sheet
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (open) {
            setConfirmCancelOpen(false);
          } else {
            setNextChoice("");
          }
        }}
      >
        <SheetTrigger asChild>
          <button className="hidden" />
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className={cn(
            "max-w-screen-sm mx-auto",
            "rounded-t-2xl bg-white shadow-2xl border-t border-ink/10",
            "px-0 pt-2 pb-[env(safe-area-inset-bottom)]",
            "[&>button[data-radix-sheet-close]]:hidden"
          )}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />

          <div className="px-4 pt-2 pb-3">
            <div
              className={cn(
                "mt-3 rounded-xl border px-3 py-2 text-[13px] flex items-start gap-2",
                nextChoice === "cancelled"
                  ? "border-red-200 bg-red-50/70 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              )}
            >
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="leading-snug">
                {nextChoice === "cancelled"
                  ? "Cancelling is permanent. You won’t be able to take further actions on this order."
                  : "This move is permanent. You won’t be able to return to a previous step."}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-3 mt-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-10 w-10 grid place-items-center rounded-full border",
                    nextChoice === "cancelled"
                      ? "text-red-600 border-red-400/60 bg-red-50"
                      : "text-ink border-ink/30 bg-neutral-50"
                  )}
                >
                  {
                    {
                      pending: <Clock className="h-5 w-5" />,
                      confirmed: <CheckCircle2 className="h-5 w-5" />,
                      shipped: <Truck className="h-5 w-5" />,
                      delivered: <PackageCheck className="h-5 w-5" />,
                      cancelled: <Ban className="h-5 w-5" />,
                    }[nextChoice || "pending"]
                  }
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold capitalize">
                      {nextChoice || "—"}
                    </div>
                    <span
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border",
                        nextChoice === "cancelled"
                          ? "border-red-400/60 text-red-700 bg-red-50"
                          : "border-ink/20 text-ink/70 bg-neutral-50"
                      )}
                    >
                      One-way
                    </span>
                  </div>
                  <div className="text-[13px] text-ink/70">
                    {nextChoice === "confirmed" &&
                      "Buyer confirmed — prepare shipment."}
                    {nextChoice === "shipped" && "Package handed to carrier."}
                    {nextChoice === "delivered" && "Order delivered to buyer."}
                    {nextChoice === "cancelled" &&
                      "Order will be locked after cancelling."}
                    {!nextChoice && "Select a next step to continue."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-ink/10 mb-1" />

          <div className="px-1 flex mt-4">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={savingStatus}
              className="w-full h-12 mx-3 mb-3 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-sand/50 active:bg-sand transition border"
            >
              <span className="text-[15px] font-medium">Cancel</span>
            </button>
            <button
              onClick={() => nextChoice && persistStatus(nextChoice)}
              disabled={!nextChoice || savingStatus}
              className={cn(
                "w-full h-12 mx-3 mb-2 px-4 rounded-xl flex items-center justify-center gap-3 transition",
                nextChoice === "cancelled"
                  ? "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400"
                  : "bg-ink text-white hover:bg-black",
                savingStatus && "opacity-80"
              )}
            >
              {savingStatus ? (
                <Clock className="h-5 w-5 animate-spin" />
              ) : (
                statusIcon((nextChoice || "pending") as OrderStatus)
              )}
              <span className="text-[15px] font-medium">Confirm</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Order — rounded bottom sheet (mutually exclusive) */}
      <Sheet
        open={confirmCancelOpen}
        onOpenChange={(open) => {
          setConfirmCancelOpen(open);
          if (open) setConfirmOpen(false);
        }}
      >
        <SheetTrigger asChild>
          <button className="hidden" />
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className={cn(
            "max-w-screen-sm mx-auto",
            "rounded-t-2xl bg-white shadow-2xl border-t border-ink/10",
            "px-0 pt-2 pb-[env(safe-area-inset-bottom)]",
            "[&>button[data-radix-sheet-close]]:hidden"
          )}
        >
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />

          <div className="px-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-md overflow-hidden bg-sand/50 shrink-0">
                {p?.photos?.[0] ? (
                  <img
                    src={p.photos[0]}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-sand" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="font-medium text-[15px] text-ink truncate">
                  {p?.title ?? "Order"}
                </div>
                <div className="mt-0.5 text-xs text-ink/70 flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                    #{order.id.slice(0, 8)}
                  </span>
                  <span>·</span>
                  <span>MAD {order.amount_mad}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-px bg-ink/10 mb-1" />

          <div className="px-4 pt-2 pb-3">
            <div className="rounded-2xl border bg-red-50 p-3 border-red-200">
              <div className="flex items-center gap-3 text-red-700">
                <Ban className="h-5 w-5" />
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold">
                    Cancel this order
                  </div>
                  <div className="text-[13px]">
                    Cancelling is permanent. You won’t be able to take further
                    actions.
                  </div>
                </div>
              </div>
            </div>

            {/* <div className="mt-3 rounded-xl border border-red-200 bg-red-50/70 px-3 py-2 text-[13px] text-red-800 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="leading-snug">
                Are you sure you want to cancel?
              </div>
            </div> */}
          </div>

          <div className="h-px bg-ink/10 mb-1" />

          <div className="px-1 flex">
            <button
              onClick={() => setConfirmCancelOpen(false)}
              className="w-full h-12 mx-3 mb-3 px-4 rounded-xl flex items-center justify-center gap-3 border hover:bg-sand/50 active:bg-sand transition"
            >
              <span className="text-[15px] font-medium">Back</span>
            </button>

            <button
              onClick={cancelOrder}
              disabled={savingStatus}
              className="w-full h-12 mx-3 mb-2 px-4 rounded-xl flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white transition disabled:bg-red-400"
            >
              {savingStatus ? (
                <Clock className="h-5 w-5 animate-spin" />
              ) : (
                <Ban className="h-5 w-5" />
              )}
              <span className="text-[15px] font-medium">
                Confirm Cancellation
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
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
      <ul className="text-sm rounded-lg border bg-white px-3 py-2 space-y-1">
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
      <ul className="text-sm rounded-lg border bg-white px-3 py-2 space-y-1">
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
    <div className="text-sm rounded-lg border bg-white px-3 py-2">
      {String(options)}
    </div>
  );
}

/* ==========================================
   StatusTimeline — cancelled replaces next step
   ========================================== */
function StatusTimeline({
  status,
  prev,
}: {
  status: OrderStatus;
  prev?: Exclude<OrderStatus, "cancelled">;
}) {
  const flow: Exclude<OrderStatus, "cancelled">[] = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
  ];

  const ICONS: Record<OrderStatus, React.ReactElement> = {
    pending: <Clock className="h-4 w-4" />,
    confirmed: <CheckCircle2 className="h-4 w-4" />,
    shipped: <Truck className="h-4 w-4" />,
    delivered: <PackageCheck className="h-4 w-4" />,
    cancelled: <Ban className="h-4 w-4" />,
  };

  const currentIndex =
    status === "cancelled"
      ? -1
      : flow.indexOf(status as Exclude<OrderStatus, "cancelled">);

  const cancelIndex = (() => {
    if (status !== "cancelled") return -1;
    const prevIdx = flow.indexOf(prev ?? "pending");
    return Math.min(prevIdx + 1, flow.length - 1);
  })();

  return (
    <div className="mt-4 w-full select-none">
      <div className="flex items-center w-full">
        {flow.map((step, i) => {
          const isLast = i === flow.length - 1;
          const isCancelledPoint = status === "cancelled" && i === cancelIndex;
          const isDone =
            status !== "cancelled" ? i < currentIndex : i < cancelIndex;
          const isCurrent = status !== "cancelled" && i === currentIndex;

          let circle = "bg-white text-ink/30 border-ink/20";
          let label = "text-ink/40";
          let connector = "bg-ink/20";

          if (isCancelledPoint) {
            circle = "bg-white text-red-600 border-red-500";
            label = "text-red-600";
            connector = "bg-ink/20";
          } else if (isDone || (isCurrent && step === "delivered")) {
            // delivered filled + completed filled
            circle = "bg-ink text-white border-ink";
            label = "text-ink";
            connector = "bg-ink";
          } else if (isCurrent) {
            circle = "bg-white text-ink border-ink";
            label = "text-ink";
            connector = "bg-ink/20";
          }

          return (
            <div
              key={step}
              className={cn("flex items-center min-w-16", !isLast && "flex-1")}
            >
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-9 w-9 grid place-items-center rounded-full border",
                    circle
                  )}
                >
                  {isCancelledPoint ? ICONS.cancelled : ICONS[step]}
                </div>
                <div className={cn("mt-1 text-[13px]", label)}>
                  {isCancelledPoint ? "Cancelled" : capitalize(step)}
                </div>
              </div>

              {!isLast && (
                <div
                  className={cn("h-px mx-3 flex-1 self-center", connector)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
