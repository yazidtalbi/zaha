"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  shop_id?: string | null;
  shops?: Store | null;
};

type CartRow = {
  id: string;
  qty: number;
  product_id: string;
  options: any | null;
  personalization: string | null;
  products: Product | null;
};

type UiCartRow = {
  id: string;
  qty: number;
  product_id: string;
  title?: string;
  price_mad?: number;
  photos?: string[] | null;
  store_id: string;
  store_title?: string | null;
  store_avatar?: string | null;
  options_badges: string[];
  personalization_text: string | null;
  removed: boolean;
};

type StoreGroup = {
  store_id: string;
  store_title: string;
  store_avatar: string | null;
  items: UiCartRow[];
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
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<UiCartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function emitCartChanged() {
    try {
      window.dispatchEvent(new Event("cart:changed"));
    } catch {}
  }

  // Map DB rows → UI rows
  function mapRows(data: CartRow[]): UiCartRow[] {
    return (data ?? []).map((row) => {
      const p = row.products;
      const removed = !p?.active || !!p?.deleted_at;

      // options → badges
      const badges: string[] = [];
      const opts = row.options;
      if (opts) {
        if (Array.isArray(opts)) {
          for (const o of opts) {
            if (o?.group && o?.value) badges.push(`${o.group}: ${o.value}`);
          }
        } else if (typeof opts === "object") {
          for (const [k, v] of Object.entries(opts)) {
            if (v != null && v !== "") badges.push(`${k}: ${v as string}`);
          }
        }
      }

      const store_id = p?.shop_id ?? p?.shops?.id ?? "unknown";

      return {
        id: row.id,
        qty: row.qty,
        product_id: row.product_id,
        title: p?.title,
        price_mad: p?.price_mad,
        photos: p?.photos,
        store_id,
        store_title: p?.shops?.title ?? "Store",
        store_avatar: p?.shops?.avatar_url ?? null,
        options_badges: badges,
        personalization_text: row.personalization ?? null,
        removed,
      };
    });
  }

  // Load cart
  async function loadCart(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        id, qty, product_id, options, personalization,
        products (
          id, title, price_mad, photos, active, deleted_at, shop_id,
          shops (id, title, avatar_url)
        )
      `
      )
      .eq("user_id", userId);

    if (error) {
      console.error(error);
      toast.error("Failed to load cart", { description: error.message });
      setLoading(false);
      return;
    }

    setRows(mapRows(data as unknown as CartRow[]));
    setLoading(false);
  }

  // Auth + initial load
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const _uid = data.user?.id ?? null;
      setUid(_uid);
      if (_uid) await loadCart(_uid);
      else setLoading(false);
    })();

    const { data: authSub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      const _uid = sess?.user?.id ?? null;
      setUid(_uid);
      if (_uid) loadCart(_uid);
      else setRows([]);
    });

    return () => authSub?.subscription.unsubscribe();
  }, []);

  // Realtime updates
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`cart-items-${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${uid}`,
        },
        async () => await loadCart(uid)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  // Group by store
  const groups: StoreGroup[] = useMemo(() => {
    const map = new Map<string, StoreGroup>();
    for (const r of rows) {
      const key = r.store_id || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          store_id: key,
          store_title: r.store_title ?? "Store",
          store_avatar: r.store_avatar ?? null,
          items: [],
        });
      }
      map.get(key)!.items.push(r);
    }
    return Array.from(map.values());
  }, [rows]);

  const totals = useMemo(() => {
    const subtotal = rows.reduce(
      (acc, r) => (r.removed || !r.price_mad ? acc : acc + r.price_mad * r.qty),
      0
    );
    const removedCount = rows.filter((r) => r.removed).length;
    return { subtotal, removedCount };
  }, [rows]);

  async function updateQty(id: string, newQty: number) {
    if (newQty < 1) return;
    setBusyId(id);
    const prev = rows;
    setRows((p) => p.map((r) => (r.id === id ? { ...r, qty: newQty } : r)));
    const { error } = await supabase
      .from("cart_items")
      .update({ qty: newQty })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error("Failed to update quantity", { description: error.message });
      setRows(prev);
    } else emitCartChanged();
  }

  async function removeLine(id: string) {
    setBusyId(id);
    const prev = rows;
    setRows((p) => p.filter((r) => r.id !== id));
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error("Failed to remove item", { description: error.message });
      setRows(prev);
    } else {
      toast("Removed from cart");
      emitCartChanged();
    }
  }

  async function clearRemoved() {
    const removed = rows.filter((r) => r.removed);
    if (!removed.length) return;
    const ids = removed.map((r) => r.id);
    const prev = rows;
    setRows((p) => p.filter((r) => !r.removed));

    const { error } = await supabase.from("cart_items").delete().in("id", ids);
    if (error) {
      toast.error("Failed to clear removed items", {
        description: error.message,
      });
      setRows(prev);
    } else {
      toast("Cleared removed items");
      emitCartChanged();
    }
  }

  function checkout() {
    if (totals.removedCount > 0) {
      toast.error("Please remove unavailable items before checkout.");
      return;
    }
    if (rows.length === 0) {
      toast("Your cart is empty");
      return;
    }
    router.push("/checkout");
  }

  if (loading)
    return (
      <main className="p-6 text-center text-ink/70 animate-pulse">
        Loading your cart…
      </main>
    );

  return (
    <main className="p-4 md:p-8 space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between   pb-3">
        <h1 className="text-2xl font-semibold text-ink">Your Cart</h1>
        <Link href="/home" className="text-sm text-ink/70 hover:text-ink">
          Continue shopping →
        </Link>
      </header>

      {!rows.length ? (
        <EmptyState />
      ) : (
        <>
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.store_id} className="space-y-3">
                {/* Store header */}
                <div className="flex items-center gap-2">
                  {g.store_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.store_avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-200 grid place-items-center text-xs text-neutral-500">
                      🏪
                    </div>
                  )}
                  <span className="text-sm font-medium">{g.store_title}</span>
                </div>

                {/* Items */}
                <ul className="space-y-3">
                  {g.items.map((r) => {
                    const img = Array.isArray(r.photos)
                      ? r.photos[0]
                      : undefined;
                    const badges = r.options_badges || [];

                    return (
                      <li
                        key={r.id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 border rounded-2xl p-4 bg-white   ${
                          r.removed ? "opacity-70 bg-neutral-100" : ""
                        }`}
                      >
                        <div className="w-20 h-20 rounded-lg bg-neutral-50 overflow-hidden shrink-0 border">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-xs text-neutral-400">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/product/${r.product_id}`}
                              className="font-medium text-ink hover:underline truncate"
                            >
                              {r.title ?? "Product"}
                            </Link>
                            {r.removed && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                                Unavailable
                              </span>
                            )}
                          </div>

                          {!!badges.length && (
                            <div className="flex flex-wrap gap-1">
                              {badges.map((b, i) => (
                                <span
                                  key={i}
                                  className="text-[11px] bg-neutral-100 border px-2 py-0.5 rounded-full"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}

                          {r.personalization_text && (
                            <div className="text-[11px] px-2 py-1 bg-neutral-50 border rounded-lg text-ink/80 line-clamp-2">
                              <span className="font-medium">
                                Personalization:
                              </span>{" "}
                              {r.personalization_text}
                            </div>
                          )}

                          <div className="text-sm font-medium text-ink/80">
                            {r.price_mad
                              ? `MAD ${r.price_mad.toFixed(2)}`
                              : "—"}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="flex items-center border rounded-lg overflow-hidden">
                            <button
                              onClick={() => updateQty(r.id, r.qty - 1)}
                              disabled={busyId === r.id || r.removed}
                              className="px-2 py-1 text-sm hover:bg-neutral-100"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm">
                              {r.qty}
                            </span>
                            <button
                              onClick={() => updateQty(r.id, r.qty + 1)}
                              disabled={busyId === r.id || r.removed}
                              className="px-2 py-1 text-sm hover:bg-neutral-100"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeLine(r.id)}
                            disabled={busyId === r.id}
                            className="text-xs text-rose-600 hover:text-rose-700 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          {/* Totals */}
          <aside className="rounded-2xl border bg-white   p-5 space-y-4">
            {totals.removedCount > 0 && (
              <div className="rounded-lg bg-amber-50 text-amber-800 px-3 py-2 text-sm flex items-center justify-between border border-amber-200">
                <span>
                  {totals.removedCount} item
                  {totals.removedCount > 1 ? "s are" : " is"} unavailable.
                </span>
                <button
                  onClick={clearRemoved}
                  className="underline hover:text-amber-900"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold text-ink">
                MAD {totals.subtotal.toFixed(2)}
              </span>
            </div>

            <button
              onClick={checkout}
              disabled={totals.removedCount > 0 || rows.length === 0}
              className="w-full rounded-xl px-4 py-2 text-sm font-medium bg-ink text-white hover:bg-ink/90 disabled:opacity-50"
            >
              Proceed to Checkout
            </button>
          </aside>
        </>
      )}
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-neutral-50 p-10 text-center space-y-3">
      <div className="text-sm text-ink/70">Your cart is empty.</div>
      <Link
        href="/home"
        className="inline-block mt-3 rounded-xl border border-ink/20 px-5 py-2 text-sm bg-white hover:bg-ink/5"
      >
        Browse products
      </Link>
    </div>
  );
}
