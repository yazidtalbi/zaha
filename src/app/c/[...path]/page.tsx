// app/c/[...path]/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: string;
  title: string;
  price_mad: number;
  promo_price_mad?: number | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  photos?: string[] | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  orders_count?: number | null;
  free_shipping?: boolean | null;
  shop_owner?: string | null;
  created_at?: string | null;
  active?: boolean | null;
  unavailable?: boolean | null;
};

type FilterState = {
  q?: string;
  min: number | null;
  max: number | null;
  onlyPromo: boolean;
  freeShipping: boolean;
  sort: "newest" | "price-asc" | "price-desc" | "top-rated" | "most-ordered";
};

const PAGE = 24;

export default function CategoryPage() {
  const { path: raw } = useParams<{ path: string[] }>();
  const search = useSearchParams();
  const fullPath = useMemo(() => (raw || []).join("/"), [raw]);
  const topPath = useMemo(() => fullPath.split("/")[0] || "", [fullPath]);
  const activeSlug = useMemo(() => fullPath.split("/")[1] ?? "all", [fullPath]);

  const filters = useMemo<FilterState>(() => {
    const q = search.get("q") || undefined;
    const min = search.get("min");
    const max = search.get("max");
    const onlyPromo = search.get("promo") === "1";
    const freeShipping = search.get("fs") === "1";
    const sort = (search.get("sort") as FilterState["sort"]) || "newest";
    return {
      q,
      min: min ? Number(min) : null,
      max: max ? Number(max) : null,
      onlyPromo,
      freeShipping,
      sort,
    };
  }, [search]);

  // key to reset grid + skeleton cleanly
  const viewKey = useMemo(() => {
    const f = filters;
    return [
      topPath,
      activeSlug,
      f.q ?? "",
      f.min ?? "",
      f.max ?? "",
      f.onlyPromo ? "p" : "",
      f.freeShipping ? "fs" : "",
      f.sort,
    ].join("|");
  }, [topPath, activeSlug, filters]);

  const [items, setItems] = useState<Product[] | null>(null);
  const [total, setTotal] = useState(0);
  const [more, setMore] = useState(false);

  useEffect(() => {
    setItems(null);
    setTotal(0);
  }, [viewKey]);

  const buildQuery = useCallback(
    (from = 0, to = PAGE - 1) => {
      if (!topPath) return null;
      const basePath =
        activeSlug === "all" ? topPath : `${topPath}/${activeSlug}`;

      let q = supabase
        .from("product_categories")
        .select(
          `
          products:products!inner(
            id, title, price_mad,
            promo_price_mad, promo_starts_at, promo_ends_at,
            photos, rating_avg, rating_count, orders_count,
            free_shipping, shop_owner, created_at, active, unavailable
          ),
          categories:categories!inner( path )
        `,
          { count: "exact" }
        )
        .ilike("categories.path", `${basePath.toLowerCase()}%`)
        .eq("products.active", true)
        .eq("products.unavailable", false);

      if (filters.q) q = q.ilike("products.title", `%${filters.q}%`);
      if (filters.min != null) q = q.gte("products.price_mad", filters.min);
      if (filters.max != null) q = q.lte("products.price_mad", filters.max);
      if (filters.onlyPromo) q = q.not("products.promo_price_mad", "is", null);
      if (filters.freeShipping) q = q.eq("products.free_shipping", true);

      switch (filters.sort) {
        case "price-asc":
          q = q
            .order("promo_price_mad", {
              ascending: true,
              nullsFirst: true,
              referencedTable: "products",
            })
            .order("price_mad", {
              ascending: true,
              referencedTable: "products",
            });
          break;
        case "price-desc":
          q = q
            .order("promo_price_mad", {
              ascending: false,
              nullsFirst: false, // nullsLast = true
            })
            .order("price_mad", {
              ascending: false,
              referencedTable: "products",
            });
          break;
        case "top-rated":
          q = q
            .order("rating_avg", {
              ascending: false,
              nullsLast: true,
              referencedTable: "products",
            })
            .order("rating_count", {
              ascending: false,
              nullsLast: true,
              referencedTable: "products",
            });
          break;
        case "most-ordered":
          q = q.order("orders_count", {
            ascending: false,
            nullsLast: true,
            referencedTable: "products",
          });
          break;
        default:
          q = q.order("created_at", {
            ascending: false,
            nullsLast: true,
            referencedTable: "products",
          });
      }

      return q.range(from, to);
    },
    [topPath, activeSlug, filters]
  );

  // first page
  useEffect(() => {
    let alive = true;
    (async () => {
      const q = buildQuery(0, PAGE - 1);
      if (!q) {
        if (alive) {
          setItems([]);
          setTotal(0);
        }
        return;
      }
      const { data, error, count } = await q;
      if (!alive) return;

      if (error) {
        console.error(error);
        setItems([]);
        setTotal(0);
        return;
      }

      const rows = ((data as any[]) ?? []).map((r) => r.products) as Product[];
      setItems(rows);
      setTotal(count ?? rows.length);
    })();
    return () => {
      alive = false;
    };
  }, [viewKey, buildQuery]);

  async function loadMore() {
    if (more || !items) return;
    setMore(true);
    const from = items.length;
    const to = from + PAGE - 1;
    const q = buildQuery(from, to);
    if (!q) {
      setMore(false);
      return;
    }
    const { data, error } = await q;
    if (!error) {
      const rows = ((data as any[]) ?? []).map((r) => r.products) as Product[];
      setItems((prev) => [...(prev ?? []), ...rows]);
    }
    setMore(false);
  }

  return (
    <div className="w-full">
      {/* Grid with skeleton */}
      {items === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl bg-sand animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-neutral-700">
          No items in this category yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((p) => (
              <ProductCard key={p.id} p={p as any} />
            ))}
          </div>

          {items.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={loadMore}
                disabled={more}
                className="px-4 py-2 rounded-xl bg-terracotta text-white font-medium disabled:opacity-60"
              >
                {more ? "Loading…" : "Load more"}
              </button>
            </div>
          )}

          <div className="text-center text-sm text-neutral-600 mt-3">
            Showing {items.length} of {total}
          </div>
        </>
      )}
    </div>
  );
}
