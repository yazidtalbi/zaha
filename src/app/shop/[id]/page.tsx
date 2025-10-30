"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

type Shop = {
  id: string;
  title: string;
  bio: string | null;
  city: string | null;
  owner: string;
  avatar_url: string | null; // ✅ new
  cover_urls: string[] | null; // ✅ new
  created_at?: string | null; // for “years”
};

type Product = {
  id: string;
  title: string;
  price_mad: number;
  photos: string[] | null;
  active: boolean;
  shop_id: string;
  created_at: string;
};

export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const shopId = (id ?? "").toString().trim();

  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stats, setStats] = useState<{ sales: number; years: number } | null>(
    null
  );

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && shop?.owner) setIsOwner(user.id === shop.owner);
    })();
  }, [shop?.owner]);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);

      // 1) shop (select explicit fields incl. avatar_url & cover_urls)
      const { data: s } = await supabase
        .from("shops")
        .select("id,title,bio,city,owner,avatar_url,cover_urls,created_at")
        .eq("id", shopId)
        .maybeSingle();
      setShop((s as any) ?? null);
      if (!s) {
        setLoading(false);
        return;
      }

      // 2) products of this shop
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("created_at", { ascending: false });

      const products = (prods as any[]) ?? [];
      setItems(products);

      // 3) lightweight stats
      let sales = 0;
      if (products.length) {
        const ids = products.map((p) => p.id);
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("product_id", ids)
          .eq("status", "delivered");
        sales = count ?? 0;
      }
      const created = (s as any)?.created_at ?? new Date().toISOString();
      const years =
        Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(created).getTime()) /
              (1000 * 60 * 60 * 24 * 365)
          )
        ) || 1;

      setStats({ sales, years });
      setLoading(false);
    })();
  }, [shopId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((p) => p.title.toLowerCase().includes(term));
  }, [items, q]);

  if (!shopId) return <main className="p-4">Invalid shop.</main>;
  if (loading) return <main className="p-4">Loading…</main>;
  if (!shop) return <main className="p-4">Shop not found.</main>;

  // ✅ cover priority: shop.cover_urls[0] → first product photo
  const cover =
    (Array.isArray(shop.cover_urls) && shop.cover_urls[0]) ||
    items.find((p) => Array.isArray(p.photos) && p.photos[0])?.photos?.[0];

  return (
    <main className="pb-24">
      {/* cover */}
      <div className="relative h-40 w-full overflow-hidden bg-neutral-900">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-full h-full object-cover opacity-80"
          />
        ) : null}
      </div>

      {/* header card */}
      <section className="-mt-10 px-4">
        <div className="rounded-2xl bg-paper/95 backdrop-blur border p-4 relative">
          {isOwner && (
            <Link
              href="/seller/shop"
              className="absolute right-3 top-3 text-xs rounded-full border px-3 py-1 bg-white hover:bg-neutral-50"
            >
              Edit shop
            </Link>
          )}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden border bg-black/90 text-white">
              {shop.avatar_url ? (
                <img
                  src={shop.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center font-bold">
                  {shop.title?.slice(0, 1).toUpperCase() || "S"}
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">{shop.title}</h1>
              <p className="text-xs text-ink/70">
                {shop.city ?? "Morocco"} ·{" "}
                {stats ? (
                  <>
                    <span className="font-medium">
                      {stats.sales.toLocaleString()}
                    </span>{" "}
                    sales · <span className="font-medium">{stats.years}</span>{" "}
                    year{stats.years > 1 ? "s" : ""} on Zaha
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>

          {shop.bio ? (
            <p className="text-sm text-ink/80 mt-3 line-clamp-3">{shop.bio}</p>
          ) : null}
        </div>
      </section>

      {/* browse by */}
      <section className="px-4 mt-4 space-y-3">
        <h2 className="font-semibold">Browse by</h2>
        <div className="grid grid-cols-2 gap-3">
          <BrowseTile
            title="Featured items"
            count={Math.min(4, items.length)}
            img={items[0]?.photos?.[0]}
            onClick={() =>
              window.scrollTo({ top: cover ? 300 : 180, behavior: "smooth" })
            }
          />
          <BrowseTile
            title="New"
            count={items.length}
            img={items[1]?.photos?.[0]}
            onClick={() =>
              window.scrollTo({ top: cover ? 300 : 180, behavior: "smooth" })
            }
          />
        </div>
      </section>

      {/* in-shop search */}
      <section className="px-4 mt-4">
        <div className="flex items-center gap-2 rounded-full border px-4 h-11 bg-paper">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
            />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 h-10 bg-transparent outline-none text-sm"
            placeholder={`Search all ${items.length} items`}
          />
        </div>
      </section>

      {/* product grid */}
      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        {filtered.map((p) => (
          <ProductCard key={p.id} p={p} variant="carousel" />
        ))}
        {!filtered.length && (
          <div className="col-span-2 text-sm text-ink/70 py-8 text-center">
            No results.
          </div>
        )}
      </section>
    </main>
  );
}

function BrowseTile({
  title,
  count,
  img,
  onClick,
}: {
  title: string;
  count: number;
  img?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden border bg-sand"
    >
      <div className="h-28 w-full overflow-hidden">
        {img ? (
          <img src={img} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-neutral-200" />
        )}
      </div>
      <div className="p-3">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-ink/70">{count} items</div>
      </div>
    </button>
  );
}
