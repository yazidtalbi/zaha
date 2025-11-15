// app/shop/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import ShopReviewsStrip from "@/components/reviews/ShopReviewsStrip";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ShoppingBag,
  Star,
  X,
  ChevronLeft,
  Share2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";

import { Skeleton } from "@/components/ui/skeleton";

// ================== Types (unchanged) ==================
type Shop = {
  id: string;
  title: string;
  is_verified: boolean;
  bio: string | null;
  city: string | null;
  owner: string;
  avatar_url: string | null;
  cover_urls: string[] | null;
  created_at?: string | null;
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

// extend Product with optional promo fields (safe even if null/absent)
type ProductEx = Product & {
  promo_price_mad?: number | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
};

type Collection = { id: string; title: string; cover_url: string | null };

// ===== Pagination config =====
const PAGE_SIZE = 16;

// ================== Page ==================
export default function ShopPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const shopId = (id ?? "").toString().trim();

  const [shop, setShop] = useState<Shop | null>(null);

  // paginated products
  const [items, setItems] = useState<ProductEx[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);

  // other shop data
  const [collections, setCollections] = useState<Collection[]>([]);
  const [links, setLinks] = useState<Record<string, string[]>>({}); // product_id -> collection_ids[]
  const [selectedCol, setSelectedCol] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stats, setStats] = useState<{ sales: number; years: number } | null>(
    null
  );
  const [isOwner, setIsOwner] = useState(false);

  // sticky header stuff
  const [showStickyTop, setShowStickyTop] = useState(false);
  const coverSentinelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // load-more sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const hasHistory = window.history.length > 1;
      const ref = document.referrer ? new URL(document.referrer) : null;
      const sameOriginRef = ref && ref.origin === window.location.origin;
      setCanGoBack(Boolean(hasHistory || sameOriginRef));
    } catch {
      setCanGoBack(false);
    }
  }, []);
  const goBack = useCallback(() => {
    if (canGoBack) router.back();
    else router.push("/home");
  }, [canGoBack, router]);

  // observe the cover to toggle sticky header
  useEffect(() => {
    const el = coverSentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyTop(!entry.isIntersecting),
      { rootMargin: "80px 0px 0px 0px", threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // filters/sort state
  const [sort, setSort] = useState<"new" | "price_asc" | "price_desc">("new");
  const [onSaleOnly, setOnSaleOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<{
    min: number | null;
    max: number | null;
  }>({
    min: null,
    max: null,
  });

  // helper to decide if a product is on promo now
  const isPromo = (p: ProductEx) => {
    const now = Date.now();
    const hasPromo = p.promo_price_mad != null && Number(p.promo_price_mad) > 0;
    if (!hasPromo) return false;
    const startsOk =
      !p.promo_starts_at || now >= new Date(p.promo_starts_at).getTime();
    const endsOk =
      !p.promo_ends_at || now <= new Date(p.promo_ends_at).getTime();
    return startsOk && endsOk;
  };

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && shop?.owner) setIsOwner(user.id === shop.owner);
    })();
  }, [shop?.owner]);

  const [count, setCount] = useState(0);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!shopId) return;

    (async () => {
      // 1) Latest visible reviews (limit for strip)
      const { data: list, count: total } = await supabase
        .from("reviews")
        .select(
          `
          id, rating, title, body, photos, created_at, author,
          author_profile:profiles!left(id, name, role, phone, city)
        `,
          { count: "exact" }
        )
        .eq("shop_id", shopId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(12);

      setCount(total ?? 0);

      // 2) Average rating
      const { data: ratings } = await supabase
        .from("reviews")
        .select("rating")
        .eq("shop_id", shopId)
        .eq("is_public", true);

      const arr = (ratings as { rating: number | null }[]) ?? [];
      const mean = arr.length
        ? arr.reduce((s, r) => s + Number(r.rating || 0), 0) / arr.length
        : 0;
      setAvg(mean);
    })();
  }, [shopId]);

  // ---- INITIAL SHOP + AUX DATA, then first page of products ----
  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // 1) shop
      const { data: s } = await supabase
        .from("shops")
        .select(
          "id,title,bio,is_verified, city,owner,avatar_url,cover_urls,created_at"
        )
        .eq("id", shopId)
        .maybeSingle();

      if (cancelled) return;
      setShop((s as any) ?? null);
      if (!s) {
        setLoading(false);
        return;
      }

      // 2) collections
      const { data: cols } = await supabase
        .from("collections")
        .select("id,title,cover_url")
        .eq("shop_id", shopId)
        .order("title");

      if (cancelled) return;
      setCollections((cols as any[]) ?? []);

      // 3) product↔collection links
      const { data: pcs } = await supabase
        .from("product_collections")
        .select("product_id, collection_id")
        .eq("shop_id", shopId);

      if (cancelled) return;
      const map: Record<string, string[]> = {};
      (pcs as any[])?.forEach((l) => {
        if (!map[l.product_id]) map[l.product_id] = [];
        map[l.product_id].push(l.collection_id);
      });
      setLinks(map);

      // reset pagination, then fetch first page
      setItems([]);
      setPage(0);
      setHasMore(true);

      await fetchProductsPage({ pageIndex: 0, replace: true });

      // lightweight stats (based on currently known products; acceptable as a hint)
      let sales = 0;
      const productsNow = items.length ? items : []; // after first page, items will be filled
      if (productsNow.length) {
        const ids = productsNow.map((p) => p.id);
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

      if (!cancelled) {
        setStats({ sales, years });
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  // ---- Pagination fetcher ----
  const fetchProductsPage = useCallback(
    async ({
      pageIndex,
      replace = false,
    }: {
      pageIndex: number;
      replace?: boolean;
    }) => {
      if (!shopId || loadingPage) return;
      setLoadingPage(true);

      const from = pageIndex * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .range(from, to);

      const list = (data as ProductEx[]) ?? [];
      if (error) {
        // keep going gracefully
        setLoadingPage(false);
        return;
      }

      setItems((prev) => (replace ? list : [...prev, ...list]));
      setHasMore(list.length === PAGE_SIZE); // if fewer than PAGE_SIZE, we've reached the end
      setPage(pageIndex);
      setLoadingPage(false);
    },
    [shopId, loadingPage]
  );

  // infinite scroll via IntersectionObserver on the sentinel
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasMore && !loadingPage) {
          fetchProductsPage({ pageIndex: page + 1, replace: false });
        }
      },
      { rootMargin: "800px 0px 0px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, hasMore, loadingPage, fetchProductsPage]);

  // ✅ unified filtered+sorted view over loaded pages
  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();

    let out = items.filter((p) => {
      const byText = !term || p.title.toLowerCase().includes(term);
      const byCol =
        !selectedCol || (links[p.id]?.includes(selectedCol) ?? false);

      const byPromo = !onSaleOnly || isPromo(p);

      const price = Number(p.price_mad ?? 0);
      const byMin = priceRange.min == null || price >= priceRange.min;
      const byMax = priceRange.max == null || price <= priceRange.max;

      return byText && byCol && byPromo && byMin && byMax;
    });

    out = out.slice().sort((a, b) => {
      if (sort === "price_asc") return (a.price_mad ?? 0) - (b.price_mad ?? 0);
      if (sort === "price_desc") return (b.price_mad ?? 0) - (a.price_mad ?? 0);
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return out;
  }, [
    items,
    q,
    selectedCol,
    links,
    onSaleOnly,
    priceRange.min,
    priceRange.max,
    sort,
  ]);

  if (!shopId) return <main className="p-4">Invalid shop.</main>;
  if (!shop && !loading) return <main className="p-4">Shop not found.</main>;

  // cover: shop.cover_urls[0] → fallback to first product photo
  const cover =
    (Array.isArray(shop?.cover_urls) && shop?.cover_urls?.[0]) ||
    items.find((p) => Array.isArray(p.photos) && p.photos[0])?.photos?.[0];

  const goToCollection = (cid: string) => {
    router.push(`/shop/${shopId}/collection/${cid}`);
  };

  // share helper
  const shareShop = async () => {
    const url = window.location.href;
    const title = shop?.title ?? "Zaha shop";
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url);
      } catch {}
    }
  };

  return (
    <main className="pb-24 overflow-visible ">
      {/* Sticky top title bar */}
      <div
        className={`fixed top-0 inset-x-0 z-50 border-b border-neutral-200 backdrop-blur-md bg-white/90 transition-all duration-300 ease-out transform ${
          showStickyTop
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none"
        }`}
      >
        <div className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goBack}
              className="h-8 w-8 shrink-0 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Avatar */}
            <div className="h-10 w-10 rounded-md overflow-hidden bg-neutral-200 shrink-0">
              {shop?.avatar_url ? (
                <img
                  src={shop.avatar_url}
                  alt={shop?.title ?? ""}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-neutral-700">
                  {shop?.title?.slice(0, 1).toUpperCase() ?? "S"}
                </div>
              )}
            </div>

            {/* Title + rating */}
            <div className="min-w-0">
              <div className="flex space-x-2">
                <div className="text-md font-semibold truncate">
                  {shop?.title ?? "Shop"}
                </div>
                {shop?.is_verified && (
                  <Image
                    src="/icons/verified_zaha.svg"
                    alt="Verified"
                    width={16}
                    height={16}
                    className="opacity-90"
                  />
                )}
              </div>
              <div className="flex items-center gap-1 text-sm">
                {Number.isFinite(avg) ? avg.toFixed(1) : "—"}
                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                <span className="text-xs text-neutral-500">({count ?? 0})</span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
                aria-label="Search in shop"
                title="Search in shop"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={shareShop}
                className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
                aria-label="Share shop"
                title="Share shop"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ——— COVER ——— */}
      <div ref={coverSentinelRef}>
        {loading ? <CoverSkeleton /> : <Cover cover={cover} />}
      </div>

      {/* ——— HEADER (avatar overlaps cover) ——— */}
      <section className="-mt-12 px-4 relative ">
        {isOwner && !loading && (
          <Link
            href="/seller/shop"
            className="absolute right-4 -top-6 z-10 text-xs rounded-full border px-3 py-1 bg-white/90 hover:bg-white"
          >
            Edit shop
          </Link>
        )}

        {loading ? (
          <ShopHeaderSkeleton />
        ) : (
          <ShopHeader
            shop={shop!}
            avg={avg}
            count={count}
            stats={stats}
            shopId={shopId}
          />
        )}
      </section>

      {/* ——— COLLECTIONS ——— */}
      <section className="px-4 mt-5 space-y-3 overflow-visible ">
        <div className="flex items-baseline justify-between ">
          {!loading && <h2 className="font-semibold">Collections</h2>}
          {selectedCol && !loading && (
            <button
              onClick={() => setSelectedCol(null)}
              className="text-xs underline"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="hidden">
            <CollectionsRailSkeleton />
          </div>
        ) : collections.length > 0 ? (
          <CollectionsRail
            collections={collections}
            items={items}
            links={links}
            goToCollection={goToCollection}
          />
        ) : (
          <div className="text-xs text-ink/60">No collections yet.</div>
        )}
      </section>

      {/* ——— SEARCH ——— */}
      <section className="px-4 mt-4">
        {!loading && (
          <h2 className="font-semibold mt-5 mb-4">Browse the shop</h2>
        )}
        {loading ? (
          <SearchBarSkeleton />
        ) : (
          <SearchBar
            q={q}
            setQ={setQ}
            itemsLen={items.length}
            inputRef={searchInputRef}
          />
        )}
      </section>

      {/* ——— FILTER BAR ——— */}
      <section className="px-4 mt-3">
        {loading ? (
          <FilterBarSkeleton />
        ) : (
          <FilterBar
            sort={sort}
            setSort={setSort}
            onSaleOnly={onSaleOnly}
            setOnSaleOnly={setOnSaleOnly}
          />
        )}
      </section>

      {/* ——— PRODUCT GRID ——— */}
      <section className="px-4 mt-4 grid grid-cols-2 gap-3">
        {loading && items.length === 0 ? (
          <ProductGridSkeleton />
        ) : filteredProducts.length ? (
          filteredProducts.map((p) => (
            <ProductCard key={p.id} p={p} variant="carousel" />
          ))
        ) : (
          <div className="col-span-2 text-sm text-ink/70 py-8 text-center">
            No results.
          </div>
        )}
      </section>

      {/* ——— LOAD MORE / SENTINEL ——— */}
      <div className="px-4 mt-4 mb-6">
        {/* sentinel for intersection observer */}
        <div ref={loadMoreRef} className="h-2" />
        {hasMore && (
          <div className="grid place-items-center mt-2">
            <button
              disabled={loadingPage}
              onClick={() =>
                fetchProductsPage({ pageIndex: page + 1, replace: false })
              }
              className="text-sm rounded-full border border-neutral-200 px-4 py-2 bg-white active:scale-[0.98]"
            >
              {loadingPage ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>

      {/* <ShopReviewsStrip shopId={shop?.id!} /> */}
    </main>
  );
}

// ================== Presentational Sections (unchanged visuals) ==================

function Cover({ cover }: { cover?: string | null }) {
  return (
    <div className="relative w-full h-56 overflow-hidden bg-neutral-900">
      {cover ? (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-white/100 via-white/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0" />
    </div>
  );
}

function ShopHeader({
  shop,
  avg,
  count,
  stats,
  shopId,
}: {
  shop: Shop;
  avg: number;
  count: number;
  stats: { sales: number; years: number } | null;
  shopId: string;
}) {
  return (
    <>
      <div className="flex items-end gap-3">
        <div className="relative shrink-0">
          <div className="h-24 w-24 rounded-xl ring-4 ring-paper overflow-hidden shadow-2xl bg-neutral-300">
            {shop.avatar_url ? (
              <img
                src={shop.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-white font-semibold">
                {shop.title?.slice(0, 1).toUpperCase() || "S"}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 mt-6">
        <h1 className="text-2xl font-semibold leading-tight mb-1 flex space-x-2 gap-2">
          {shop.title}{" "}
          {shop.is_verified && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Verified store details"
                  className="inline-flex items-center pr-4 mr-4"
                >
                  <Image
                    src="/icons/verified_zaha.svg"
                    alt="Verified"
                    width={20}
                    height={20}
                    className="opacity-90"
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="center"
                className="max-w-[240px] p-3 text-xs leading-snug bg-neutral-100 rounded-2xl"
              >
                <span className="font-medium">Verified store</span> — proven
                success with many fulfilled orders and long-standing presence on
                Zaha.
              </PopoverContent>
            </Popover>
          )}
        </h1>

        <div className="text-sm text-ink/70 inline-flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          <span>{`${shop.city}, Morocco` ?? "Morocco"}</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="flex-1 rounded-lg px-3 py-2 bg-neutral-100/75 text-center content-center">
            <div className="text-sm font-medium text-neutral-900">
              {stats ? stats.sales.toLocaleString() : "—"}
            </div>
            <div className="text-sm text-neutral-500">Sales</div>
          </div>

          <Link href={`/shop/${shopId}/reviews`}>
            <div className="flex-1 rounded-lg bg-neutral-100/75 px-3 py-2 text-center content-center">
              <div className="mt-1 text-sm font-medium text-neutral-900">
                <span className="inline-flex items-center gap-1">
                  {Number.isFinite(avg) ? avg.toFixed(1) : "—"}
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                  <span className="text-xs text-neutral-500">
                    ({count ?? 0})
                  </span>
                </span>
              </div>
              <div className="text-sm text-neutral-500">Ratings</div>
            </div>
          </Link>

          <div className="flex-1 rounded-lg bg-neutral-100/75 px-3 py-2 text-center content-center">
            <div className="text-sm font-medium text-neutral-900">
              {stats
                ? `${stats.years} ${stats.years > 1 ? "years" : "year"}`
                : "—"}
            </div>
            <div className="text-sm text-neutral-500">On Zaha</div>
          </div>
        </div>

        {shop.bio ? (
          <p className="text-sm text-ink/80 mt-3 line-clamp-3">{shop.bio}</p>
        ) : null}
      </div>
    </>
  );
}

function CollectionsRail({
  collections,
  items,
  links,
  goToCollection,
}: {
  collections: Collection[];
  items: ProductEx[];
  links: Record<string, string[]>;
  goToCollection: (cid: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-scroll no-scrollbar mt-3">
      {collections.map((c) => {
        const count = items.filter((p) =>
          (links[p.id] ?? []).includes(c.id)
        ).length;
        const fallbackImg = items.find((p) =>
          (links[p.id] ?? []).includes(c.id)
        )?.photos?.[0];
        const img = c.cover_url || fallbackImg;
        const abbr = `${c.title?.trim()?.[0]?.toUpperCase() ?? "?"}&`;

        return (
          <button
            key={c.id}
            onClick={() => goToCollection(c.id)}
            className="snap-start shrink-0 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white active:scale-[0.98] transition overflow-hidden"
            style={{ width: "200px" }}
          >
            <div className="w-16 h-16 overflow-hidden bg-neutral-100/80 flex items-center justify-center">
              {img ? (
                <img
                  src={img}
                  alt={c.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-semibold text-neutral-800">{abbr}</span>
              )}
            </div>
            <div className="flex flex-col flex-1 text-left pr-3">
              <div className="text-sm font-medium text-neutral-900 leading-snug line-clamp-2">
                {c.title}
              </div>
              {count > 0 && (
                <div className="text-xs text-neutral-500 mt-0.5">
                  {count} product{count > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SearchBar({
  q,
  setQ,
  itemsLen,
  inputRef,
}: {
  q: string;
  setQ: (v: string) => void;
  itemsLen: number;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink/50" />
      <Input
        ref={inputRef as any}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="h-12 pl-12 pr-12 text-base rounded-full border bg-transparent"
        placeholder={`Search all ${itemsLen} products`}
      />
      {!!q && (
        <button
          aria-label="Clear"
          onClick={() => setQ("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full hover:bg-neutral-50 text-ink/60"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function FilterBar({
  sort,
  setSort,
  onSaleOnly,
  setOnSaleOnly,
}: {
  sort: "new" | "price_asc" | "price_desc";
  setSort: (v: "new" | "price_asc" | "price_desc") => void;
  onSaleOnly: boolean;
  setOnSaleOnly: (updater: (v: boolean) => boolean) => void;
}) {
  return (
    <>
      <div className="flex gap-2 items-center overflow-x-auto no-scrollbar">
        <button
          onClick={() => setSort("new")}
          className={`h-8 px-3 rounded-full border text-sm whitespace-nowrap ${
            sort === "new"
              ? "bg-terracotta text-white"
              : "bg-white border-neutral-200 border"
          }`}
        >
          New
        </button>

        <button
          onClick={() => setSort("price_asc")}
          className={`h-8 px-3 rounded-full text-sm whitespace-nowrap ${
            sort === "price_asc"
              ? "bg-terracotta text-white"
              : "bg-white border-neutral-200 border"
          }`}
        >
          Price ↑
        </button>

        <button
          onClick={() => setSort("price_desc")}
          className={`h-8 px-3 rounded-full text-sm whitespace-nowrap ${
            sort === "price_desc"
              ? "bg-terracotta text-white"
              : "bg-white border-neutral-200 border"
          }`}
        >
          Price ↓
        </button>

        <span className="h-5 w-px bg-neutral-200 mx-2" />

        <button
          onClick={() => setOnSaleOnly((v) => !v)}
          className={`h-8 px-3 rounded-full text-sm whitespace-nowrap ${
            onSaleOnly
              ? "bg-terracotta text-white"
              : "bg-white border-neutral-200 border"
          }`}
        >
          On sale
        </button>
      </div>

      {(onSaleOnly || sort !== "new") && (
        <div className="mt-2">
          <button
            onClick={() => {
              setSort("new");
              setOnSaleOnly(() => false);
            }}
            className="text-xs text-ink/70 underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}

// ================== Skeletons ==================

function CoverSkeleton() {
  return (
    <div className="relative w-full h-56 overflow-hidden opacity-0">
      <Skeleton className="absolute inset-0 h-full w-full" />
    </div>
  );
}

function ShopHeaderSkeleton() {
  return (
    <>
      <div className="flex items-end gap-3">
        <div className="relative shrink-0">
          <Skeleton className="h-24 w-24 rounded-xl ring-4 ring-paper shadow-2xl" />
        </div>
      </div>

      <div className="flex-1 mt-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-40 rounded-md" />
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Skeleton className="h-4 w-28 rounded-md" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-neutral-100/75 px-3 py-2 text-center h-14"></div>
          <div className="rounded-lg bg-neutral-100/75 px-3 py-2 text-center"></div>
          <div className="rounded-lg bg-neutral-100/75 px-3 py-2 text-center"></div>
        </div>
      </div>
    </>
  );
}

function CollectionsRailSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar mt-3 pb-1">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="snap-start shrink-0 flex items-center gap-3 rounded-xl border border-neutral-200 bg-white overflow-hidden"
          style={{ width: 200 }}
        >
          <Skeleton className="h-16 w-16" />
          <div className="flex-1 py-2 pr-3">
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchBarSkeleton() {
  return <Skeleton className="h-12 w-full rounded-full hidden" />;
}

function FilterBarSkeleton() {
  return (
    <div className="flex gap-2 items-center overflow-x-auto no-scrollbar ">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full hidden" />
      ))}
      <span className="h-5 w-px bg-neutral-200 mx-2 hidden" />
      <Skeleton className="h-8 w-24 rounded-full hidden" />
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border bg-white">
          <Skeleton className="h-40 w-full" />
          <div className="p-2">
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </>
  );
}

// (Optional) untouched helper from your snippet
function BrowseTile({
  title,
  count,
  img,
  onClick,
}: {
  title: string;
  count: number;
  img?: string | null;
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
