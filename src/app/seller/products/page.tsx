"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Product = {
  id: string;
  title: string;
  price_mad: number;
  active: boolean;
  photos: string[] | null;
  created_at: string;
  shop_id: string;
};

export default function SellerProducts() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [rows, setRows] = useState<Product[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Get current shop ID
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: shop, error } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      if (shop) setShopId(shop.id);
      setLoading(false);
    })();
  }, []);

  // 2) Load products
  async function loadProducts(sid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("id,title,price_mad,active,photos,created_at,shop_id")
      .eq("shop_id", sid)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setRows((data as any[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (shopId) loadProducts(shopId);
  }, [shopId]);

  // 3) Actions
  async function toggleActive(id: string, nextActive: boolean) {
    setBusyId(id);
    const { error } = await supabase
      .from("products")
      .update({ active: nextActive })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update product", { description: error.message });
    } else {
      setRows((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: nextActive } : p))
      );
      toast.success(
        `Product ${nextActive ? "activated" : "deactivated"} successfully ✅`
      );
    }
    setBusyId(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    setBusyId(id);
    const { error } = await supabase
      .from("products")
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete", { description: error.message });
    } else {
      setRows((prev) => prev.filter((p) => p.id !== id));
      toast("🗑️ Product deleted");
    }
    setBusyId(null);
  }

  const counts = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.active).length;
    return { total, active, inactive: total - active };
  }, [rows]);

  if (loading) return <main className="p-4">Loading…</main>;

  if (!shopId)
    return (
      <main className="p-4 space-y-2">
        <h1 className="text-xl font-semibold">My Products</h1>
        <p className="text-sm text-ink/70">
          You don’t have a shop yet. Create your first product from{" "}
          <Link href="/sell" className="underline">
            /sell
          </Link>
          .
        </p>
      </main>
    );

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Products</h1>
          <p className="text-xs text-ink/60">
            {counts.total} total · {counts.active} active · {counts.inactive}{" "}
            inactive
          </p>
        </div>
        <Link
          href="/sell"
          className="rounded-xl border px-3 py-2 text-sm bg-paper hover:bg-white"
        >
          + Add new
        </Link>
      </header>

      {!rows.length ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => {
            const img = Array.isArray(p.photos) ? p.photos[0] : undefined;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 border rounded-xl p-3 bg-sand"
              >
                <div className="w-14 h-14 rounded-lg bg-white overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-ink/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/product/${p.id}`}
                      className="font-medium truncate hover:underline"
                    >
                      {p.title}
                    </Link>
                    <StatusBadge active={p.active} />
                  </div>
                  <div className="text-xs text-ink/70">
                    MAD {p.price_mad} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>

                <label className="text-xs flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!p.active}
                    disabled={busyId === p.id}
                    onChange={(e) => toggleActive(p.id, e.target.checked)}
                  />
                  Active
                </label>

                <Link
                  href={`/seller/edit/${p.id}`}
                  className="text-xs underline"
                >
                  Edit
                </Link>

                <button
                  onClick={() => remove(p.id)}
                  disabled={busyId === p.id}
                  className="text-xs underline text-rose-600"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`text-[11px] rounded-full px-2 py-0.5 ${
        active
          ? "bg-green-200 text-green-900"
          : "bg-neutral-200 text-neutral-700"
      }`}
    >
      {active ? "active" : "inactive"}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-sand p-6 text-center">
      <div className="text-sm text-ink/70">No products yet.</div>
      <Link
        href="/sell"
        className="inline-block mt-3 rounded-xl border px-4 py-2 text-sm bg-paper hover:bg-white"
      >
        Add your first product
      </Link>
    </div>
  );
}
