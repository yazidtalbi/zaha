// app/home/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import CategoriesStrip from "@/components/home/CategoriesStrip";
import HeroCarousel from "@/components/HeroCarousel";
import ProductCard from "@/components/ProductCard";
import { Search, Sparkles, Flame, Tag, ChevronRight } from "lucide-react";
import HeroCategoriesStrip from "@/components/home/HeroCategoriesStrip";

/* =========================
   Config
========================= */
const PAGE_SIZE = 24;
const PRICE_CAP_MAD = 200;

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
   Types (aligned to ProductCard)
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

type CategoryCard = {
  id: string;
  name: string;
  href: string;
  image?: string | null;
};

type PersonalizedRail = {
  title: string;
  items: ProductForCard[];
};

/* =========================
   In-memory page store
========================= */
type HomeStore = {
  items: ProductForCard[];
  page: number;
  hasMore: boolean;
  trending: ProductForCard[] | null;
  underCap: ProductForCard[] | null;
  cats: CategoryCard[] | null;
  recently: ProductForCard[] | null;
  forYou: PersonalizedRail | null;
  because: PersonalizedRail | null;
  scrollY: number;
};

const __homeStore: HomeStore = {
  items: [],
  page: 0,
  hasMore: true,
  trending: null,
  underCap: null,
  cats: null,
  recently: null,
  forYou: null,
  because: null,
  scrollY: 0,
};

/* =========================
   Slides
========================= */
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

/* =========================
   Normalizers
========================= */
type AnyRow = Record<string, any>;

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

/* =========================
   Personalization helpers
========================= */
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

// --- Pin "Because you viewed" to a stable category
const BECAUSE_KEY = "zaha_because_path_v1";
const BECAUSE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getPinnedBecausePath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(BECAUSE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const path = typeof parsed?.path === "string" ? parsed.path : null;
    const ts = typeof parsed?.ts === "number" ? parsed.ts : 0;
    if (!path) return null;
    if (Date.now() - ts > BECAUSE_TTL_MS) {
      localStorage.removeItem(BECAUSE_KEY);
      return null;
    }
    return path;
  } catch {
    return null;
  }
}

function setPinnedBecausePath(path: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BECAUSE_KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch {}
}

// Optional: call if you ever want to reset the pin
function clearPinnedBecausePath() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BECAUSE_KEY);
  } catch {}
}

// Capitalize last segment of a category path for display
function labelFromPath(path: string): string {
  const segs = path.split("/").filter(Boolean);
  const last = segs[segs.length - 1] || path;
  return last
    .replace(/-/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* =========================
   Page
========================= */
export default function HomePage() {
  const router = useRouter();

  // main grid
  const [items, setItems] = useState<ProductForCard[]>(
    __homeStore.items.length ? __homeStore.items : []
  );
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState<number>(__homeStore.page);
  const [hasMore, setHasMore] = useState<boolean>(__homeStore.hasMore);

  // rails
  const [trending, setTrending] = useState<ProductForCard[] | null>(
    __homeStore.trending
  );
  const [underCap, setUnderCap] = useState<ProductForCard[] | null>(
    __homeStore.underCap
  );
  const [cats, setCats] = useState<CategoryCard[] | null>(__homeStore.cats);

  // personalization rails
  const [recently, setRecently] = useState<ProductForCard[] | null>(
    __homeStore.recently
  );
  const [forYou, setForYou] = useState<PersonalizedRail | null>(
    __homeStore.forYou
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

  /* ---------------- base query builder ---------------- */
  const baseQuery = useCallback(() => {
    return supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
  }, []);

  /* ---------------- first page ---------------- */
  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setPage(0);

    try {
      const { data, error } = await baseQuery().range(0, PAGE_SIZE - 1);
      if (error) {
        console.error("home:firstPage error", error);
        setItems([]);
        setHasMore(false);
      } else {
        const rows = normalizeList(data);
        setItems(rows);
        setHasMore(rows.length === PAGE_SIZE);
      }
    } catch (e) {
      console.error("home:firstPage exception", e);
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [baseQuery]);

  /* ---------------- load more ---------------- */
  const loadMore = useCallback(async () => {
    if (!hasMore) return;

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      const { data, error } = await baseQuery().range(from, to);
      if (error) {
        console.error("home:loadMore error", error);
        return;
      }
      const batch = normalizeList(data);
      setItems((prev) => prev.concat(batch));
      setPage(nextPage);
      if (batch.length < PAGE_SIZE) setHasMore(false);
    } catch (e) {
      console.error("home:loadMore exception", e);
    }
  }, [baseQuery, page, hasMore]);

  /* ---------------- city rail fetch ---------------- */
  const fetchCityRail = useCallback(async (selectedCity: string) => {
    if (!selectedCity) return;
    setLoadingCityRail(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .eq("unavailable", false)
        .eq("city", selectedCity)
        .order("created_at", { ascending: false })
        .limit(24);

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

    // store locally for guests + logged in
    if (typeof window !== "undefined") {
      localStorage.setItem("zaha_city", city);
      if (region) {
        localStorage.setItem("zaha_region", region);
      } else {
        localStorage.removeItem("zaha_region");
      }
    }

    await fetchCityRail(city);
  }, [city, region, fetchCityRail]);

  /* ---------------- personalization (runs on EVERY mount) ---------------- */
  const refreshPersonalization = useCallback(async () => {
    try {
      // 0) Recently viewed list (IDs in recency order)
      const viewed = getRecentlyViewed();
      if (viewed.length) {
        const idsOrdered = viewed.map((v) => v.id);
        const { data: prods } = await supabase
          .from("products")
          .select("*")
          .in("id", idsOrdered)
          .eq("active", true)
          .eq("unavailable", false)
          .limit(12);

        const byId = new Map<string, AnyRow>();
        (prods ?? []).forEach((p: AnyRow) => byId.set(String(p.id), p));
        const ordered = idsOrdered
          .map((id) => byId.get(id))
          .filter(Boolean) as AnyRow[];

        setRecently(normalizeList(ordered));
      } else {
        setRecently(null);
      }

      // If no history, skip deeper personalization
      if (!viewed.length) {
        setForYou(null);
        setBecause(null);
        return;
      }

      const mostRecent = viewed[0].id;
      const ids = Array.from(new Set(viewed.map((v) => v.id)));

      // 1) Primary categories for each viewed product
      const { data: pcRows } = await supabase
        .from("product_categories")
        .select(
          `
          product_id,
          is_primary,
          categories:categories!inner(id, path, name_en, slug)
        `
        )
        .in("product_id", ids)
        .eq("is_primary", true);

      const primaries =
        (pcRows ?? []).map((r: any) => ({
          product_id: r.product_id as string,
          path: r.categories?.path as string,
          name: r.categories?.name_en ?? r.categories?.slug ?? "Category",
          id: r.categories?.id as string,
        })) ?? [];

      // 2) Because you viewed X → subtree of most recent primary category
      let becauseRail: PersonalizedRail | null = null;
      const recentPrimary = primaries.find((p) => p.product_id === mostRecent);
      if (recentPrimary?.path) {
        const basePath = recentPrimary.path;
        const { data: catIdsData } = await supabase
          .from("categories")
          .select("id")
          .like("path", `${basePath}%`);
        const catIds = (catIdsData ?? []).map((c: any) => c.id);

        if (catIds.length) {
          const { data: pc2 } = await supabase
            .from("product_categories")
            .select("product_id")
            .in("category_id", catIds)
            .neq("product_id", mostRecent)
            .limit(220);

          const productIds = Array.from(
            new Set((pc2 ?? []).map((x: any) => x.product_id))
          ).slice(0, 24);

          if (productIds.length) {
            const { data: prods2 } = await supabase
              .from("products")
              .select("*")
              .in("id", productIds)
              .eq("active", true)
              .eq("unavailable", false)
              .limit(24);

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

      // 3) For You → most frequent primary category path across history
      let forYouRail: PersonalizedRail | null = null;
      if (primaries.length) {
        const countByPath = new Map<string, number>();
        for (const p of primaries) {
          if (!p.path) continue;
          countByPath.set(p.path, (countByPath.get(p.path) ?? 0) + 1);
        }
        const topPath =
          [...countByPath.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
          null;

        if (topPath) {
          const { data: catIdsData3 } = await supabase
            .from("categories")
            .select("id")
            .like("path", `${topPath}%`);
          const catIds3 = (catIdsData3 ?? []).map((c: any) => c.id);

          if (catIds3.length) {
            const exclude = new Set(ids);
            const { data: pc3 } = await supabase
              .from("product_categories")
              .select("product_id")
              .in("category_id", catIds3)
              .limit(260);

            const productIds3 = Array.from(
              new Set(
                (pc3 ?? [])
                  .map((x: any) => x.product_id)
                  .filter((pid: string) => !exclude.has(pid))
              )
            ).slice(0, 24);

            if (productIds3.length) {
              const { data: prods3 } = await supabase
                .from("products")
                .select("*")
                .in("id", productIds3)
                .eq("active", true)
                .eq("unavailable", false)
                .limit(24);

              const items = normalizeList(prods3);
              if (items.length) {
                forYouRail = { title: "For You", items };
              }
            }
          }
        }
      }

      setBecause(becauseRail);
      setForYou(forYouRail);
    } catch (e) {
      console.error("home:personalization refresh error", e);
    }
  }, []);

  /* ---------------- hydrate or fetch ---------------- */
  useEffect(() => {
    // hydrate city/region from localStorage
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
      setTrending(__homeStore.trending);
      setUnderCap(__homeStore.underCap);
      setCats(__homeStore.cats);
      setRecently(__homeStore.recently);
      setForYou(__homeStore.forYou);
      setBecause(__homeStore.because);

      requestAnimationFrame(() => {
        window.scrollTo(0, __homeStore.scrollY || 0);
      });

      // IMPORTANT: always refresh personalization on mount
      refreshPersonalization();
    } else {
      loadFirstPage();

      // parallel rails
      (async () => {
        try {
          const [
            { data: trend, error: tErr },
            { data: cheap, error: cErr },
            { data: catRows, error: catErr },
          ] = await Promise.all([
            supabase
              .from("products")
              .select("*")
              .eq("active", true)
              .order("created_at", { ascending: false })
              .limit(12),
            supabase
              .from("products")
              .select("*")
              .eq("active", true)
              .lte("price_mad", PRICE_CAP_MAD)
              .order("created_at", { ascending: false })
              .limit(12),
            supabase
              .from("categories")
              .select("id, slug, name_en, image_url")
              .eq("depth", 1)
              .order("name_en", { ascending: true })
              .limit(24),
          ]);

          if (tErr) console.error("home:trending error", tErr);
          if (cErr) console.error("home:underCap error", cErr);
          if (catErr) console.error("home:categories error", catErr);

          setTrending(normalizeList(trend));
          setUnderCap(normalizeList(cheap));

          const mappedCats: CategoryCard[] =
            (catRows ?? []).map((c: any) => ({
              id: c.id,
              name: c.name_en ?? c.slug,
              href: `/c/${c.slug}`,
              image: c.image_url ?? null,
            })) ?? [];
          setCats(mappedCats);
        } catch (e) {
          console.error("home:parallel exception", e);
        }
      })();

      // first-time personalization
      refreshPersonalization();
    }
  }, [loadFirstPage, refreshPersonalization, fetchCityRail]);

  /* ---------------- persist store on unmount ---------------- */
  useEffect(() => {
    return () => {
      __homeStore.items = items;
      __homeStore.page = page;
      __homeStore.hasMore = hasMore;
      __homeStore.trending = trending;
      __homeStore.underCap = underCap;
      __homeStore.cats = cats;
      __homeStore.recently = recently;
      __homeStore.forYou = forYou;
      __homeStore.because = because;
      __homeStore.scrollY = window.scrollY;
    };
  }, [
    items,
    page,
    hasMore,
    trending,
    underCap,
    cats,
    recently,
    forYou,
    because,
  ]);

  /* ---------------- intersection observer (infinite) ---------------- */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

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

  /* ---------------- render ---------------- */
  return (
    <main className="pb-14 bg-neutral-50 min-h-screen">
      <div className="pt-4">
        <Header />
      </div>

      {/* Category quick tags under the row */}

      {/* Hero */}
      <div className="pt-4 px-3">
        <HeroCarousel slides={slides} />
      </div>

      <div className="mt-2 ">
        <h2 className="mt-4 text-lg font-semibold flex items-center gap-1 px-3">
          Top Categories
        </h2>
        {/* <CategoriesStrip variant="hero" title="Explore" /> */}
        <div className="mx-3">
          {" "}
          <HeroCategoriesStrip />
        </div>
      </div>

      {/* City / region picker + city rail */}
      <section className="px-3 pt-4">
        <div className="rounded-2xl bg-white border border-neutral-200 px-3 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              Shop local treasures — choose your city
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-full border border-neutral-200 bg-white px-3 text-xs"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">Choose a city</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-full border border-neutral-200 bg-white px-3 text-xs"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">Region (optional)</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <button
              onClick={handleApplyCity}
              disabled={!city || loadingCityRail}
              className="h-9 rounded-full bg-ink text-white px-4 text-xs font-medium disabled:opacity-60"
            >
              {loadingCityRail ? "Updating…" : "Update"}
            </button>
          </div>

          {city && (
            <p className="text-[11px] text-neutral-500">
              Showing picks from <span className="font-semibold">{city}</span>
              {region ? ` · ${region}` : null}
            </p>
          )}
        </div>

        {city && (
          <div className="mt-3">
            <h2 className="text-sm font-semibold mb-2">Crafted in {city}</h2>

            {loadingCityRail ? (
              <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pt-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`city-skel-${i}`}
                    className="w-40 h-[210px] shrink-0 rounded-2xl bg-neutral-200/60 animate-pulse"
                  />
                ))}
              </div>
            ) : cityProducts && cityProducts.length > 0 ? (
              <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pt-1">
                {cityProducts.map((p) => (
                  <div key={p.id} className="w-40 shrink-0">
                    <ProductCard p={p} variant="mini" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-neutral-500 mt-1">
                No items in {city} yet. They’re coming soon ✨
              </p>
            )}
          </div>
        )}
      </section>

      {/* ===== Recently viewed (only if exists) ===== */}
      {recently && recently.length > 0 && (
        <>
          <h2 className="mt-4 text-lg font-semibold flex items-center gap-1 px-3">
            Recently viewed
          </h2>
          <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pt-2 px-3">
            {recently.map((p) => (
              <div key={p.id} className="w-40 shrink-0">
                <ProductCard p={p} variant="mini" />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ===== X you'll love ===== */}
      {because && because.items.length > 0 && (
        <>
          <h2 className=" text-lg font-semibold flex items-center gap-1 px-3 pt-8">
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

      {/* ===== For You (kept commented out) ===== */}
      {/* {forYou && forYou.items.length > 0 && (
        <>
          <h2 className="mt-2 text-lg font-semibold flex items-center gap-1 px-3">
            {forYou.title}
          </h2>
          <div className="flex flex-nowrap gap-3 overflow-x-auto no-scrollbar pb-1 pl-3">
            {forYou.items.map((p) => (
              <div key={p.id} className="w-[200px] shrink-0">
                <ProductCard p={p} variant="carousel" />
              </div>
            ))}
          </div>
        </>
      )} */}

      {/* ===== Main Grid (infinite) ===== */}
      <section className="space-y-2 px-3 pt-8">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-1">
            Crafted in Morocco
          </h2>
        </div>

        {loading && items.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 gap-y-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`grid-skel-${i}`}
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

      {/* ===== Rail: Under 200 MAD (still commented) ===== */}
      {/* <section className="mt-2 mb-6 px-3">
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
                key={`under-skel-${i}`}
                className="w-[200px] h-[240px] shrink-0 rounded-2xl bg-neutral-200/60 animate-pulse"
              />
            )
          )}
        </div>
      </section> */}
    </main>
  );
}
