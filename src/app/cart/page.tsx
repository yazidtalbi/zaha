// app/cart/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// ————————————————————————————
// Types
// ————————————————————————————
type Store = {
  id: string;
  title: string | null;
  avatar_url: string | null;
};

type Product = {
  id: string;
  title: string;
  price_mad: number;
  photos: string[] | null;
  active: boolean;
  deleted_at: string | null;
  shop_id?: string;
  shops?: Store | null; // nested via FK products.shop_id -> shops.id
};

type CartRow = {
  id: string;
  qty: number;
  product_id: string;

  // your buyer selections
  options: any | null; // jsonb
  personalization: string | null; // text

  products: Product | null;
};

type UiCartRow = {
  id: string;
  qty: number;
  product_id: string;
  title?: string;
  price_mad?: number;
  photos?: string[] | null;
  store_title?: string | null;
  store_avatar?: string | null;
  options_badges?: string[];
  personalization_text?: string | null;
  removed: boolean;
};

// ————————————————————————————
// Component
// ————————————————————————————
export default function CartPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [rows, setRows] = useState<UiCartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Load cart with product + shop + buyer selections
  useEffect(() => {
    (async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("cart_items")
        .select(
          `
          id,
          qty,
          product_id,
          options,
          personalization,
          products (
            id,
            title,
            price_mad,
            photos,
            active,
            deleted_at,
            shop_id,
            shops (
              id,
              title,
              avatar_url
            )
          )
        `
        )
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        toast.error("Failed to load cart", { description: error.message });
        setLoading(false);
        return;
      }

      const mapped: UiCartRow[] = (data ?? []).map((row: CartRow) => {
        const p = row.products;
        const removed = !p?.active || !!p?.deleted_at;

        // safe option mapping
        const badges: string[] = [];
        const opts = row.options;
        if (opts) {
          if (Array.isArray(opts)) {
            for (const o of opts) {
              if (o?.group && o?.value) badges.push(`${o.group}: ${o.value}`);
            }
          } else if (typeof opts === "object") {
            for (const [k, v] of Object.entries(opts)) {
              if (v != null && v !== "") badges.push(`${k}: ${v}`);
            }
          }
        }

        return {
          id: row.id,
          qty: row.qty,
          product_id: row.product_id,
          title: p?.title,
          price_mad: p?.price_mad,
          photos: p?.photos,
          store_title: p?.shops?.title ?? null,
          store_avatar: p?.shops?.avatar_url ?? null,
          options_badges: badges ?? [],
          personalization_text: row.personalization ?? null,
          removed,
        };
      });

      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  // Totals
  const totals = useMemo(() => {
    const subtotal = rows.reduce((acc, r) => {
      if (r.removed || !r.price_mad) return acc;
      return acc + r.price_mad * r.qty;
    }, 0);
    const removedCount = rows.filter((r) => r.removed).length;
    return { subtotal, removedCount };
  }, [rows]);

  async function updateQty(id: string, newQty: number) {
    if (newQty < 1) return;
    setBusyId(id);
    const old = rows;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, qty: newQty } : r))
    );

    const { error } = await supabase
      .from("cart_items")
      .update({ qty: newQty })
      .eq("id", id);

    setBusyId(null);
    if (error) {
      toast.error("Failed to update quantity", { description: error.message });
      setRows(old); // revert
    }
  }

  async function removeLine(id: string) {
    setBusyId(id);
    const old = rows;
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error("Failed to remove item", { description: error.message });
      setRows(old);
    } else {
      toast("Removed from cart");
    }
  }

  async function clearRemoved() {
    const removed = rows.filter((r) => r.removed);
    if (!removed.length) return;
    const ids = removed.map((r) => r.id);
    const old = rows;
    setRows((prev) => prev.filter((r) => !r.removed));

    const { error } = await supabase.from("cart_items").delete().in("id", ids);
    if (error) {
      toast.error("Failed to clear removed items", {
        description: error.message,
      });
      setRows(old);
    } else {
      toast("Cleared removed items");
    }
  }

  async function checkout() {
    if (totals.removedCount > 0) {
      toast.error("Please remove unavailable items before checkout.");
      return;
    }
    if (rows.length === 0) {
      toast("Your cart is empty");
      return;
    }
    toast.success("Proceeding to checkout…");
  }

  if (loading) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your Cart</h1>
        <Link href="/home" className="underline text-sm">
          Continue shopping
        </Link>
      </header>

      {!rows.length ? (
        <EmptyState />
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((r) => {
              const img = Array.isArray(r.photos) ? r.photos[0] : undefined;
              const badges = Array.isArray(r.options_badges)
                ? r.options_badges
                : [];

              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 border rounded-xl p-3 bg-sand"
                >
                  {/* Store header */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-white">
                      {r.store_avatar ? (
                        <img
                          src={r.store_avatar}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-[10px] text-ink/40">
                          —
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-ink/80">
                      {r.store_title ?? "Store"}
                    </div>
                  </div>

                  {/* Item */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0">
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
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
                          href={`/product/${r.product_id}`}
                          className="font-medium truncate hover:underline"
                        >
                          {r.title ?? "Product"}
                        </Link>
                        {r.removed && (
                          <span className="text-[11px] rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-700">
                            removed from seller’s store
                          </span>
                        )}
                      </div>

                      {/* Options badges */}
                      {badges.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {badges.map((b, i) => (
                            <span
                              key={`${r.id}-opt-${i}`}
                              className="text-[11px] rounded-full px-2 py-0.5 bg-white border"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Personalization preview */}
                      {r.personalization_text && (
                        <div className="mt-1 text-[11px] px-2 py-1 rounded bg-white border text-ink/80 line-clamp-2">
                          <span className="font-medium">Personalization: </span>
                          {r.personalization_text}
                        </div>
                      )}

                      <div className="mt-1 text-xs text-ink/70">
                        {typeof r.price_mad === "number" ? (
                          <>MAD {r.price_mad.toFixed(2)}</>
                        ) : (
                          <>MAD —</>
                        )}
                      </div>
                    </div>

                    {/* Qty + remove */}
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg border px-2 py-1 text-sm"
                        onClick={() => updateQty(r.id, r.qty - 1)}
                        disabled={busyId === r.id || r.removed}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm">{r.qty}</span>
                      <button
                        className="rounded-lg border px-2 py-1 text-sm"
                        onClick={() => updateQty(r.id, r.qty + 1)}
                        disabled={busyId === r.id || r.removed}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeLine(r.id)}
                      disabled={busyId === r.id}
                      className="text-xs underline text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Totals */}
          <aside className="rounded-2xl border bg-paper p-4 space-y-3">
            {totals.removedCount > 0 && (
              <div className="rounded-xl bg-amber-50 text-amber-900 px-3 py-2 text-sm flex items-center justify-between">
                <div>
                  {totals.removedCount} item
                  {totals.removedCount > 1 ? "s are" : " is"} unavailable.
                  Please remove them to continue.
                </div>
                <button onClick={clearRemoved} className="underline">
                  Clear removed
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-medium">
                MAD {totals.subtotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={checkout}
              disabled={totals.removedCount > 0 || rows.length === 0}
              className="w-full rounded-xl border px-4 py-2 text-sm bg-sand hover:bg-white disabled:opacity-60"
            >
              Checkout
            </button>
          </aside>
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-sand p-6 text-center">
      <div className="text-sm text-ink/70">Your cart is empty.</div>
      <Link
        href="/home"
        className="inline-block mt-3 rounded-xl border px-4 py-2 text-sm bg-paper hover:bg-white"
      >
        Browse products
      </Link>
    </div>
  );
}
