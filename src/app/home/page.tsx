// app/home/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import HeroCategoriesStrip from "@/components/home/HeroCategoriesStrip";

/* =========================
   Config
========================= */
const PAGE_SIZE = 24;
const PRICE_CAP_MAD = 200;
const FETCH_TIMEOUT_MS = 10000; // 10s max per request

// Cities / regions for picker
const CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fes",
  "Tangier",
  "Tetouan",
  "Agadir",
  "Oujda",
];

const REGIONS = [
  "Nord",
  "Centre",
  "Sud",
  "Oriental",
  "Sous-Massa",
  "Marrakech-Safi",
];

/* =========================
   Types
========================= */
type ProductForCard = {
  id: string;
  title: string;
  price_mad: number;
  compare_at_mad?: number | null;
  promo_price_mad?: number | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  photos?: string[] | null;
  rating_avg?: number | null;
  reviews_count?: number | null;
  orders_count?: number | null;
  free_shipping?: boolean | null;
  shop_owner?: string | null;
  keywords?: string | null;
  video_url?: string | null;
  video_poster_url?: string | null;
};

type PersonalizedRail = {
  title: string;
  items: ProductForCard[];
};

type AnyRow = Record<string, any>;
type TabId = "new" | "popular" | "sale" | "under_cap" | "city";

// If you have this type already in HeroCarousel you can import it instead
type Slide = {
  img: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
  bg: string;
  textColor: string;
  ctaBg: string;
  ctaText: string;
};

/* =========================
   In-memory store
========================= */
type HomeStore = {
  items: ProductForCard[];
  page: number;
  hasMore: boolean;
  recently: ProductForCard[] | null;
  because: PersonalizedRail | null;
  scrollY: number;
  activeTab: TabId;
};

const __homeStore: HomeStore = {
  items: [],
  page: 0,
  hasMore: true,
  recently: null,
  because: null,
  scrollY: 0,
  activeTab: "new",
};

/* =========================
   Slides
========================= */
const slides: Slide[] = [
  {
    img: "/home/a.png",
    title: "Open your shop on Zaha",
    ctaLabel: "Become a seller",
    ctaHref: "/onboarding/seller",
    bg: "#371836",
    textColor: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#050608",
  },
  {
    img: "/home/b.png",
    title: "Handmade bags that feel like home",
    ctaLabel: "Shop for bags",
    ctaHref: "/c/bags",
    bg: "#EED8B6",
    textColor: "#000000",
    ctaBg: "#FFFFFF",
    ctaText: "#FFFFFF",
  },
  {
    img: "/home/c.png",
    title: "Jewelry crafted with soul",
    ctaLabel: "Shop jewelry",
    ctaHref: "/c/jewelry",
    bg: "#0E2630",
    textColor: "#FFFFFF",
    ctaBg: "#FFFFFF",
    ctaText: "#050608",
  },
];

/* =========================
   Helpers
========================= */

// Add a timeout around any Supabase call
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(
      () =>
        reject(new Error("Request timed out. Please check your connection.")),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      }
    );
  });
}

function normalizeProduct(row: AnyRow): ProductForCard {
  const photosArr: string[] | null =
    row.photos ??
    row.images ??
    (typeof row.photo === "string" ? [row.photo] : (row.photo ?? null)) ??
    null;

  const videoFromArray: string | null =
    Array.isArray(row.videos) && row.videos.length ? row.videos[0] : null;
  const videoFromUrls: string | null =
    Array.isArray(row.video_urls) && row.video_urls.length
      ? row.video_urls[0]
      : null;

  const video_url: string | null =
    row.video_url ?? videoFromArray ?? videoFromUrls ?? null;

  const video_poster_url: string | null =
    row.video_poster_url ?? row.video_poster ?? row.poster ?? null;

  return {
    ...row,
    photos: photosArr,
    video_url,
    video_poster_url,
  } as ProductForCard;
}

function normalizeList(rows?: AnyRow[] | null): ProductForCard[] {
  return (rows ?? []).map(normalizeProduct);
}

function getRecentlyViewed(): Array<{ id: string; at: number }> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("recently_viewed");
    const arr = JSON.parse(raw || "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => ({ id: String(x.id), at: Number(x.at) || 0 }))
      .filter((x) => x.id)
      .sort((a, b) => b.at - a.at)
      .slice(0, 12);
  } catch {
    return [];
  }
}

function labelFromPath(path: string): string {
  const segs = path.split("/").filter(Boolean);
  const last = segs[segs.length - 1] || path;
  return last
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* =========================
   Component
========================= */
export default function HomePage(): JSX.Element {
  // main grid
  const [items, setItems] = useState<ProductForCard[]>(
    __homeStore.items.length ? __homeStore.items : []
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [page, setPage] = useState<number>(__homeStore.page);
  const [hasMore, setHasMore] = useState<boolean>(__homeStore.hasMore);
  const [activeTab, setActiveTab] = useState<TabId>(__homeStore.activeTab);

  // personalization
  const [recently, setRecently] = useState<ProductForCard[] | null>(
    __homeStore.recently
  );
  const [because, setBecause] = useState<PersonalizedRail | null>(
    __homeStore.because
  );

  // city / region + city rail
  const [city, setCity] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [cityProducts, setCityProducts] = useState<ProductForCard[] | null>(
    null
  );
  const [loadingCityRail, setLoadingCityRail] = useState(false);

  /* ---------- queries for tabs ---------- */
  const buildQueryForTab = useCallback(
    (tab: TabId) => {
      const effectiveTab: TabId = tab === "city" && !city ? "new" : tab;

      let q = supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .eq("unavailable", false);

      switch (effectiveTab) {
        case "popular":
          q = q
            .order("orders_count", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false });
          break;
        case "sale":
          q = q
            .not("promo_price_mad", "is", null)
            .order("promo_starts_at", { ascending: false })
            .order("created_at", { ascending: false });
          break;
        case "under_cap":
          q = q
            .lte("price_mad", PRICE_CAP_MAD)
            .order("created_at", { ascending: false });
          break;
        case "city":
          q = q.eq("city", city).order("created_at", { ascending: false });
          break;
        case "new":
        default:
          q = q.order("created_at", { ascending: false });
          break;
      }

      return q;
    },
    [city]
  );

  const fetchPageForTab = useCallback(
    async (tab: TabId, pageNumber: number) => {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await withTimeout(
        buildQueryForTab(tab).range(from, to),
        FETCH_TIMEOUT_MS
      );

      if (error) {
        console.error("home:fetchPage error", error);
        throw error;
      }
      return normalizeList(data);
    },
    [buildQueryForTab]
  );

  /* ---------- city rail (horizontal) ---------- */
  const fetchCityRail = useCallback(async (selectedCity: string) => {
    if (!selectedCity) return;
    setLoadingCityRail(true);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("unavailable", false)
          .eq("city", selectedCity)
          .order("created_at", { ascending: false })
          .limit(24),
        FETCH_TIMEOUT_MS
      );

      if (error) {
        console.error("home:cityRail error", error);
        setCityProducts([]);
      } else {
        setCityProducts(normalizeList(data));
      }
    } catch (e) {
      console.error("home:cityRail exception", e);
      setCityProducts([]);
    } finally {
      setLoadingCityRail(false);
    }
  }, []);

  const handleApplyCity = useCallback(async () => {
    if (!city) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("zaha_city", city);
      if (region) {
        localStorage.setItem("zaha_region", region);
      } else {
        localStorage.removeItem("zaha_region");
      }
    }

    await fetchCityRail(city);

    if (activeTab === "city") {
      setItems([]);
      setPage(0);
      setHasMore(true);
      setErrorMsg(null);
      setLoading(true);

      try {
        const rows = await fetchPageForTab("city", 0);
        setItems(rows);
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e: any) {
        console.error("home:handleApplyCity error", e);
        setErrorMsg(e?.message ?? "Unable to load products for this city.");
        setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }
  }, [city, region, fetchCityRail, activeTab, fetchPageForTab]);

  /* ---------- personalization ---------- */
  const refreshPersonalization = useCallback(async () => {
    try {
      const viewed = getRecentlyViewed();
      if (viewed.length) {
        const idsOrdered = viewed.map((v) => v.id);
        const { data: prods } = await withTimeout(
          supabase
            .from("products")
            .select("*")
            .in("id", idsOrdered)
            .eq("active", true)
            .eq("unavailable", false)
            .limit(12),
          FETCH_TIMEOUT_MS
        );

        const byId = new Map<string, AnyRow>();
        (prods ?? []).forEach((p: AnyRow) => byId.set(String(p.id), p));
        const ordered = idsOrdered
          .map((id) => byId.get(id))
          .filter(Boolean) as AnyRow[];

        setRecently(normalizeList(ordered));
      } else {
        setRecently(null);
      }

      if (!viewed.length) {
        setBecause(null);
        return;
      }

      const mostRecent = viewed[0].id;
      const ids = Array.from(new Set(viewed.map((v) => v.id)));

      const { data: pcRows } = await withTimeout(
        supabase
          .from("product_categories")
          .select(
            `
          product_id,
          is_primary,
          categories:categories!inner(id, path, name_en, slug)
        `
          )
          .in("product_id", ids)
          .eq("is_primary", true),
        FETCH_TIMEOUT_MS
      );

      const primaries =
        (pcRows ?? []).map((r: any) => ({
          product_id: r.product_id as string,
          path: r.categories?.path as string,
          name: r.categories?.name_en ?? r.categories?.slug ?? "Category",
          id: r.categories?.id as string,
        })) ?? [];

      let becauseRail: PersonalizedRail | null = null;
      const recentPrimary = primaries.find((p) => p.product_id === mostRecent);
      if (recentPrimary?.path) {
        const basePath = recentPrimary.path;
        const { data: catIdsData } = await withTimeout(
          supabase.from("categories").select("id").like("path", `${basePath}%`),
          FETCH_TIMEOUT_MS
        );
        const catIds = (catIdsData ?? []).map((c: any) => c.id);

        if (catIds.length) {
          const { data: pc2 } = await withTimeout(
            supabase
              .from("product_categories")
              .select("product_id")
              .in("category_id", catIds)
              .neq("product_id", mostRecent)
              .limit(220),
            FETCH_TIMEOUT_MS
          );

          const productIds = Array.from(
            new Set((pc2 ?? []).map((x: any) => x.product_id))
          ).slice(0, 24);

          if (productIds.length) {
            const { data: prods2 } = await withTimeout(
              supabase
                .from("products")
                .select("*")
                .in("id", productIds)
                .eq("active", true)
                .eq("unavailable", false)
                .limit(24),
              FETCH_TIMEOUT_MS
            );

            const items = normalizeList(prods2);
            if (items.length) {
              becauseRail = {
                title: `${labelFromPath(basePath)} you'll love`,
                items,
              };
            }
          }
        }
      }

      setBecause(becauseRail);
    } catch (e) {
      console.error("home:personalization refresh error", e);
    }
  }, []);

  /* ---------- tab change ---------- */
  const handleTabChange = useCallback(
    async (tab: TabId) => {
      setActiveTab(tab);
      setItems([]);
      setPage(0);
      setHasMore(true);
      setErrorMsg(null);
      setLoading(true);

      try {
        const rows = await fetchPageForTab(tab, 0);
        setItems(rows);
        setHasMore(rows.length === PAGE_SIZE);
      } catch (e: any) {
        console.error("home:handleTabChange error", e);
        setErrorMsg(e?.message ?? "Unable to load products.");
        setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchPageForTab]
  );

  /* ---------- initial hydrate ---------- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedCity = localStorage.getItem("zaha_city");
      const storedRegion = localStorage.getItem("zaha_region");

      if (storedCity) {
        setCity(storedCity);
        fetchCityRail(storedCity);
      }
      if (storedRegion) {
        setRegion(storedRegion);
      }
    }

    if (__homeStore.items.length) {
      setItems(__homeStore.items);
      setPage(__homeStore.page);
      setHasMore(__homeStore.hasMore);
      setRecently(__homeStore.recently);
      setBecause(__homeStore.because);
      setActiveTab(__homeStore.activeTab || "new");
      setLoading(false);
      setErrorMsg(null);

      requestAnimationFrame(() => {
        window.scrollTo(0, __homeStore.scrollY || 0);
      });

      refreshPersonalization();
    } else {
      (async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
          const rows = await fetchPageForTab("new", 0);
          setItems(rows);
          setPage(0);
          setHasMore(rows.length === PAGE_SIZE);
        } catch (e: any) {
          console.error("home:initial fetch error", e);
          setErrorMsg(
            e?.message ?? "Unable to load products. Please try again."
          );
          setItems([]);
          setHasMore(false);
        } finally {
          setLoading(false);
        }
      })();

      refreshPersonalization();
    }
  }, [fetchPageForTab, refreshPersonalization, fetchCityRail]);

  /* ---------- persist store ---------- */
  useEffect(() => {
    return () => {
      __homeStore.items = items;
      __homeStore.page = page;
      __homeStore.hasMore = hasMore;
      __homeStore.recently = recently;
      __homeStore.because = because;
      __homeStore.scrollY = window.scrollY;
      __homeStore.activeTab = activeTab;
    };
  }, [items, page, hasMore, recently, because, activeTab]);

  /* ---------- infinite scroll ---------- */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    try {
      const batch = await fetchPageForTab(activeTab, nextPage);
      if (!batch.length) {
        setHasMore(false);
        return;
      }
      setItems((prev) => prev.concat(batch));
      setPage(nextPage);
      if (batch.length < PAGE_SIZE) setHasMore(false);
    } catch (e: any) {
      console.error("home:loadMore error", e);
      setHasMore(false);
      setErrorMsg(
        (prev) =>
          prev ??
          "We couldn't load more items. Please scroll up to refresh or try again later."
      );
    }
  }, [hasMore, loading, page, fetchPageForTab, activeTab]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          setTimeout(() => loadMore(), 60);
        }
      },
      { rootMargin: "800px 0px 800px 0px" }
    );

    observerRef.current.observe(node);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  /* ---------- tabs list ---------- */
  const tabs: { id: TabId; label: string }[] = [
    { id: "new", label: "New" },
    { id: "popular", label: "Popular" },
    ...(city ? [{ id: "city", label: `In ${city}` }] : []),
    { id: "sale", label: "On Sale" },
    { id: "under_cap", label: `Under ${PRICE_CAP_MAD} MAD` },
  ];

  /* ---------- render ---------- */
  return (
    <main className="pb-20 bg-neutral-50 min-h-screen">
      <div className="pt-4 opacity-0">
        <Header />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 border-neutral-200 bg-neutral-50 ">
        <div className="px-3 pt-2 pb-2">
          <Header />
        </div>
      </header>

      {/* To be implemented on update */}
      {/* <section className="px-3 mt-3">
        <div>
      
          <div className="relative w-full h-72 overflow-hidden rounded-xl bg-white">
            <img
              src="/landing/hero4.jpg"
              alt="Zaha Hero"
              className="w-full h-full object-cover object-center"
            />
          </div>

   
          <div className=" pt-5 pb-7 text-center">
            <p className="text-xl font-semibold text-neutral-900 leading-snug">
              Explore pieces shaped <br />
              by real hands
            </p>

            <button
              className="mt-5 w-full rounded-full bg-[#371837] text-white py-3 text-md font-semibold"
              onClick={() => router.push("/login")}
            >
              Sign In
            </button>
          </div>
        </div>
      </section> */}

      {/* Hero */}
      <div className="pt-2 px-1">
        <HeroCarousel slides={slides} />
      </div>

      {/* Top categories */}
      <div className="mt-2">
        <h2 className="mt-4 text-lg font-semibold flex items-center gap-1 px-3 capitalize">
          Top categories
        </h2>
        <div className="-mx-6 px-4">
          <HeroCategoriesStrip />
        </div>
      </div>

      {/* Recently viewed */}
      {recently && recently.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-semibold flex items-center gap-1 px-3 capitalize">
            Recently viewed
          </h2>
          <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pt-2 px-3">
            {recently.map((p) => (
              <div key={p.id} className="w-[140px]  shrink-0 ">
                <ProductCard p={p} variant="mini" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Because you'll love */}
      {because && because.items.length > 0 && (
        <>
          <h2 className="text-lg font-semibold flex items-center gap-1 px-3 pt-8 capitalize">
            {because.title}
          </h2>
          <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pt-2 pl-3">
            {because.items.map((p) => (
              <div key={p.id} className="w-[200px] shrink-0">
                <ProductCard p={p} variant="mini" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Main grid + tabs */}
      {/* Main grid + tabs */}
      <section className="space-y-3 px-3 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-1 capitalize">
            Discover finds from real people
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold border ${
                  isActive
                    ? "bg-black text-white border-black"
                    : "bg-white text-neutral-800 border-neutral-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {loading && items.length === 0 ? (
          <>
            {/* keep a simple skeleton grid */}
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={`grid-skel-${i}`}
                  className="h-[220px] rounded-2xl bg-neutral-200/60 animate-pulse"
                />
              ))}
            </div>
            <p className="mt-2 text-[10px] text-neutral-400 text-center">
              loading={String(loading)} · items={items.length} · error=
              {errorMsg || "none"}
            </p>
          </>
        ) : errorMsg && items.length === 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center space-y-2">
            <p className="text-sm font-medium text-red-700">
              We couldn&apos;t load products right now.
            </p>
            <p className="text-xs text-red-600">{errorMsg}</p>
            <button
              className="mt-2 inline-flex items-center justify-center rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white"
              onClick={() => {
                setErrorMsg(null);
                setLoading(true);
                handleTabChange(activeTab);
              }}
            >
              Try again
            </button>
          </div>
        ) : items.length > 0 ? (
          <>
            {/* Masonry-style feed using CSS columns (like Etsy) */}
            <div className="columns-2 gap-3  [column-fill:balance]">
              {items.map((p) => (
                <div key={p.id} className="mb-6 break-inside-avoid">
                  <ProductCard p={p} variant="carouselAuto" />
                </div>
              ))}
            </div>

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
              No items found. Try again later.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
