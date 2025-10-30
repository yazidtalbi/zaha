"use client";

import RequireAuth from "@/components/RequireAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "sonner";

type Product = {
  id: string;
  title: string;
  price_mad: number;
  active: boolean;
  photos: string[] | null;
  created_at: string;
  shop_id: string;
  deleted_at: string | null;
};

export default function EditProductPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<number | string>("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    const pid = (id ?? "").toString();
    if (!pid) return;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,title,price_mad,active,photos,created_at,shop_id,deleted_at"
        )
        .eq("id", pid)
        .maybeSingle();

      if (error) {
        console.error(error);
        toast.error("Failed to load product", { description: error.message });
      }
      if (data) {
        setProduct(data as Product);
        setTitle(data.title ?? "");
        setPrice(data.price_mad ?? 0);
        setActive(!!data.active && !data.deleted_at); // if deleted, treat as inactive
      }
      setLoading(false);
    })();
  }, [id]);

  async function save() {
    if (!product) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const priceNumber = Number(price);
    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      toast.error("Price must be a positive number");
      return;
    }

    setSaving(true);
    const updates: Partial<Product> = {
      title: title.trim(),
      price_mad: priceNumber,
      active,
      // never touch deleted_at from here (soft delete is a separate action)
    };

    const { error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", product.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to save", { description: error.message });
    } else {
      toast.success("Product updated ✅");
      router.push("/seller/products");
    }
  }

  async function softDelete() {
    if (!product) return;
    if (!confirm("Remove this product from the store? (soft delete)")) return;

    const { error } = await supabase
      .from("products")
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      toast.error("Failed to remove", { description: error.message });
    } else {
      toast("Product removed from store");
      router.push("/seller/products");
    }
  }

  if (loading) return <main className="p-4">Loading…</main>;
  if (!product) {
    return (
      <main className="p-4 space-y-3">
        <p>Product not found.</p>
        <Link className="underline text-sm" href="/seller/products">
          Back to products
        </Link>
      </main>
    );
  }

  const removed = !!product.deleted_at;

  return (
    <main className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit product</h1>
        <Link className="underline text-sm" href="/seller/products">
          Back
        </Link>
      </header>

      {removed && (
        <div className="rounded-xl border bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          This product is removed from the store. You can still edit its data,
          but customers won’t see it.
        </div>
      )}

      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm">Title</span>
          <input
            className="w-full rounded-xl border bg-paper px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">Price (MAD)</span>
          <input
            className="w-full rounded-xl border bg-paper px-3 py-2"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={removed}
          />
          Active (visible in store)
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm bg-paper hover:bg-white"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          {!removed ? (
            <button
              onClick={softDelete}
              className="text-sm underline text-rose-600"
            >
              Remove from store
            </button>
          ) : null}
        </div>
      </div>
    </main>
  );
}
