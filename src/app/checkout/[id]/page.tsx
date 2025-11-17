"use client";

import RequireAuth from "@/components/RequireAuth";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function Checkout() {
  return (
    <RequireAuth>
      <CheckoutInner />
    </RequireAuth>
  );
}

function CheckoutInner() {
  const { id } = useParams<{ id: string }>();
  const _id = (id ?? "").toString().trim();

  const [p, setP] = useState<any>(null);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Casablanca");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!_id) return;

    supabase
      .from("products")
      .select("*")
      .eq("id", _id)
      .maybeSingle()
      .then(({ data }) => setP(data));
  }, [_id]);

  async function placeOrder() {
    if (!_id) {
      setMsg("Invalid product id");
      return;
    }

    setMsg(null);
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setMsg("Please login at /login");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({
        product_id: _id,
        buyer: user.id,
        qty: 1,
        amount_mad: p?.price_mad,
        address,
        city,
        phone,
        payment_method: "COD",
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      console.error("Failed to create order", error);
      setMsg("Something went wrong. Please try again.");
      return;
    }

    // ✅ Here TypeScript knows `data` is not null
    window.location.href = `/thank-you?o=${data.id}`;
  } // 🔥 this brace was missing before

  // these were accidentally inside placeOrder because of the missing brace
  if (!_id) return <main className="p-4">Error: No product id provided</main>;
  if (!p) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Checkout · {p.title}</h1>

      <div className="space-y-2">
        <input
          className="w-full rounded-xl border p-3"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className="w-full rounded-xl border p-3"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border p-3"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <button
        onClick={placeOrder}
        disabled={loading}
        className="w-full rounded-xl px-4 py-3 font-medium bg-terracotta text-white"
      >
        {loading ? "Placing…" : `Place COD order · MAD ${p.price_mad}`}
      </button>

      {msg && <p className="text-sm text-ink/70">{msg}</p>}

      <Link
        href={`/product/${p.id}`}
        className="text-sm underline block text-center mt-3"
      >
        Back
      </Link>
    </main>
  );
}
