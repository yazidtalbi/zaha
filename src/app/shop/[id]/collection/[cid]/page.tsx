// app/shop/[id]/collection/[cid]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";

type Collection = {
  id: string;
  title: string;
  cover_url: string | null;
  shop_id: string;
};

type Product = {
  id: string;
  title: string;
  price_mad: number;
  promo_price_mad?: number | null;
  photos: string[] | null;
  active: boolean;
  created_at: string;
  shop_id: string;
};

type SortKey = "new" | "price_high" | "price_low";

export default function ShopCollectionPage() {
  const { id: shopId, cid } = useParams<{ id: string; cid: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const sortParam = (searchParams.get("sort") as SortKey) || "new";
  const [sort, setSort] = useState<SortKey>(sortParam);

  // keep URL in sync when user changes sort
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("sort", sort);
    router.replace(`/shop/${shopId}/collection/${cid}?${sp.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  useEffect(() => {
    if (!shopId || !cid) return;
    (async () => {
      setLoading(true);

      // 1) fetch collection (ensure it belongs to this shop)
      const { data: col, error: colErr } = await supabase
        .from("collections")
        .select("id,title,cover_url,shop_id")
        .eq("id", cid)
        .maybeSingle();

      if (colErr || !col || col.shop_id !== shopId) {
        setCollection(null);
        setItems([]);
        setLoading(false);
        return;
      }
      setCollection(col as Collection);

      // 2) get product ids linked to this collection, with order_index
      const { data: pc } = await supabase
        .from("product_collections")
        .select("product_id, order_index")
        .eq("collection_id", cid)
        .order("order_index", { ascending: true, nullsLast: true });

      const productLinks =
        (pc as { product_id: string; order_index: number | null }[]) ?? [];

      const productIds = productLinks.map((x) => x.product_id);
      if (!productIds.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 3) fetch products
      const { data: prods } = await supabase
        .from("products")
        .select(
          "id,title,price_mad,promo_price_mad,photos,active,created_at,shop_id"
        )
        .in("id", productIds)
        .eq("active", true);

      const allProducts = (prods as Product[]) ?? [];

      // keep the order from productLinks (order_index)
      const byId = new Map(allProducts.map((p) => [p.id, p]));
      const ordered: Product[] = productLinks
        .map((link) => byId.get(link.product_id))
        .filter((p): p is Product => Boolean(p));

      // in case some products have no link / order_index for any reason
      const leftovers = allProducts.filter(
        (p) => !productLinks.find((l) => l.product_id === p.id)
      );

      setItems([...ordered, ...leftovers]);
      setLoading(false);
    })();
  }, [shopId, cid]);

  const sorted = useMemo(() => {
    const arr = [...items];

    if (sort === "new") {
      // respect saved collection order (order_index)
      return arr;
    } else if (sort === "price_high") {
      arr.sort(
        (a, b) =>
          (b.promo_price_mad ?? b.price_mad) -
          (a.promo_price_mad ?? a.price_mad)
      );
    } else if (sort === "price_low") {
      arr.sort(
        (a, b) =>
          (a.promo_price_mad ?? a.price_mad) -
          (b.promo_price_mad ?? b.price_mad)
      );
    }

    return arr;
  }, [items, sort]);

  if (loading) return <main className="p-4">Loading…</main>;
  if (!collection)
    return (
      <main className="p-4">
        <div className="text-sm">Collection not found.</div>
        <div className="mt-3">
          <Link
            href={`/shop/${shopId}`}
            className="text-sm underline underline-offset-2"
          >
            Back to shop
          </Link>
        </div>
      </main>
    );

  return (
    <main className="pb-24">
      {/* Header / breadcrumb */}
      <div className="px-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-ink/60">
              <Link href={`/shop/${shopId}`} className="underline">
                Shop
              </Link>{" "}
              / Collection
            </div>
            <h1 className="text-xl font-semibold mt-1">{collection.title}</h1>
          </div>

          {/* Sort control (right) */}
          <div className="shrink-0">
            <label className="text-xs block mb-1 text-ink/60">Sort by</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-9 rounded-md border bg-white px-2 text-sm"
            >
              <option value="new">New</option>
              <option value="price_high">Highest price</option>
              <option value="price_low">Lowest price</option>
            </select>
          </div>
        </div>

        {/* Optional cover */}
        {collection.cover_url ? (
          <div className="mt-3 h-32 w-full overflow-hidden rounded-xl border">
            <img
              src={collection.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
      </div>

      {/* Grid */}
      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        {sorted.map((p) => (
          <ProductCard key={p.id} p={p} variant="carousel" />
        ))}
        {!sorted.length && (
          <div className="col-span-2 py-10 text-center text-sm text-ink/70">
            No items in this collection yet.
          </div>
        )}
      </section>
    </main>
  );
}
