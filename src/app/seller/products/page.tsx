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

type Collection = { id: string; title: string };

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
  const [collections, setCollections] = useState<Collection[]>([]);
  const [productMap, setProductMap] = useState<Record<string, string[]>>({}); // product_id -> collection_ids[]
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 1) Get current shop ID
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user.id)
        .maybeSingle();

      if (shop) setShopId(shop.id);
      setLoading(false);
    })();
  }, []);

  // 2) Load products + collections + links
  async function loadAll(sid: string) {
    setLoading(true);

    const [{ data: products }, { data: cols }, { data: links }] =
      await Promise.all([
        supabase
          .from("products")
          .select("id,title,price_mad,active,photos,created_at,shop_id")
          .eq("shop_id", sid)
          .order("created_at", { ascending: false }),
        supabase
          .from("collections")
          .select("id,title")
          .eq("shop_id", sid)
          .order("title"),
        supabase
          .from("product_collections")
          .select("product_id, collection_id"),
      ]);

    setRows((products as any[]) ?? []);
    setCollections((cols as any[]) ?? []);

    const map: Record<string, string[]> = {};
    (links as any[])?.forEach((l) => {
      if (!map[l.product_id]) map[l.product_id] = [];
      map[l.product_id].push(l.collection_id);
    });
    setProductMap(map);

    setLoading(false);
  }

  useEffect(() => {
    if (shopId) loadAll(shopId);
  }, [shopId]);

  // …keep toggleActive & remove as you have them

  // counts
  const counts = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.active).length;
    return { total, active, inactive: total - active };
  }, [rows]);

  if (loading) return <main className="p-4">Loading…</main>;

  if (!shopId) {
    // …your “no shop” block unchanged
  }

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
        <div className="flex items-center gap-2">
          <Link
            href="/seller/collections"
            className="rounded-xl border px-3 py-2 text-sm bg-paper hover:bg-white"
          >
            ⚙️ Manage collections
          </Link>
          <Link
            href="/sell"
            className="rounded-xl border px-3 py-2 text-sm bg-paper hover:bg-white"
          >
            + Add new
          </Link>
        </div>
      </header>

      {!rows.length ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => {
            const img = Array.isArray(p.photos) ? p.photos[0] : undefined;
            const selected = productMap[p.id] || [];
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

                  {/* Collections chips */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.map((cid) => {
                      const c = collections.find((x) => x.id === cid);
                      return c ? (
                        <span
                          key={cid}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-white border"
                        >
                          {c.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <CollectionsPicker
                  productId={p.id}
                  all={collections}
                  value={selected}
                  onChange={async (next) => {
                    // diff -> inserts & deletes
                    const prev = new Set(selected);
                    const nextSet = new Set(next);

                    const toInsert = [...nextSet].filter((x) => !prev.has(x));
                    const toDelete = [...prev].filter((x) => !nextSet.has(x));

                    if (toInsert.length) {
                      const { error } = await supabase
                        .from("product_collections")
                        .insert(
                          toInsert.map((cid) => ({
                            product_id: p.id,
                            collection_id: cid,
                          }))
                        );
                      if (error) return toast.error(error.message);
                    }
                    if (toDelete.length) {
                      const { error } = await supabase
                        .from("product_collections")
                        .delete()
                        .in("collection_id", toDelete)
                        .eq("product_id", p.id);
                      if (error) return toast.error(error.message);
                    }
                    setProductMap((m) => ({ ...m, [p.id]: next }));
                    toast.success("Collections updated ✅");
                  }}
                />

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

function CollectionsPicker({
  productId,
  all,
  value,
  onChange,
}: {
  productId: string;
  all: Collection[];
  value: string[];
  onChange: (next: string[]) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs rounded-lg border px-2 py-1 bg-paper hover:bg-white"
      >
        Collections ▾
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow p-2 z-10">
          <div className="max-h-56 overflow-auto space-y-1">
            {all.length ? (
              all.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-sand cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={(e) => {
                      const next = new Set(selected);
                      e.target.checked ? next.add(c.id) : next.delete(c.id);
                      onChange([...next]);
                    }}
                  />
                  <span className="truncate">{c.title}</span>
                </label>
              ))
            ) : (
              <div className="text-xs text-ink/60 px-2 py-1">
                No collections yet.
              </div>
            )}
          </div>
          <div className="px-2 pt-2 border-t mt-2">
            <Link href="/seller/collections" className="text-xs underline">
              Manage collections
            </Link>
          </div>
        </div>
      )}
    </div>
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
