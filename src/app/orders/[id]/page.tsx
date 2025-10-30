"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";

export default function BuyerOrderPage() {
  return (
    <RequireAuth>
      <OrderInner />
    </RequireAuth>
  );
}

function OrderInner() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const _id = (id ?? "").toString().trim();
    if (!_id) return;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("id", _id)
        .maybeSingle();

      if (!error) setOrder(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <main className="p-4">Loading…</main>;
  if (!order) return <main className="p-4">Order not found.</main>;

  const p = order.products;
  const img = Array.isArray(p?.photos) ? p.photos[0] : undefined;

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order details</h1>

      <div className="rounded-xl border bg-sand p-3 flex gap-3 items-center">
        {img ? (
          <img
            src={img}
            alt={p?.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-neutral-100 rounded-lg" />
        )}
        <div>
          <div className="font-medium">{p?.title}</div>
          <div className="text-sm text-ink/70">
            {order.qty} × MAD {p?.price_mad}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">City:</span> {order.city}
        </p>
        <p>
          <span className="font-medium">Address:</span> {order.address}
        </p>
        <p>
          <span className="font-medium">Payment:</span> Cash on Delivery
        </p>
        <p>
          <span className="font-medium">Status:</span>{" "}
          <StatusBadge status={order.status} />
        </p>
      </div>

      {order.phone && (
        <div className="flex gap-2 mt-3">
          <a
            href={`tel:${order.phone}`}
            className="flex-1 text-center border rounded-xl px-4 py-3 font-medium"
          >
            📞 Call Seller
          </a>
          <a
            href={`https://wa.me/${order.phone.replace(
              /\D/g,
              ""
            )}?text=${encodeURIComponent(
              `Salam! I'm contacting you about my order for "${p?.title}" (MAD ${p?.price_mad}).`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center rounded-xl px-4 py-3 font-medium bg-green-500 text-white"
          >
            💬 WhatsApp
          </a>
        </div>
      )}

      <Link
        href="/orders"
        className="block text-center text-sm underline text-ink/70 mt-4"
      >
        Back to my orders
      </Link>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
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
