"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";

export default function SellerOrderDetails() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("id", id)
        .maybeSingle();
      if (!error) setOrder(data);
      setLoading(false);
    })();
  }, [id]);

  async function updateStatus(status: string) {
    if (!order) return;
    setSaving(true);
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order.id);
    setSaving(false);
    if (error) alert(error.message);
    else setOrder({ ...order, status });
  }

  if (loading) return <main className="p-4">Loading…</main>;
  if (!order) return <main className="p-4">Order not found.</main>;

  const p = order.products;
  const phone = order.phone?.replace(/\D/g, ""); // only digits for WhatsApp link
  const whatsappLink = phone
    ? `https://wa.me/${phone}?text=Salam! 👋 I'm contacting you about your order "${p?.title}"`
    : null;

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order details</h1>

      <div className="rounded-lg border p-3 flex items-center gap-3 bg-paper/50">
        {p?.photos?.[0] ? (
          <img
            src={p.photos[0]}
            alt={p.title}
            className="w-20 h-20 object-cover rounded-lg"
          />
        ) : (
          <div className="w-20 h-20 bg-neutral-100 rounded-lg grid place-items-center text-sm text-neutral-500">
            No image
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium">{p?.title}</div>
          <div className="text-sm text-neutral-600">
            {order.qty} × MAD {order.amount_mad}
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Buyer Phone:</span> {order.phone}
        </div>
        <div>
          <span className="font-medium">City:</span> {order.city}
        </div>
        <div>
          <span className="font-medium">Address:</span> {order.address}
        </div>
        <div>
          <span className="font-medium">Payment:</span> Cash on Delivery
        </div>
        <div>
          <span className="font-medium">Status:</span>{" "}
          <span className="capitalize">{order.status}</span>
        </div>
      </div>

      {whatsappLink && (
        <div className="flex gap-2">
          <a
            href={`tel:${phone}`}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium hover:bg-neutral-50"
          >
            <Phone size={18} /> Call
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 text-white px-4 py-3 font-medium"
          >
            <MessageCircle size={18} /> WhatsApp
          </a>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["pending", "confirmed", "shipped", "delivered"].map((s) => (
          <button
            key={s}
            onClick={() => updateStatus(s)}
            disabled={saving || order.status === s}
            className={`px-3 py-2 rounded-full border text-sm ${
              order.status === s
                ? "bg-terracotta text-white border-terracotta"
                : "bg-white hover:bg-neutral-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Link
        href="/seller/orders"
        className="block text-center text-sm underline"
      >
        Back to orders
      </Link>
    </main>
  );
}
