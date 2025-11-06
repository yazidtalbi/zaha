// app/home/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import Header from "@/components/Header";
import CategoriesStrip from "@/components/home/CategoriesStrip";
import HeroCarousel from "@/components/HeroCarousel";
import { Search, Sparkles, Flame, Tag, ChevronRight } from "lucide-react";
import { Router } from "next/router";

import { useRouter } from "next/navigation";

// ——— Config
const PAGE_SIZE = 24;
const PRICE_CAP_MAD = 200;

const slides = [
  {
    img: "/banners/holiday.jpg",
    title: "Discover our holiday picks",
    ctaLabel: "Get gifting",
    ctaHref: "/home?campaign=holiday",
  },
  {
    img: "/banners/handmade.jpg",
    title: "Handmade treasures from Morocco",
    ctaLabel: "Explore handmade",
    ctaHref: "/home?tag=handmade",
  },
  {
    img: "/banners/personalized.jpg",
    title: "Personalized, made just for you",
    ctaLabel: "Personalize now",
    ctaHref: "/home?tag=personalized",
  },
];

// quick category chips (tag search)
const QUICK_TAGS = [
  "handmade",
  "jewelry",
  "home decor",
  "ceramics",
  "bags",
  "art",
  "vintage",
  "personalized",
];

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  // rails data
  const [trending, setTrending] = useState<any[] | null>(null);
  const [underCap, setUnderCap] = useState<any[] | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ——— Fetch favorites once
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id");
      if (!error)
        setFavIds(new Set((data ?? []).map((r: any) => r.product_id)));
    })();
  }, []);

  // ——— Base query builder
  const baseQuery = useCallback(() => {
    let query = supabase.from("products").select("*").eq("active", true);

    if (category) query = query.ilike("tags", `%${category}%`);
    if (q) query = query.ilike("title", `%${q}%`);

    return query.order("created_at", { ascending: false });
  }, [category, q]);

  // ——— Load first page
  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setPage(0);

    const from = 0;
    const to = PAGE_SIZE - 1;

    const { data, error, count } = await baseQuery().range(from, to);

    if (!error) {
      setItems(data ?? []);
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
    }
    setLoading(false);
  }, [baseQuery]);

  // ——— Load more pages (infinite scroll)
  const loadMore = useCallback(async () => {
    if (!hasMore) return;

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await baseQuery().range(from, to);
    if (!error) {
      const batch = data ?? [];
      setItems((prev) => [...prev, ...batch]);
      setPage(nextPage);
      if (batch.length < PAGE_SIZE) setHasMore(false);
    }
  }, [baseQuery, page, hasMore]);

  // ——— Re-run when filters/search change
  useEffect(() => {
    loadFirstPage();
  }, [category, q, loadFirstPage]);

  // ——— IntersectionObserver for sentinel
  useEffect(() => {
    if (!sentinelRef.current) return;
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          // small timeout to avoid too-rapid successive loads
          setTimeout(() => {
            loadMore();
          }, 80);
        }
      },
      { rootMargin: "800px 0px 800px 0px" } // prefetch early
    );

    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore, items.length, hasMore]);

  // ——— Rails (Trending, Under Cap)
  useEffect(() => {
    (async () => {
      // Trending = latest 12 regardless of search (feel free to tailor)
      const { data: trend } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      setTrending(trend ?? []);

      // Budget picks rail
      const { data: cheap } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .lte("price_mad", PRICE_CAP_MAD)
        .order("created_at", { ascending: false })
        .limit(12);
      setUnderCap(cheap ?? []);
    })();
  }, []);

  // ——— Small helpers
  const onChipToggle = (tag: string) => {
    setCategory((prev) => (prev === tag ? "" : tag));
  };

  const isFiltering = Boolean(category || q);

  // ...
  const router = useRouter();
  // ...

  return (
    <main className="pb-14 bg-neutral-50 min-h-screen">
      <Header />

      {/* Sticky search bar */}
      <div className="sticky top-0 z-30 bg-neutral-50/80 backdrop-blur  ">
        <div className="px-4 py-2">
          <div
            className="flex items-center gap-2 rounded-full border bg-white px-3 h-12 mb-2 active:scale-[0.98] transition cursor-pointer"
            onClick={() => router.push("/search")}
          >
            <Search className="h-4 w-4 opacity-60" />
            <span className="text-sm text- select-none opacity-50">
              Search handmade goods…
            </span>
          </div>

          {/* Quick category chips */}
          {/* <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {QUICK_TAGS.map((t) => {
              const active = category === t;
              return (
                <button
                  key={t}
                  onClick={() => onChipToggle(t)}
                  className={`shrink-0 rounded-full border px-3 h-8 text-xs transition ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-black/80 hover:bg-neutral-50"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div> */}
        </div>
      </div>

      {/* Hero */}
      <HeroCarousel slides={slides} />

      {/* Categories strip */}
      <CategoriesStrip />

      {/* =====================
          Rail: Trending now
      ====================== */}
      <section className="px-4 mt-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold flex items-center gap-1">
            <Flame className="h-4 w-4" />
            Trending now
          </h2>
          <Link
            href="/explore/trending"
            className="text-xs text-ink/70 hover:underline flex items-center gap-1"
          >
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {(trending ?? Array.from({ length: 8 })).map((p, i) =>
            p ? (
              <div key={p.id} className="w-[200px] shrink-0">
                <ProductCard p={p} variant="carousel" />
              </div>
            ) : (
              <div
                key={`s-${i}`}
                className="w-[200px] h-[240px] shrink-0 rounded-2xl bg-neutral-200/60 animate-pulse"
              />
            )
          )}
        </div>
      </section>

      <h2 className="text-lg font-semibold flex items-center gap-1">
        <Sparkles className="h-4 w-4" />
        Personalize for you
      </h2>

      <h2 className="text-lg font-semibold flex items-center gap-1">
        <Sparkles className="h-4 w-4" />
        Featured (ads) - for limited time
      </h2>

      <h2 className="text-lg font-semibold flex items-center gap-1">
        <Sparkles className="h-4 w-4" />
        Crafted near you
      </h2>

      {/* =====================
          Main Grid (Infinite)
      ====================== */}
      <section className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            Crafted in Morocco
          </h2>
          {isFiltering ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-black text-white">
              Filtered
            </span>
          ) : null}
        </div>

        {/* Grid or skeleton */}
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[220px] rounded-2xl bg-neutral-200/60 animate-pulse"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 gap-y-8">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} variant="carousel" />
              ))}
            </div>

            {/* Infinite scroll sentinel & states */}
            <div ref={sentinelRef} className="h-10 w-full" />
            {hasMore ? (
              <div className="text-center text-sm text-neutral-500">
                Loading more…
              </div>
            ) : (
              <div className="text-center text-sm text-neutral-500">
                You’ve reached the end.
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border bg-white p-5 text-center">
            <p className="text-sm text-neutral-600">
              No items found. Try a different search or category.
            </p>
          </div>
        )}
      </section>

      {/* =====================
          Rail: Under 200 MAD
      ====================== */}
      <section className="px-4 mt-2 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold flex items-center gap-1">
            <Tag className="h-4 w-4" />
            Picks under {PRICE_CAP_MAD} MAD
          </h2>
          <Link
            href={`/explore/under-${PRICE_CAP_MAD}`}
            className="text-xs text-ink/70 hover:underline flex items-center gap-1"
          >
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {(underCap ?? Array.from({ length: 8 })).map((p, i) =>
            p ? (
              <div key={p.id} className="w-[200px] shrink-0">
                <ProductCard p={p} variant="carousel" />
              </div>
            ) : (
              <div
                key={`u-${i}`}
                className="w-[200px] h-[240px] shrink-0 rounded-2xl bg-neutral-200/60 animate-pulse"
              />
            )
          )}
        </div>
      </section>
    </main>
  );
}
