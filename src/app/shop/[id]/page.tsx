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
  MapPin,
  Search,
  Star,
  X,
  ChevronLeft,
  Share2,
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
  Globe,
  Mail,
  Link2,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

// ================== Types ==================
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
  custom_commissions?: boolean | null;
  orders_count?: number | null;

  // NEW contact / social fields
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  facebook?: string | null;
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

type Collection = {
  id: string;
  title: string;
  cover_url: string | null;
  order_index?: number | null; // 👈 add this
};

// ===== Pagination config =====
const PAGE_SIZE = 16;

function WhatsAppGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 740 740"
      aria-hidden="true"
      focusable="false"
      {...props}
      fill="#3b302f"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M630.056 107.658C560.727 38.271 468.525.039 370.294 0 167.891 0 3.16 164.668 3.079 367.072c-.027 64.699 16.883 127.855 49.016 183.523L0 740.824l194.666-51.047c53.634 29.244 114.022 44.656 175.481 44.682h.151c202.382 0 367.128-164.689 367.21-367.094.039-98.088-38.121-190.32-107.452-259.707m-259.758 564.8h-.125c-54.766-.021-108.483-14.729-155.343-42.529l-11.146-6.613-115.516 30.293 30.834-112.592-7.258-11.543c-30.552-48.58-46.689-104.729-46.665-162.379C65.146 198.865 202.065 62 370.419 62c81.521.031 158.154 31.81 215.779 89.482s89.342 134.332 89.311 215.859c-.07 168.242-136.987 305.117-305.211 305.117m167.415-228.514c-9.176-4.591-54.286-26.782-62.697-29.843-8.41-3.061-14.526-4.591-20.644 4.592-6.116 9.182-23.7 29.843-29.054 35.964-5.351 6.122-10.703 6.888-19.879 2.296-9.175-4.591-38.739-14.276-73.786-45.526-27.275-24.32-45.691-54.36-51.043-63.542-5.352-9.183-.569-14.148 4.024-18.72 4.127-4.11 9.175-10.713 13.763-16.07 4.587-5.356 6.116-9.182 9.174-15.303 3.059-6.122 1.53-11.479-.764-16.07-2.294-4.591-20.643-49.739-28.29-68.104-7.447-17.886-15.012-15.466-20.644-15.746-5.346-.266-11.469-.323-17.585-.323-6.117 0-16.057 2.296-24.468 11.478-8.41 9.183-32.112 31.374-32.112 76.521s32.877 88.763 37.465 94.885c4.587 6.122 64.699 98.771 156.741 138.502 21.891 9.45 38.982 15.093 52.307 19.323 21.981 6.979 41.983 5.994 57.793 3.633 17.628-2.633 54.285-22.19 61.932-43.616 7.646-21.426 7.646-39.791 5.352-43.617-2.293-3.826-8.41-6.122-17.585-10.714"
      />
    </svg>
  );
}

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

  // 👇 NEW: collection_id -> (product_id -> order_index)
  const [collectionOrder, setCollectionOrder] = useState<
    Record<string, Record<string, number | null>>
  >({});

  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stats, setStats] = useState<{ sales: number; years: number } | null>(
    null
  );
  const [isOwner, setIsOwner] = useState(false);

  // sticky header stuff
  const [showStickyTop, setShowStickyTop] = useState(false);
  const coverSentinelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null!);
  const [canGoBack, setCanGoBack] = useState(false);

  // load-more sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // contact drawer
  const [contactOpen, setContactOpen] = useState(false);

  const [aboutOpen, setAboutOpen] = useState(false);

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
          "id,title,bio,is_verified,city,owner,avatar_url,cover_urls,created_at,custom_commissions,orders_count,phone,whatsapp,email,website,instagram,facebook"
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
        .select("id,title,cover_url,order_index") // 👈 include order_index
        .eq("shop_id", shopId)
        .order("order_index", { ascending: true, nullsFirst: false }) // 👈 primary order
        .order("title", { ascending: true }); // 👈 fallback

      if (cancelled) return;
      setCollections((cols as any[]) ?? []);

      // 3) product↔collection links (with order_index)
      const { data: pcs } = await supabase
        .from("product_collections")
        .select(
          `
          product_id,
          collection_id,
          order_index,
          products!inner(shop_id)
        `
        )
        .eq("products.shop_id", shopId);

      if (cancelled) return;

      const map: Record<string, string[]> = {};
      const orderMap: Record<string, Record<string, number | null>> = {};

      (pcs as any[])?.forEach((l) => {
        const pid = l.product_id as string;
        const cid = l.collection_id as string;
        const ord =
          typeof l.order_index === "number" ? (l.order_index as number) : null;

        // product -> collections (used for filtering / grouping)
        if (!map[pid]) map[pid] = [];
        map[pid].push(cid);

        // collection -> product -> order_index
        if (!orderMap[cid]) orderMap[cid] = {};
        orderMap[cid][pid] = ord;
      });

      setLinks(map);
      setCollectionOrder(orderMap);

      // reset pagination, then fetch first page
      setItems([]);
      setPage(0);
      setHasMore(true);

      await fetchProductsPage({ pageIndex: 0, replace: true });

      // compute "years on Zaha" from shop.created_at
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
        // sales will be filled by another effect once products are loaded
        setStats((prev) => ({
          sales: prev?.sales ?? 0,
          years,
        }));
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
        setLoadingPage(false);
        return;
      }

      setItems((prev) => (replace ? list : [...prev, ...list]));
      setHasMore(list.length === PAGE_SIZE);
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

  // ---- Compute sales once we know which products belong to this shop ----
  useEffect(() => {
    if (!shopId || !items.length) return;

    let cancelled = false;

    (async () => {
      const ids = items.map((p) => p.id);

      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("product_id", ids)
        .eq("status", "delivered");

      if (cancelled) return;

      setStats((prev) => ({
        years: prev?.years ?? 1,
        sales: error ? (prev?.sales ?? 0) : (count ?? 0),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [shopId, items]);

  // ✅ unified filtered+sorted view over loaded pages
  const filteredProducts = useMemo(() => {
    const term = q.trim().toLowerCase();

    let out = items.filter((p) => {
      const byText = !term || p.title.toLowerCase().includes(term);

      const byPromo = !onSaleOnly || isPromo(p);

      const price = Number(p.price_mad ?? 0);
      const byMin = priceRange.min == null || price >= priceRange.min;
      const byMax = priceRange.max == null || price <= priceRange.max;

      return byText && byPromo && byMin && byMax;
    });

    out = out.slice().sort((a, b) => {
      if (sort === "price_asc") return (a.price_mad ?? 0) - (b.price_mad ?? 0);
      if (sort === "price_desc") return (b.price_mad ?? 0) - (a.price_mad ?? 0);
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return out;
  }, [items, q, onSaleOnly, priceRange.min, priceRange.max, sort]);

  function CollectionBoardCard({
    collection,
    products,
  }: {
    collection: Collection;
    products: ProductEx[];
  }) {
    const count = products.length;

    // first 3 product photos
    const thumbs = products
      .map((p) => p.photos?.[0])
      .filter(Boolean) as string[];

    const primary = thumbs[0] || collection.cover_url || null;
    const secondary = thumbs[1] || null;
    const tertiary = thumbs[2] || null;

    const abbr =
      collection.title?.trim()?.[0] != null
        ? collection.title.trim()[0].toUpperCase()
        : "Z";

    return (
      <div className="inline-block w-full">
        {/* Card */}
        <div className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="grid grid-cols-12 gap-1 items-stretch">
            {/* LEFT SQUARE (real height via aspect-square) */}
            <div className="col-span-8">
              <div className="relative w-full aspect-square overflow-hidden rounded-l-lg bg-neutral-100">
                {primary ? (
                  <img
                    src={primary}
                    alt={collection.title}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold text-neutral-500">
                    {abbr}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN – matches height perfectly */}
            <div className="col-span-4 flex flex-col gap-1">
              <div className="relative flex-1 overflow-hidden rounded-tr-lg bg-neutral-100 aspect-square ">
                {secondary && (
                  <img
                    src={secondary}
                    alt={`${collection.title} secondary`}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="relative flex-1 overflow-hidden rounded-br-lg bg-neutral-100 aspect-square ">
                {tertiary && (
                  <img
                    src={tertiary}
                    alt={`${collection.title} tertiary`}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Text under card */}
        <div className="mt-3">
          <p className="text-md font-semibold leading-tight truncate text-ink">
            {collection.title}
          </p>
          <p className="text-sm text-neutral-500">
            {count} item{count !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    );
  }

  // ✅ group products by collection for the "categories" section
  const collectionSections = useMemo(
    () =>
      collections
        .map((c) => {
          const rawProducts = items.filter((p) =>
            (links[p.id] ?? []).includes(c.id)
          );

          // sort by saved order_index, fallback to created_at desc
          const ordered = rawProducts
            .map((p) => ({
              product: p,
              order: collectionOrder[c.id]?.[p.id] ?? null,
            }))
            .sort((a, b) => {
              const ao = a.order;
              const bo = b.order;

              if (ao != null && bo != null) return ao - bo;
              if (ao != null) return -1;
              if (bo != null) return 1;

              // fallback: newest first
              return (
                new Date(b.product.created_at).getTime() -
                new Date(a.product.created_at).getTime()
              );
            })
            .map((x) => x.product);

          return {
            collection: c,
            products: ordered,
          };
        })
        .filter((section) => section.products.length > 0),
    [collections, items, links, collectionOrder]
  );

  if (!shopId) return <main className="p-4">Invalid shop.</main>;
  if (!shop && !loading) return <main className="p-4">Shop not found.</main>;

  const commissionsOpen = !!shop?.custom_commissions;

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

  const openContact = () => setContactOpen(true);

  return (
    <Sheet open={contactOpen} onOpenChange={setContactOpen}>
      <main className="pb-24 overflow-visible max-w-xl mx-auto">
        <AboutSheet open={aboutOpen} onOpenChange={setAboutOpen} shop={shop} />
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
                  <span className="text-xs text-neutral-500">
                    ({count ?? 0})
                  </span>
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
              className="absolute right-4 top-15 z-10 text-xs rounded-full border px-3 py-1 bg-white"
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
              onOpenContact={openContact}
              onOpenAbout={() => setAboutOpen(true)}
            />
          )}
        </section>
        {/* ——— SHOP CATEGORIES (collection cards) ——— */}
        {!loading && collectionSections.length > 0 && (
          <section className="px-4 mt-5 space-y-3 overflow-visible">
            <h2 className="font-semibold">Collections</h2>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {collectionSections.map(({ collection, products }) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => goToCollection(collection.id)}
                  className="shrink-0 w-[260px] text-left active:scale-[0.98] transition"
                >
                  <CollectionBoardCard
                    collection={collection}
                    products={products}
                  />
                </button>
              ))}
            </div>
          </section>
        )}

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
            <div className="col-span-2 text-sm text-ink/70 py-8 text-center space-y-3">
              <p>No results found.</p>

              {commissionsOpen ? (
                <>
                  <p className="text-xs text-neutral-500">
                    Didn’t find what you&apos;re looking for? This shop accepts
                    custom commissions.
                  </p>
                  <button
                    type="button"
                    onClick={openContact}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-900 hover:bg-neutral-50 active:scale-[0.98]"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Request a custom commission</span>
                  </button>
                </>
              ) : (
                <p className="text-xs text-neutral-500">
                  This shop is not accepting custom commissions at the moment.
                </p>
              )}
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

      {/* ========= CONTACT SHEET ========= */}
      <ContactSheet
        open={contactOpen}
        shop={shop}
        avg={avg}
        count={count}
        onOpenChange={setContactOpen}
      />
    </Sheet>
  );
}

// ================== Presentational Sections ==================

function Cover({ cover }: { cover?: string | null }) {
  return (
    <div className="relative w-full h-62 overflow-hidden bg-neutral-900">
      {cover ? (
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-800" />
      )}
      <div className="pointer-events-none absolute inset-x-0" />
    </div>
  );
}

function ShopHeader({
  shop,
  avg,
  count,
  stats,
  onOpenContact,
  onOpenAbout,
}: {
  shop: Shop;
  avg: number;
  count: number;
  stats: { sales: number; years: number } | null;
  onOpenContact: () => void;
  onOpenAbout: () => void;
}) {
  const cityLabel = shop.city ? `${shop.city}, Morocco` : "Morocco";

  const hasWhatsApp = !!shop.whatsapp && shop.whatsapp.trim().length > 0;
  const waNumber = shop.whatsapp?.replace(/\D/g, "") ?? "";
  const waUrl =
    hasWhatsApp && waNumber.length > 0 ? `https://wa.me/${waNumber}` : null;

  const openWhatsApp = () => {
    if (waUrl) {
      window.open(waUrl, "_blank");
    }
  };

  return (
    <>
      <div className=" ">
        <div className="relative shrink-0">
          <div className="h-24 w-24 rounded-2xl ring-4 ring-paper overflow-hidden shadow-2xl bg-neutral-300">
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

        <div className="flex-1 mt-6">
          {/* Name + verified + location + main CTAs */}
          <div className="flex flex-col gap-3 justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold leading-tight">
                  {shop.title}
                </h1>
                {shop.is_verified && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Verified store details"
                        className="inline-flex items-center"
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
                      className="max-w-60 p-3 text-xs leading-snug bg-neutral-100 rounded-2xl z-100"
                    >
                      <span className="font-medium">Verified store</span> —
                      proven success with many fulfilled orders and a solid
                      track record on Zaha.
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="mt- text-md text-ink/70 inline-flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{cityLabel}</span>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="h-10 p-4 px-5 rounded-full bg-ink text-sand text-md font-medium hover:brightness-105 active:scale-[0.98] inline-flex items-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Get in touch</span>
                </button>

                {hasWhatsApp && (
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    className="h-10 w-10 justify-center rounded-full border border-neutral-200 bg-white text-sm font-medium text-neutral-900 hover:bg-neutral-50 active:scale-[0.98] inline-flex items-center gap-1.5"
                    aria-label="Chat on WhatsApp"
                  >
                    <WhatsAppGlyph className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                {shop.custom_commissions && (
                  <div className="text-xs text-emerald-700 inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Open for commissions </span>
                  </div>
                )}
              </div>
            </div>

            <div className="justify-start">
              {/* Bio */}
              {shop.bio ? (
                <p className="text-sm text-neutral-500 mt-4 line-clamp-2 mr-2">
                  {shop.bio}
                </p>
              ) : null}

              {/* --- ABOUT LINK --- */}
              {shop.bio && (
                <button
                  type="button"
                  onClick={onOpenAbout}
                  className="text-sm text- underline mt font-semibold"
                >
                  About
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="flex-1 rounded-lg px-3 py-2 bg-neutral-100/75 text-center content-center">
                <div className="text-sm font-medium text-neutral-900">
                  {shop.orders_count ? shop.orders_count : "—"}
                </div>
                <div className="text-sm text-neutral-500">Sales</div>
              </div>

              <Link href={`/shop/${shop.id}/reviews`}>
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
          </div>
        </div>
      </div>
    </>
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

// ================== Contact Sheet ==================

function ContactSheet({
  open,
  onOpenChange,
  shop,
  avg,
  count,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: Shop | null;
  avg: number;
  count: number;
}) {
  const title = shop?.title ?? "Shop";

  type ContactItem = {
    id: string;
    fieldLabel: string;
    valueLabel: string;
    Icon: any;
    href?: string;
    target?: "_blank" | "_self";
  };

  const supportItems: ContactItem[] = [];

  if (shop?.phone) {
    supportItems.push({
      id: "phone",
      fieldLabel: "Phone number",
      valueLabel: shop.phone,
      Icon: Phone,
      href: `tel:${shop.phone}`,
      target: "_self",
    });
  }

  if (shop?.whatsapp) {
    const wa = shop.whatsapp.replace(/\D/g, "");
    supportItems.push({
      id: "whatsapp",
      fieldLabel: "WhatsApp",
      valueLabel: shop.whatsapp,
      Icon: WhatsAppGlyph,
      href: wa ? `https://wa.me/${wa}` : undefined,
      target: "_blank",
    });
  }

  if (shop?.email) {
    supportItems.push({
      id: "email",
      fieldLabel: "Email address",
      valueLabel: shop.email,
      Icon: Mail,
      href: `mailto:${shop.email}`,
      target: "_self",
    });
  }

  if (shop?.website) {
    const url = shop.website.startsWith("http")
      ? shop.website
      : `https://${shop.website}`;
    supportItems.push({
      id: "website",
      fieldLabel: "Website",
      valueLabel: shop.website,
      Icon: Globe,
      href: url,
      target: "_blank",
    });
  }

  const socialItems: ContactItem[] = [];

  if (shop?.instagram) {
    const handle = shop.instagram.trim();
    const url = handle.startsWith("http")
      ? handle
      : `https://instagram.com/${handle.replace(/^@/, "")}`;
    socialItems.push({
      id: "instagram",
      fieldLabel: "Instagram",
      valueLabel: handle,
      Icon: Instagram,
      href: url,
      target: "_blank",
    });
  }

  if (shop?.facebook) {
    const url = shop.facebook.startsWith("http")
      ? shop.facebook
      : `https://facebook.com/${shop.facebook.replace(/^@/, "")}`;
    socialItems.push({
      id: "facebook",
      fieldLabel: "Facebook",
      valueLabel: shop.facebook,
      Icon: Facebook,
      href: url,
      target: "_blank",
    });
  }

  const handleClick = async (item: ContactItem) => {
    if (item.href) {
      // phone/email in same tab, others new tab unless specified
      window.open(item.href, item.target ?? "_blank");
      return;
    }

    // Fallback: copy value
    if (navigator.clipboard && item.valueLabel) {
      try {
        await navigator.clipboard.writeText(item.valueLabel);
      } catch {
        // ignore
      }
    }
    onOpenChange(false);
  };

  return (
    <SheetContent
      side="bottom"
      className="rounded-t-3xl border-t border-neutral-200 bg-white px-4 pt-4 pb-6 max-h-[80vh] overflow-y-auto"
    >
      {/* Header */}
      <SheetHeader className="mb-4">
        <div className="mx-auto h-1 w-10 rounded-full bg-neutral-200 mb-3 " />
        <SheetTitle className="text-base text-center">
          Contact this shop
        </SheetTitle>
        <SheetDescription className="text-xs text-neutral-500 px-10 pb-2 text-center">
          You can get in touch with{" "}
          <span className="font-medium text-neutral-800">{title}</span> using
          the options below.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4">
        {/* CUSTOMER SUPPORT CARD */}
        {supportItems.length > 0 && (
          <div className="rounded-3xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p className="text-xs font-medium text-neutral-500 mb-3">
              Customer Support
            </p>

            {supportItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className="w-full flex items-center gap-3 py-2 text-left"
              >
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
                  <item.Icon className="h-4 w-4 text-neutral-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium tracking-wide text-neutral-500">
                    {item.fieldLabel}
                  </div>
                  <div className="text-sm font-medium text-neutral-900 truncate">
                    {item.valueLabel}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* SOCIAL MEDIA CARD */}
        {socialItems.length > 0 && (
          <div className="rounded-3xl bg-neutral-50 border border-neutral-200 px-4 py-3">
            <p className="text-xs font-medium text-neutral-500 mb-3">
              Social media
            </p>

            {socialItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item)}
                className="w-full flex items-center gap-3 py-2 text-left"
              >
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
                  <item.Icon className="h-4 w-4 text-neutral-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium tracking-wide text-neutral-500">
                    {item.fieldLabel}
                  </div>
                  <div className="text-sm font-medium text-neutral-900 truncate">
                    {item.valueLabel}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </SheetContent>
  );
}

function AboutSheet({
  open,
  onOpenChange,
  shop,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shop: Shop | null;
}) {
  if (!shop) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl border-t border-neutral-200 bg-white px-4 pt-4 pb-8 max-h-[75vh] overflow-y-auto"
      >
        <SheetHeader className="mb-4">
          <div className="mx-auto h-1 w-10 rounded-full bg-neutral-200 mb-3" />
          <SheetTitle className="text-base text-left">
            About this shop
          </SheetTitle>
        </SheetHeader>

        <div className="text-sm text-ink/90 leading-relaxed whitespace-pre-line">
          {shop.bio}
        </div>
      </SheetContent>
    </Sheet>
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
      <div className=" ">
        <div className="relative shrink-0">
          <Skeleton className="h-24 w-24 rounded-2xl ring-4 ring-paper shadow-2xl" />
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
