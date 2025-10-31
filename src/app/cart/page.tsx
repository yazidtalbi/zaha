// app/cart/page.tsx
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

  // store (for grouping)
  store_id: string;
  store_title?: string | null;
  store_avatar?: string | null;

  // buyer selections
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

  // Small helper to map DB rows -> UI rows
  function mapRows(data: CartRow[]): UiCartRow[] {
    return (data ?? []).map((row) => {
      const p = row.products;
      const removed = !p?.active || !!p?.deleted_at;

      // safe options -> badges
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

  // Fetch cart
  async function loadCart(userId: string) {
    setLoading(true);
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

  // Auth + initial load + realtime sync
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const _uid = data.user?.id ?? null;
      setUid(_uid);
      if (_uid) await loadCart(_uid);
      else setLoading(false);
    })();

    // auth change
    const { data: authSub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      const _uid = sess?.user?.id ?? null;
      setUid(_uid);
      if (_uid) loadCart(_uid);
      else setRows([]);
    });

    return () => {
      authSub?.subscription.unsubscribe();
    };
  }, []);

  // Realtime: keep cart synced if it changes elsewhere
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
        async () => {
          await loadCart(uid);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  // Group by store
  const groups: StoreGroup[] = useMemo(() => {
    const byStore = new Map<string, StoreGroup>();
    for (const r of rows) {
      const key = r.store_id || "unknown";
      if (!byStore.has(key)) {
        byStore.set(key, {
          store_id: key,
          store_title: r.store_title ?? "Store",
          store_avatar: r.store_avatar ?? null,
          items: [],
        });
      }
      byStore.get(key)!.items.push(r);
    }
    return Array.from(byStore.values());
  }, [rows]);

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
    const prev = rows;
    setRows((p) => p.map((r) => (r.id === id ? { ...r, qty: newQty } : r)));

    const { error } = await supabase
      .from("cart_items")
      .update({ qty: newQty })
      .eq("id", id);

    setBusyId(null);
    if (error) {
      toast.error("Failed to update quantity", { description: error.message });
      setRows(prev); // revert
    }
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
    router.push("/checkout"); // ➜ address selection page
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
          {/* grouped by store */}
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.store_id} className="space-y-2">
                {/* Store header (once) */}
                <div className="flex items-center gap-2 px-1">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white">
                    {g.store_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={g.store_avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[10px] text-ink/40">
                        —
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium">{g.store_title}</div>
                </div>

                {/* Items of this store */}
                <ul className="space-y-2">
                  {g.items.map((r) => {
                    const img = Array.isArray(r.photos)
                      ? r.photos[0]
                      : undefined;
                    const badges = Array.isArray(r.options_badges)
                      ? r.options_badges
                      : [];

                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 border rounded-xl p-3 bg-sand"
                      >
                        <div className="w-14 h-14 rounded-lg bg-white overflow-hidden shrink-0">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
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
                          {!!badges.length && (
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
                              <span className="font-medium">
                                Personalization:{" "}
                              </span>
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
                          <span className="w-6 text-center text-sm">
                            {r.qty}
                          </span>
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
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

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
