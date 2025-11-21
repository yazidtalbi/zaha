"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useId,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Heart,
  Share2,
  MessageSquare,
  ChevronLeft,
  Pencil,
  X,
  ChevronRight,
  ChevronLeft as ChevronLeftIcon,
  Store,
  Package,
  FileDown,
  Ruler,
  Scale,
  MapPin,
  Truck,
  Layers,
  Edit3,
  Undo2,
  Star,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowRight,
} from "lucide-react";
import { addToCart } from "@/lib/cart";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import useEmblaCarousel from "embla-carousel-react";
import ProductReviewsStrip from "@/components/reviews/ProductReviewsStrip";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductSeed } from "@/lib/productSeed";
import FavButton from "@/components/FavButton";
import { OptionGroupField } from "@/components/product/OptionGroupField";

/* -------------------------------------------------
   Types
-------------------------------------------------- */
type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type CatLink = {
  id: string;
  path: string;
  slug: string;
  name_en: string | null;
  depth: number | null;
  is_primary: boolean;
};

/* -------------------------------------------------
   Utilities
-------------------------------------------------- */
function remember(p: {
  id: string;
  title: string;
  price_mad: number;
  photos: string[] | null;
}) {
  if (typeof window === "undefined") return;
  try {
    const key = "recently_viewed";
    const max = 12;
    const entry = {
      id: p.id,
      title: p.title,
      price_mad: p.price_mad,
      photo: Array.isArray(p.photos) ? (p.photos[0] ?? null) : null,
      at: Date.now(),
    };
    const prev: (typeof entry)[] = JSON.parse(
      localStorage.getItem(key) || "[]"
    );
    const next = [entry, ...prev.filter((x) => x.id !== entry.id)].slice(
      0,
      max
    );
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
}
function isPromoActive(p: any) {
  const price = Number(p?.promo_price_mad ?? 0);
  const start = p?.promo_starts_at ? Date.parse(p.promo_starts_at) : NaN;
  const end = p?.promo_ends_at ? Date.parse(p.promo_ends_at) : NaN;
  const now = Date.now();
  return (
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(start) &&
    Number.isFinite(end) &&
    now >= start &&
    now <= end
  );
}
function formatEndsShort(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}
function keywordArray(s?: string | null) {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

/* -------------------------------------------------
   Small subcomponents (TagList, StatPill, Section, DetailRow, Skeleton)
-------------------------------------------------- */
function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-1 flex flex-wrap text-sm text-neutral-500">
      {items.map((tag, i) => (
        <span key={tag} className="flex items-center">
          {tag}
          {i < items.length - 1 && (
            <span className="mr-1 text-neutral-400">,</span>
          )}
        </span>
      ))}
    </div>
  );
}
function StatPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-lg bg-white px-3 py-2">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-neutral-900">{value}</div>
    </div>
  );
}
function VisibleAreaSkeleton() {
  return (
    <main className="pb-10 bg-neutral-50 min-h-screen">
      <div className="fixed z-10 top-3 left-3 flex items-center gap-2 p-2">
        <div className="relative rounded-2xl bg-white">
          <div className="overflow-hidden rounded-xl">
            <div className="aspect-7/8 sm:aspect-4/3">
              <Skeleton className="h-full w-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-4">
        <div className="-space-y-1 mt-4">
          <div className="mt-2 flex items-center gap-3">
            <Skeleton className="h-7 w-40 rounded-md" />
          </div>
        </div>
        <div className="-space-y-1">
          <Skeleton className="h-5 w-4/5 rounded-md" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-2 h-4 w-44 rounded-md" />
          <Skeleton className="mt-2 h-4 w-52 rounded-md" />
        </div>
        <div className="mt-6 flex items-stretch gap-2">
          <div className="flex-1 rounded-lg bg-white p-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="mt-2 h-4 w-16 rounded" />
          </div>
          <div className="flex-1 rounded-lg bg-white p-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="mt-2 h-4 w-16 rounded" />
          </div>
          <div className="flex-1 rounded-lg bg-white p-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="mt-2 h-4 w-16 rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
function Section({
  title,
  children,
  right,
  collapsible = false,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);

  useEffect(
    () => setOpen(collapsible ? defaultOpen : true),
    [collapsible, defaultOpen]
  );

  const handleToggle = () => {
    if (!collapsible) return;
    setOpen((v) => !v);
  };

  return (
    <section className="px-4 py-4">
      {/* ⬇️ Whole header is now clickable when collapsible === true */}
      <div
        className={`flex items-center justify-between ${
          collapsible ? "cursor-pointer select-none" : ""
        }`}
        onClick={handleToggle}
        role={collapsible ? "button" : undefined}
        aria-expanded={collapsible ? open : undefined}
        aria-controls={collapsible ? panelId : undefined}
      >
        <h3 className="text-base font-semibold">{title}</h3>

        <div className="flex items-center gap-2">
          {right}
          {collapsible && (
            <span className="p-1 text-neutral-600">
              {open ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </span>
          )}
        </div>
      </div>

      {(!collapsible || open) && (
        <div id={panelId} className="mt-3">
          {children}
        </div>
      )}
    </section>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5">{icon}</span>
      <span className="text-sm leading-relaxed">
        <span className="font-medium">{label}: </span>
        <span className="text-neutral-700">{value}</span>
      </span>
    </li>
  );
}

/* -------------------------------------------------
   Product carousel (image + true lazy video + spinner)
-------------------------------------------------- */
function ProductCarousel({
  media,
  title,
  onOpen,
}: {
  media: Array<
    | { type: "image"; src: string }
    | { type: "video"; src: string; poster?: string }
  >;
  title: string;
  onOpen: (i: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  const videoIndex = useMemo(
    () => media.findIndex((m) => m.type === "video"),
    [media]
  );
  const shouldLoadVideo = videoIndex >= 0 && idx === videoIndex;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIdx(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldLoadVideo) v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [shouldLoadVideo]);

  const items = media.length ? media : [{ type: "image", src: "" as string }];

  return (
    <div className="">
      <div className="relative rounded-4xl bg-white">
        <div ref={emblaRef} className="overflow-hidden rounded-b-xl">
          <div className="flex">
            {items.map((item, i) => (
              <div
                key={i}
                className="relative min-w-0 flex-[0_0_100%] aspect-7/8 sm:aspect-4/3 bg-neutral-100"
              >
                {item.type === "image" ? (
                  item.src ? (
                    <button
                      className="absolute inset-0 w-full h-full"
                      onClick={() => onOpen(i)}
                      aria-label={`Open image ${i + 1}`}
                    >
                      <img
                        src={item.src}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading={i === 0 ? "eager" : "lazy"}
                      />
                    </button>
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-neutral-500">
                      No image
                    </div>
                  )
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover"
                      poster={
                        item.type === "video" ? (item as any).poster : undefined
                      }
                      {...(shouldLoadVideo ? { src: item.src } : {})}
                      muted
                      playsInline
                      autoPlay
                      loop
                      preload="none"
                      controls={false}
                      onLoadStart={() => setVideoLoading(true)}
                      onLoadedData={() => setVideoLoading(false)}
                      onCanPlay={() => setVideoLoading(false)}
                      onPlaying={() => setVideoLoading(false)}
                      onWaiting={() => setVideoLoading(true)}
                      onError={() => setVideoLoading(false)}
                    />
                    {videoLoading && (
                      <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
                        <div className="h-6 w-6 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {items.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center">
            <div className="rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {items.map((m, i) => {
                  const isActive = i === idx;
                  const isVideoDot = m.type === "video";
                  return (
                    <button
                      key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      aria-label={`Go to slide ${i + 1}`}
                      className="h-2 w-2 grid place-items-center"
                    >
                      {isVideoDot && !isActive ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-2 w-2"
                          aria-hidden="true"
                        >
                          <path
                            d="M8 5v14l11-7-11-7z"
                            fill="white"
                            fillOpacity="0.75"
                          />
                        </svg>
                      ) : (
                        <span
                          className={`block h-1.5 w-1.5 rounded-full ${
                            isActive ? "bg-white" : "bg-white/50"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------
   Page
-------------------------------------------------- */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const popSeed = useProductSeed((s) => s.popSeed);

  // 1) Try seed (from prior navigation)
  const seeded = id ? popSeed(id) : null;

  // 2) Try sessionStorage cache (fast back/forward)
  const cached = (() => {
    if (typeof window === "undefined" || !id) return null;
    try {
      const raw = sessionStorage.getItem(`product_cache_${id}`);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      delete obj.__ts;
      return obj;
    } catch {
      return null;
    }
  })();

  const [p, setP] = useState<any>(seeded ?? cached ?? null);
  const [shop, setShop] = useState<any>(null);

  // availability controlled by parent first (seed/cache), then by DB fetch
  const [availability, setAvailability] = useState<
    "loading" | "available" | "unavailable"
  >(() => {
    const src: any = seeded ?? cached;
    if (!src) return "loading";
    const isUnavailable =
      Boolean(src.unavailable) ||
      src.active === false ||
      Boolean(src.deleted_at);
    return isUnavailable ? "unavailable" : "available";
  });

  const [similar, setSimilar] = useState<any[]>([]);
  const [moreFromShop, setMoreFromShop] = useState<any[]>([]);

  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);

  const [catLinks, setCatLinks] = useState<CatLink[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUid(data.user?.id ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setUid(sess?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  const isOwner = useMemo(() => {
    if (!uid) return false;
    return ((p?.shop_owner && p.shop_owner === uid) ||
      (shop?.owner && shop.owner === uid)) as boolean;
  }, [uid, p?.shop_owner, shop?.owner]);

  const [inCart, setInCart] = useState(false);
  const [qty, setQty] = useState(1);

  // NOTE: if we have p from seed/cache, start with loading=false to avoid flash.
  const [loading, setLoading] = useState(() => !p);
  const [err, setErr] = useState<string | null>(null);
  const [descOpen, setDescOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const [fsOpen, setFsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const [showStickyTop, setShowStickyTop] = useState(false);
  const [showStickyAdd, setShowStickyAdd] = useState(false);
  const mainCtaRef = useRef<HTMLDivElement | null>(null);

  // Fetch: if we already have p, revalidate in background without flipping loading=true.
  useEffect(() => {
    const _id = (id ?? "").toString().trim();
    if (!_id) {
      setErr("No product id provided");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      if (!p) setLoading(true);

      const prodPromise = supabase
        .from("products")
        .select(
          `*, shops:shop_id ( id, title, avatar_url, owner, created_at, city )`
        )
        .eq("id", _id)
        .maybeSingle();

      const ratingPromise = supabase
        .from("reviews")
        .select("rating", { count: "exact", head: false })
        .eq("product_id", _id);

      const [{ data: prod, error: prodErr }, { data: rvData, count: rvCount }] =
        await Promise.all([prodPromise, ratingPromise]);

      if (cancelled) return;

      if (prodErr || !prod) {
        if (!p) setErr(prodErr?.message || "Product not found");
        setLoading(false);
        return;
      }

      setP(prod);
      setShop((prod as any).shops || null);

      // Update availability from DB row
      const dbUnavailable =
        Boolean((prod as any).unavailable) ||
        (prod as any).active === false ||
        Boolean((prod as any).deleted_at);
      setAvailability(dbUnavailable ? "unavailable" : "available");

      try {
        sessionStorage.setItem(
          `product_cache_${_id}`,
          JSON.stringify({ ...prod, __ts: Date.now() })
        );
      } catch {}

      setRatingCount(rvCount ?? 0);
      if (Array.isArray(rvData) && rvData.length) {
        const avg =
          rvData.reduce(
            (acc: number, r: any) => acc + Number(r.rating || 0),
            0
          ) / rvData.length;
        setRatingAvg(Number.isFinite(avg) ? avg : null);
      } else setRatingAvg(null);

      remember(prod);

      const { data: catRows } = await supabase
        .from("product_categories")
        .select(
          `is_primary, categories:categories!inner ( id, path, slug, name_en, depth )`
        )
        .eq("product_id", _id);

      if (!cancelled) {
        if (!catRows?.length) {
          setCatLinks([]);
          setCatLoading(false);
        } else {
          const rows: CatLink[] = (catRows as any[]).map((r) => ({
            id: r.categories.id,
            path: r.categories.path,
            slug: r.categories.slug,
            name_en: r.categories.name_en ?? null,
            depth: r.categories.depth ?? null,
            is_primary: Boolean(r.is_primary),
          }));
          rows.sort((a, b) => {
            if (a.is_primary && !b.is_primary) return -1;
            if (b.is_primary && !a.is_primary) return 1;
            return (b.depth ?? 0) - (a.depth ?? 0);
          });
          setCatLinks(rows);
          setCatLoading(false);
        }
      }

      // related in parallel
      const related: Promise<any>[] = [];

      if (prod.shop_id) {
        related.push(
          (
            supabase
              .from("products")
              .select("*")
              .eq("active", true)
              .eq("unavailable", false)
              .eq("shop_id", prod.shop_id)
              .neq("id", _id)
              .limit(10) as unknown as Promise<any>
          ).then(({ data }) =>
            !cancelled ? setMoreFromShop((data ?? []).filter(Boolean)) : null
          )
        );
      }

      related.push(
        (async () => {
          let similarSet: any[] = [];
          if (catRows?.length) {
            const pick =
              catRows.find((r: any) => r.is_primary) ??
              [...catRows].sort(
                (a: any, b: any) =>
                  (a.categories?.depth ?? 0) - (b.categories?.depth ?? 0)
              )[catRows.length - 1];

            const basePath: string | null =
              (pick?.categories as any)?.[0]?.path ?? null;
            if (basePath) {
              const { data: cats } = await supabase
                .from("categories")
                .select("id")
                .like("path", `${basePath}%`);
              const catIds = (cats ?? []).map((c: any) => c.id);
              if (catIds.length) {
                const { data: pc } = await supabase
                  .from("product_categories")
                  .select("product_id")
                  .in("category_id", catIds)
                  .neq("product_id", _id)
                  .limit(200);

                const productIds = Array.from(
                  new Set((pc ?? []).map((x: any) => x.product_id))
                ).slice(0, 24);
                if (productIds.length) {
                  const { data: prods } = await supabase
                    .from("products")
                    .select("*")
                    .in("id", productIds)
                    .eq("active", true)
                    .eq("unavailable", false)
                    .limit(24);
                  similarSet = (prods ?? []).filter(Boolean);
                }
              }
            }
          }

          if (!similarSet.length) {
            let q = supabase
              .from("products")
              .select("*")
              .eq("active", true)
              .eq("unavailable", false)
              .neq("id", _id)
              .limit(8);
            if (prod.city) q = q.ilike("city", prod.city);
            const sim = await q;
            similarSet = (sim.data as any[]) ?? [];
          }

          if (!cancelled) setSimilar(similarSet);
        })()
      );

      await Promise.all(related);
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // option groups
  const optionGroups: OptionGroup[] = useMemo(
    () =>
      Array.isArray(p?.options_config)
        ? (p.options_config as OptionGroup[])
        : [],
    [p?.options_config]
  );
  const [selected, setSelected] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!optionGroups.length) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const g of optionGroups)
        if (!next[g.id]) next[g.id] = g.values[0]?.id ?? "";
      return next;
    });
  }, [optionGroups]);

  const personalizationConfig = useMemo(() => {
    const cfg = p?.personalization_config ?? {};
    const enabled = Boolean(p?.personalization_enabled ?? cfg.enabled);
    const instructions = String(
      p?.personalization_instructions ?? cfg.instructions ?? ""
    ).trim();
    const maxCharsRaw = p?.personalization_max_chars ?? cfg.maxChars ?? 256;
    const maxChars = Math.max(1, Number(maxCharsRaw) || 256);
    return { enabled, instructions, maxChars };
  }, [
    p?.personalization_enabled,
    p?.personalization_instructions,
    p?.personalization_max_chars,
    p?.personalization_config,
  ]);
  const [personalization, setPersonalization] = useState("");

  // fullscreen gallery
  const [fsRef, fsApi] = useEmblaCarousel({
    loop: true,
    startIndex,
    align: "start",
  });
  useEffect(() => {
    fsApi?.scrollTo(startIndex, true);
  }, [fsApi, startIndex]);
  const fsPrev = useCallback(() => fsApi?.scrollPrev(), [fsApi]);
  const fsNext = useCallback(() => fsApi?.scrollNext(), [fsApi]);

  // sticky bars
  useEffect(() => {
    const onScroll = () => setShowStickyTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const el = mainCtaRef.current;
    if (!el) return () => window.removeEventListener("scroll", onScroll);
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyAdd(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -80px 0px" }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // cart status for current product
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || !p?.id || isOwner) return;
      const { count } = await supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("product_id", p.id);
      setInCart((count ?? 0) > 0);
    })();
  }, [p?.id, isOwner]);

  // pricing
  const basePrice = p?.price_mad ?? 0;
  const [minTotal, maxTotal] = useMemo(() => {
    if (!optionGroups.length) return [basePrice, basePrice] as [number, number];
    const sums = (pick: "min" | "max") =>
      optionGroups.reduce((acc, g) => {
        const deltas = g.values.map((v) => Number(v.price_delta_mad ?? 0));
        if (!deltas.length) return acc;
        const part = pick === "min" ? Math.min(...deltas) : Math.max(...deltas);
        return acc + part;
      }, basePrice);
    return [sums("min"), sums("max")] as [number, number];
  }, [basePrice, optionGroups]);

  const selectedDelta = useMemo(() => {
    let d = 0;
    for (const g of optionGroups) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      d += Number(v?.price_delta_mad ?? 0);
    }
    return d;
  }, [optionGroups, selected]);

  const currentTotal = basePrice + selectedDelta;
  const promoActive = isPromoActive(p);
  const promoTotal = promoActive
    ? Math.round(Number(p.promo_price_mad)) + selectedDelta
    : null;
  const showPriceRange = minTotal !== maxTotal && !promoActive;

  const isRemoved = Boolean(p?.deleted_at);
  const isInactive = p?.active === false;
  const isUnavailable = availability === "unavailable";

  function selectionsToLabel(): string {
    const parts: string[] = [];
    for (const g of optionGroups) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      if (v) parts.push(`${g.name}:${v.label}`);
    }
    return parts.join("|");
  }
  function selectionsToOptionsObject(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const g of optionGroups) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      if (v) out[g.name] = v.label;
    }
    return out;
  }

  // media model for the product carousel
  type MediaItem =
    | { type: "image"; src: string }
    | { type: "video"; src: string; poster?: string };

  const media: MediaItem[] = useMemo(() => {
    const imgs = (p?.photos ?? []).map((src: string) => ({
      type: "image",
      src,
    })) as MediaItem[];
    if (!p?.video_url) return imgs;
    const videoItem: MediaItem = {
      type: "video",
      src: p.video_url,
      poster: p?.video_poster_url || undefined,
    };
    if (imgs.length >= 1) {
      const arr = [...imgs];
      arr.splice(1, 0, videoItem);
      return arr;
    }
    return [videoItem];
  }, [p]);

  const [canGoBack, setCanGoBack] = useState(false);

  const handleOpenShop = useCallback(() => {
    if (!p?.shop_id) return;

    if (typeof window !== "undefined") {
      try {
        const prevState = window.history.state || {};

        // What we pass to /shop/[id] – match your Shop type shape
        const shopPayload = {
          id: shop?.id ?? p.shop_id,
          title: shop?.title ?? p.shop_title ?? "Shop",
          is_verified: shop?.is_verified ?? false,
          bio: shop?.bio ?? null,
          city: shop?.city ?? p.city ?? null,
          owner: shop?.owner ?? p.shop_owner ?? null,
          avatar_url: shop?.avatar_url ?? null,
          cover_urls: shop?.cover_urls ?? null,
          created_at: shop?.created_at ?? null,
          custom_commissions: shop?.custom_commissions ?? null,
          orders_count: shop?.orders_count ?? p.orders_count ?? null,
          phone: shop?.phone ?? null,
          whatsapp: shop?.whatsapp ?? null,
          email: shop?.email ?? null,
          website: shop?.website ?? null,
          instagram: shop?.instagram ?? null,
          facebook: shop?.facebook ?? null,
        };

        window.history.replaceState(
          { ...prevState, zahaShop: shopPayload }, // 👈 key used in ShopPage
          ""
        );
      } catch {
        // ignore, just fall through to router.push
      }
    }

    router.push(`/shop/${p.shop_id}`);
  }, [router, p?.shop_id, p, shop]);

  //est shipping
  const shipping = p?.item_details?.shipping ?? null;

  const estMin =
    shipping?.estimate_days_min != null
      ? Number(shipping.estimate_days_min)
      : null;

  const estMax =
    shipping?.estimate_days_max != null
      ? Number(shipping.estimate_days_max)
      : null;

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
  function handleBack() {
    if (canGoBack) router.back();
    else router.push("/home");
  }

  if (loading) return <VisibleAreaSkeleton />;
  if (err) return <main className="p-4">Error: {err}</main>;
  if (!p) return <main className="p-4">Not found.</main>;

  const promoOff =
    promoActive && currentTotal > 0
      ? Math.round(
          ((currentTotal - (promoTotal as number)) / currentTotal) * 100
        )
      : 0;

  return (
    <>
      <main className="pb-10 bg-neutral-50 min-h-screen">
        {/* Floating overlays */}
        <div className="fixed z-10 top-3 left-3 flex items-center gap-2 p-2">
          <button
            onClick={handleBack}
            className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
        <div className="fixed z-10 top-3 right-3 flex items-center gap-2 p-2">
          <button
            onClick={async () => {
              const url = window.location.href;
              const title = p?.title ?? "Zaha";
              try {
                if (navigator.share) await navigator.share({ title, url });
                else {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                }
              } catch {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard");
                } catch {}
              }
            }}
            className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center"
          >
            <Share2 size={16} />
          </button>
          <button className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center">
            <FavButton
              productId={p.id}
              shopOwner={shop?.owner ?? p?.shop_owner ?? null}
            />
          </button>
          {isOwner && (
            <Link
              href={`/seller/edit/${p.id}`}
              className="h-9 w-9 rounded-full bg-white text-black grid place-items-center"
              aria-label="Edit product"
              title="Edit product"
            >
              <Pencil size={16} />
            </Link>
          )}
        </div>

        {/* Sticky top title bar */}
        <div
          className={`fixed top-0 inset-x-0 z-50 border-b border-neutral-200 backdrop-blur-md bg-white/90 transition-all duration-300 ease-out transform ${
            showStickyTop
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="h-8 w-8 shrink-0 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-md font-semibold truncate">{p.title}</div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="font-normal">
                    {promoActive
                      ? `MAD ${(promoTotal as number).toLocaleString("en-US")}`
                      : `MAD ${currentTotal.toLocaleString("en-US")}`}
                  </div>
                  {promoActive && (
                    <div className="line-through text-neutral-400 text-xs">
                      MAD {currentTotal.toLocaleString("en-US")}
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const url = window.location.href;
                    const title = p?.title ?? "Zaha";
                    try {
                      if (navigator.share)
                        await navigator.share({ title, url });
                      else {
                        await navigator.clipboard.writeText(url);
                        toast.success("Link copied to clipboard");
                      }
                    } catch {
                      try {
                        await navigator.clipboard.writeText(url);
                        toast.success("Link copied to clipboard");
                      } catch {}
                    }
                  }}
                  className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
                  aria-label="Share"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
                  aria-label="Save"
                  title="Save"
                >
                  <FavButton
                    productId={p.id}
                    shopOwner={shop?.owner ?? p?.shop_owner ?? null}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel */}
        <ProductCarousel
          media={media}
          title={p?.title ?? ""}
          onOpen={(i) => {
            if (media[i]?.type === "image") {
              setStartIndex(i);
              setFsOpen(true);
            }
          }}
        />

        {/* Title + meta */}
        <div className="px-4 pt-2   space-y-4">
          <section className="-space-y-1 mt-4">
            {/* Top helper line */}
            <div className="text-sm text-emerald-800 font-medium">
              {promoActive ? (
                <>
                  {promoOff}% off sale until {formatEndsShort(p.promo_ends_at)}
                </>
              ) : showPriceRange ? (
                <>From MAD {minTotal.toLocaleString("en-US")}+</>
              ) : null}
            </div>

            {/* Main price */}
            {promoActive ? (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-xl font-bold text-emerald-800">
                  MAD {(promoTotal as number).toLocaleString("en-US")}
                </div>
                <div className="line-through text-neutral-400">
                  MAD {currentTotal.toLocaleString("en-US")}
                </div>
              </div>
            ) : showPriceRange ? (
              <div className="mt-1 text-xl font-bold">
                MAD {minTotal.toLocaleString("en-US")} – MAD{" "}
                {maxTotal.toLocaleString("en-US")}
              </div>
            ) : (
              // ✅ Regular price (no promo, no range)
              <div className="mt-1 text-xl font-bold">
                MAD {currentTotal.toLocaleString("en-US")}
              </div>
            )}
          </section>

          <section className="-space-y-1">
            <h1 className="text-lg font-semibold leading-snug">{p.title}</h1>
            <TagList items={keywordArray(p.keywords)} />

            {/* Primary breadcrumb */}
            {!catLoading && catLinks.length > 0 && (
              <div className="mt-1 text-sm text-neutral-600">
                In{" "}
                {(() => {
                  const primary =
                    catLinks.find((c) => c.is_primary) ?? catLinks[0];
                  const segs = primary.path.split("/").filter(Boolean);
                  return (
                    <span className="wrap-break-word">
                      {segs.map((seg, i) => {
                        const href = `/c/${segs.slice(0, i + 1).join("/")}`;
                        const label = seg
                          .replace(/-/g, " ")
                          .toLowerCase()
                          .replace(/\b\w/g, (c) => c.toUpperCase());
                        return (
                          <span key={href}>
                            <Link
                              href={href}
                              className="underline hover:text-black"
                            >
                              {label}
                            </Link>
                            {i < segs.length - 1 && " / "}
                          </span>
                        );
                      })}
                    </span>
                  );
                })()}
              </div>
            )}

            <div className="text-sm text-neutral-600 mt-2">
              By{" "}
              {p.shop_id ? (
                shop ? (
                  <button
                    type="button"
                    onClick={handleOpenShop}
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    <span className="font-semibold">{shop.title}</span>
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-2 align-middle">
                    <Skeleton className="h-4 w-24 rounded-full" />
                  </span>
                )
              ) : (
                <span className="font-medium">
                  {p.shop_title || "a Moroccan maker"}
                </span>
              )}
            </div>
          </section>

          {p.subtitle ? (
            <div className="text-xs text-neutral-500">{p.subtitle}</div>
          ) : null}

          {(!p.active || p.deleted_at) && availability !== "unavailable" ? (
            <div className="text-[11px] rounded-full px-2 py-1 bg-neutral-200 text-neutral-700 w-max">
              removed from seller’s store
            </div>
          ) : null}

          {availability === "loading" && (
            <div className="text-[11px] rounded-full px-2 py-1 bg-neutral-200 text-neutral-600 w-max">
              Checking availability…
            </div>
          )}

          {availability === "unavailable" && (
            <div className="text-[11px] rounded-full px-2 py-1 bg-amber-100 text-amber-800 w-max">
              temporarily unavailable
            </div>
          )}

          {/* Stat pills */}
          <div className="mt-6 flex items-stretch gap-2">
            <StatPill
              label="Est. Delivery"
              value={(() => {
                if (estMin == null && estMax == null) return "—";

                const today = new Date();
                const addDays = (base: Date, days: number) =>
                  new Date(
                    base.getFullYear(),
                    base.getMonth(),
                    base.getDate() + days
                  );

                const minDate = estMin != null ? addDays(today, estMin) : null;
                const maxDate =
                  estMax != null ? addDays(today, estMax) : minDate;

                const fmt = (d: Date | null) =>
                  d
                    ? d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "";

                if (
                  minDate &&
                  maxDate &&
                  minDate.getTime() !== maxDate.getTime()
                ) {
                  return `${fmt(minDate)}–${fmt(maxDate)}`; // e.g. "Dec 3–7"
                }

                return fmt(maxDate || minDate);
              })()}
            />

            <StatPill
              label="Ratings"
              value={
                <span className="inline-flex items-center gap-1">
                  {(ratingAvg ?? 0).toFixed(1)}
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                </span>
              }
            />
            <StatPill
              label="Orders"
              value={
                p.orders_count != null
                  ? p.orders_count >= 10000
                    ? `${Math.round(p.orders_count / 1000)}k+`
                    : `${p.orders_count.toLocaleString("en-US")}+`
                  : "—"
              }
            />
          </div>

          {p?.free_shipping && (
            <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs">
              Free shipping
            </div>
          )}
        </div>

        {/* Options */}
        {optionGroups.map((g) => {
          const valueId = selected[g.id] ?? "";
          return (
            <Section key={g.id} title={g.name}>
              <OptionGroupField
                group={g}
                valueId={selected[g.id]}
                onChange={(id) =>
                  setSelected((s) => ({
                    ...s,
                    [g.id]: id,
                  }))
                }
              />
            </Section>
          );
        })}

        {/* Personalization */}
        {personalizationConfig.enabled && (
          <Section title="Personalization">
            {personalization.trim() ? (
              <div className="rounded-xl border bg-white">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <div className="font-medium text-sm">
                    Your personalization
                  </div>
                  <button
                    type="button"
                    onClick={() => setPersonalizationOpen(true)}
                    className="text-sm inline-flex items-center gap-1 underline"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                </div>
                <div className="px-3 py-3 text-sm">
                  <div className="text-neutral-500 mb-1">Personalization</div>
                  <div className="wrap-break-word">{personalization}</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPersonalizationOpen(true)}
                className="inline-flex items-center gap-2 text-md font-semibold text-amber-800 pb-4"
              >
                <Plus className="h-4 w-4" />
                Add personalization{" "}
                <span className="text-neutral-500 font-normal">(optional)</span>
              </button>
            )}
          </Section>
        )}

        {/* Quantity & CTAs (or owner edit) */}
        {!isOwner ? (
          <Section title="Select quantity">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-full border bg-white">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-lg"
                  aria-label="Decrease"
                >
                  −
                </button>
                <div className="min-w-9 text-center">{qty}</div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-1.5 text-lg"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-3" ref={mainCtaRef}>
              {inCart ? (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/cart"
                    className="rounded-full border bg-white px-4 py-3 text-center font-medium"
                  >
                    View in your cart
                  </Link>
                  <button
                    onClick={async () => {
                      if (isOwner)
                        return toast.error(
                          "You can’t add your own item to your cart."
                        );
                      const res = await addToCart({
                        productId: p.id,
                        qty,
                        options: selectionsToOptionsObject(),
                        personalization: personalization.trim() || null,
                        mode: "new",
                      });
                      if (res.ok) {
                        window.dispatchEvent(new CustomEvent("cart:changed"));
                        toast.success("Added as a new item 🛒");
                      } else {
                        toast.error("Failed to add to cart", {
                          description: res.message,
                        });
                      }
                    }}
                    disabled={
                      availability !== "available" || isInactive || isRemoved
                    }
                    className="rounded-full bg-[#371837] text-white px-4 py-3 font-medium disabled:opacity-60"
                  >
                    Add new item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={async () => {
                      if (isOwner)
                        return toast.error(
                          "You can’t add your own item to your cart."
                        );
                      const res = await addToCart({
                        productId: p.id,
                        qty,
                        options: selectionsToOptionsObject(),
                        personalization: personalization.trim() || null,
                        mode: "merge",
                      });
                      if (res.ok) {
                        window.dispatchEvent(new CustomEvent("cart:changed"));
                        setInCart(true);
                        toast.success("Added to cart 🛒");
                      } else {
                        toast.error("Failed to add to cart", {
                          description: res.message,
                        });
                      }
                    }}
                    disabled={
                      availability !== "available" || isInactive || isRemoved
                    }
                    className="rounded-full bg-[#371837] text-white px-4 py-3 font-medium disabled:opacity-60"
                  >
                    Add to cart
                  </button>
                  <button
                    onClick={() => {
                      if (
                        isOwner ||
                        availability !== "available" ||
                        isInactive ||
                        isRemoved
                      )
                        return;
                      const variant = selectionsToLabel();
                      const total = promoActive ? promoTotal : currentTotal;
                      const params = new URLSearchParams();
                      params.set("qty", String(qty));
                      if (variant) params.set("variant", variant);
                      if (total) params.set("total", String(total));
                      if (
                        personalizationConfig.enabled &&
                        personalization.trim()
                      )
                        params.set("personalization", personalization.trim());
                      router.push(`/checkout/${p.id}?${params.toString()}`);
                    }}
                    disabled={
                      availability !== "available" || isInactive || isRemoved
                    }
                    className="rounded-full border-black border-2 px-4 py-3 font-semibold disabled:opacity-60"
                  >
                    Buy it now
                  </button>
                </div>
              )}
            </div>
          </Section>
        ) : (
          <div className="px-4 py-4">
            <Link
              href={`/seller/edit/${p.id}`}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#371837] text-white px-4 py-3 w-full font-medium"
            >
              <Pencil size={16} />
              Edit this product
            </Link>
            <p className="text-sm text-gray-500 mx-auto w-full text-center mt-2">
              You are the owner of this product
            </p>
          </div>
        )}

        {/* Reviews */}
        <Section title="Reviews" collapsible defaultOpen>
          {/* <div className="rounded-2xl bg-neutral-100 p-3 border">
          
            <div className="flex items-center">
              <div className="text-2xl font-semibold">
                {ratingAvg ? Number(ratingAvg).toFixed(2) : "—"}
              </div>
              <Star className="ml-1 h-4 w-4 fill-current text-amber-500" />

              <button
                onClick={() => {
                  const el = document.getElementById("reviews-strip");
                  if (el)
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="ml-auto inline-flex items-center rounded-full border px-3 py-1 text-sm hover:bg-white"
              >
                View all reviews
              </button>
            </div>
 
            <div className="mt-1 text-sm text-neutral-500">
              {ratingCount >= 1000
                ? `${Math.floor(ratingCount / 100) / 10}k`
                : String(ratingCount)}{" "}
              ratings
            </div>

   
            {Array.isArray(p.reviews_preview) &&
              p.reviews_preview.length > 0 && (
                <div className="mt-3 flex flex-col gap-3">
                  {p.reviews_preview.slice(0, 3).map((r: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl bg-white p-3 border"
                    >
                    
                      <div className="h-9 w-9 rounded-full bg-neutral-200 overflow-hidden shrink-0">
                        {r.avatar_url ? (
                          <img
                            src={r.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>

                 
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 text-[13px] text-amber-600">
                          {Array.from({ length: r.rating }).map((_, idx) => (
                            <Star
                              key={idx}
                              className="h-3.5 w-3.5 fill-current text-amber-600"
                            />
                          ))}
                        </div>

                        <div className="text-sm font-medium text-neutral-900 mt-1">
                          {r.username || "Anonymous"}
                        </div>

                        <div className="text-sm text-neutral-600 mt-1 line-clamp-2">
                          {r.comment}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div> */}

          <div id="reviews-strip" className="mt-3">
            <ProductReviewsStrip
              productId={p.id}
              shopId={p.shop_id ?? shop?.id}
            />
          </div>
        </Section>

        {/* Description */}
        <Section title="Description" collapsible defaultOpen>
          <div>
            <p className="whitespace-pre-wrap">
              {p.description ??
                "Handmade with care. Minimalist aesthetic and durable build. Perfect for modern homes."}
            </p>
            {Array.isArray(optionGroups) && optionGroups.length > 0 && (
              <>
                <div className="font-semibold mt-4 mb-1">Available options</div>
                <ul className="list-disc ml-5 text-[15px]">
                  {optionGroups.map((g) => (
                    <li key={g.id}>
                      <span className="font-medium">{g.name}:</span>{" "}
                      {g.values.map((v) => v.label).join(", ")}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </Section>

        {/* Item details */}
        <Section title="Item Details" collapsible defaultOpen>
          <ul className="space-y-3">
            <DetailRow
              icon={<Store className="h-4 w-4 text-neutral-500" />}
              label="Designed by"
              value={shop?.title ?? p.shop_title ?? "Independent artisan"}
            />
            <DetailRow
              icon={
                p?.item_details?.type === "digital" ? (
                  <FileDown className="h-4 w-4 text-neutral-500" />
                ) : (
                  <Package className="h-4 w-4 text-neutral-500" />
                )
              }
              label="Item type"
              value={
                p?.item_details?.type === "digital"
                  ? "Instant Digital Download"
                  : "Physical item"
              }
            />
            {(p?.item_details?.width_cm || p?.item_details?.height_cm) && (
              <DetailRow
                icon={<Ruler className="h-4 w-4 text-neutral-500" />}
                label="Dimensions"
                value={
                  <>
                    {p?.item_details?.width_cm
                      ? `${p.item_details.width_cm} cm`
                      : "—"}{" "}
                    ×{" "}
                    {p?.item_details?.height_cm
                      ? `${p.item_details.height_cm} cm`
                      : "—"}
                  </>
                }
              />
            )}
            {p?.item_details?.weight_kg && (
              <DetailRow
                icon={<Scale className="h-4 w-4 text-neutral-500" />}
                label="Weight"
                value={`${p.item_details.weight_kg} kg`}
              />
            )}
            {(p?.personalization_enabled ||
              p?.item_details?.personalizable) && (
              <DetailRow
                icon={<Edit3 className="h-4 w-4 text-neutral-500" />}
                label="Personalizable"
                value="Yes"
              />
            )}
            {Array.isArray(p?.item_details?.materials) &&
              p.item_details.materials.length > 0 && (
                <DetailRow
                  icon={<Layers className="h-4 w-4 text-neutral-500" />}
                  label="Materials"
                  value={p.item_details.materials.join(", ")}
                />
              )}
          </ul>
        </Section>

        {/* Shipping & Policies */}
        <Section title="Shipping & Policies" collapsible defaultOpen={false}>
          <ul className="space-y-3">
            {p?.city && (
              <DetailRow
                icon={<MapPin className="h-4 w-4 text-neutral-500" />}
                label="Ships from"
                value={p.city}
              />
            )}
            {p?.item_details?.ships_to?.length ? (
              <DetailRow
                icon={<Truck className="h-4 w-4 text-neutral-500" />}
                label="Ships to"
                value={p.item_details.ships_to.join(", ")}
              />
            ) : null}
            {p?.shipping_mode === "free" && (
              <DetailRow
                icon={<Package className="h-4 w-4 text-neutral-500" />}
                label="Shipping"
                value="Free"
              />
            )}
            {(estMin != null || estMax != null) && (
              <li className="flex items-start gap-3">
                <span className="mt-0.5">
                  <Truck className="h-4 w-4 text-neutral-500" />
                </span>
                <div className="text-[15px] leading-relaxed">
                  <span className="font-medium">Estimated delivery: </span>
                  <span className="text-neutral-700">
                    {estMin != null && estMax != null
                      ? `${estMin}–${estMax} days`
                      : estMin != null
                        ? `${estMin} days`
                        : `${estMax} days`}
                  </span>
                </div>
              </li>
            )}

            {p?.item_details?.returns && (
              <DetailRow
                icon={<Undo2 className="h-4 w-4 text-neutral-500" />}
                label="Returns & exchanges"
                value={
                  p.item_details.returns === "accepted"
                    ? "Accepted"
                    : "Not accepted"
                }
              />
            )}
          </ul>
        </Section>

        {/* More from this shop */}
        {!!moreFromShop.length && shop?.id && (
          <section className="px-4 py-4 pt-12">
            <h3 className="text-lg font-semibold mb-3">More from this shop</h3>
            <div className="rounded-2xl bg-white py-5 overflow-hidden border border-neutral-200">
              <div className="flex gap-3 justify-between items-start px-5">
                <div className="h-18 w-18 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
                  {shop?.avatar_url ? (
                    <img
                      src={shop.avatar_url}
                      alt={shop?.title ?? "Shop"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleOpenShop}
                  className="ml-auto inline-flex items-center rounded-full border px-3 py-1 text-sm hover:bg-white"
                >
                  View the shop
                </button>
              </div>

              <div className="min-w-0 grow my-3 mb-6 px-5">
                <div className="flex items-center gap-1">
                  <div className="font-semibold truncate text-lg">
                    {shop?.title ?? "Shop"}
                  </div>
                </div>
                <div className="text-xs text-neutral-500">
                  {shop?.city ?? ""} <span className="mx-1"> | </span>
                  {shop?.created_at
                    ? `On Zaha since ${new Date(shop.created_at).getFullYear()}`
                    : "On Zaha"}
                </div>
              </div>

              <div className="mt-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-3 px-5">
                  {[...moreFromShop]
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 4)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="min-w-[60%] xs:min-w-[60%] sm:min-w-[30%]"
                      >
                        <ProductCard p={item} fromshop />
                      </div>
                    ))}

                  <button
                    type="button"
                    onClick={handleOpenShop}
                    className="min-w-[60%] xs:min-w-[60%] sm:min-w-[48%] flex flex-col items-center justify-center rounded-2xl bg-white py-6"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full border  border-neutral-300 grid place-items-center">
                        <ArrowRight className="h-5 w-5 stroke-[2.5]" />
                      </div>

                      <span className="text-sm font-medium text-neutral-700">
                        See more
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Similar items */}
        {!!similar.length && (
          <Section title="Compare similar items">
            <div className="grid grid-cols-2 gap-3">
              {similar.map((x) => (
                <div key={x.id} className="min-w-0">
                  <ProductCard p={x} variant="carousel" />
                </div>
              ))}
            </div>
          </Section>
        )}

        <div className="h-10" />

        {/* Sticky add-to-cart (hidden for owner) */}
        {!isOwner && (
          <div
            className={`fixed inset-x-0 z-50 transform transition-all duration-300 ease-out ${
              showStickyAdd
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-6 pointer-events-none"
            }`}
            style={{ bottom: "calc(env(safe-area-inset-bottom) + 54px)" }}
          >
            <div className="max-w-screen-sm mx-auto bg-white/90 backdrop-blur-sm border-t border-neutral-200 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
              <button
                onClick={async () => {
                  if (isOwner)
                    return toast.error(
                      "You can’t add your own item to your cart."
                    );
                  const res = await addToCart({
                    productId: p.id,
                    qty,
                    options: selectionsToOptionsObject(),
                    personalization: personalization.trim() || null,
                    mode: "merge",
                  });
                  if (res.ok) {
                    window.dispatchEvent(new CustomEvent("cart:changed"));
                    setInCart(true);
                    toast.success("Added to cart 🛒");
                  } else {
                    toast.error("Failed to add to cart", {
                      description: res.message,
                    });
                  }
                }}
                disabled={
                  availability !== "available" || isInactive || isRemoved
                }
                className="w-full rounded-full bg-[#371837] text-white px-4 py-3 font-medium shadow-md disabled:opacity-60"
              >
                {availability === "loading"
                  ? "Checking availability…"
                  : isUnavailable || isInactive || isRemoved
                    ? "Unavailable"
                    : "Add to cart"}
              </button>
            </div>
          </div>
        )}

        {/* Description sheet */}
        <Sheet open={descOpen} onOpenChange={setDescOpen}>
          <SheetContent side="bottom" className="p-0">
            <div className="p-4">
              <SheetHeader className="mb-2">
                <SheetTitle>Description</SheetTitle>
                <SheetDescription />
              </SheetHeader>
              <div className="space-y-3 text-[15px]">
                <p className="whitespace-pre-wrap">
                  {p.description ??
                    "Handmade with care. Minimalist aesthetic and durable build. Perfect for modern homes."}
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Personalization sheet */}
        {personalizationConfig.enabled && (
          <Sheet
            open={personalizationOpen}
            onOpenChange={setPersonalizationOpen}
          >
            <SheetContent side="bottom" className="p-0">
              <div className="p-4 space-y-3 text-[15px]">
                <SheetHeader className="mb-1">
                  <SheetTitle>Add personalization</SheetTitle>
                  <SheetDescription />
                </SheetHeader>

                {Array.isArray(p?.photos) && p.photos.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {p.photos.slice(0, 4).map((src: string, i: number) => (
                      <div
                        key={i}
                        className="h-16 w-16 rounded-md overflow-hidden bg-neutral-100 shrink-0"
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {personalizationConfig.instructions && (
                  <div className="rounded-md bg-neutral-100 p-3 text-[13px] leading-relaxed">
                    <div className="font-medium mb-1">Personalization</div>
                    <div className="whitespace-pre-wrap">
                      {personalizationConfig.instructions}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <textarea
                    value={personalization}
                    onChange={(e) =>
                      setPersonalization(
                        e.target.value.slice(0, personalizationConfig.maxChars)
                      )
                    }
                    className="w-full min-h-[120px] rounded-lg border px-3 py-2 outline-none"
                    placeholder="Type your personalization here…"
                    maxLength={personalizationConfig.maxChars}
                  />
                  <div className="text-right text-xs text-neutral-500">
                    {personalization.length}/{personalizationConfig.maxChars}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPersonalizationOpen(false)}
                  className="w-full rounded-full bg-black text-white px-4 py-3 font-medium"
                >
                  Finish personalization
                </button>
              </div>
            </SheetContent>
          </Sheet>
        )}

        {/* Fullscreen images */}
        <Dialog open={fsOpen} onOpenChange={setFsOpen}>
          <DialogContent className="p-0 border-0 max-w-none w-screen h-screen">
            <div className="fixed inset-0 bg-black/95" />
            <button
              onClick={() => setFsOpen(false)}
              aria-label="Close fullscreen"
              className="fixed top-3 right-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            {Array.isArray(p?.photos) && p.photos.length > 1 && (
              <>
                <button
                  onClick={fsPrev}
                  aria-label="Previous image"
                  className="fixed left-3 top-1/2 -translate-y-1/2 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <button
                  onClick={fsNext}
                  aria-label="Next image"
                  className="fixed right-3 top-1/2 -translate-y-1/2 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <div className="fixed inset-0 z-40 overflow-hidden" ref={fsRef}>
              <div className="flex h-full">
                {(Array.isArray(p?.photos) && p.photos.length
                  ? p.photos
                  : [undefined]
                ).map((src: string | undefined, i: number) => (
                  <div
                    key={"fs-" + i}
                    className="relative shrink-0 grow-0 basis-full h-full"
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={`Product image ${i + 1}`}
                        className="h-full w-full object-contain select-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-neutral-400">
                        No image
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}

/* Tailwind helpers:
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
