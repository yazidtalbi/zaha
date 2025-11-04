// app/product/[id]/page.tsx
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

/* —————————————————————————————————————————————
   Types
————————————————————————————————————————————— */
type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

/* —————————————————————————————————————————————
   Utilities / atoms
————————————————————————————————————————————— */
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

function Section({
  title,
  children,
  right,
  collapsible = false,
  defaultOpen = false, // 👈 new
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  collapsible?: boolean;
  /** when collapsible, should it start open? (default false = hidden) */
  defaultOpen?: boolean;
}) {
  const panelId = useId();

  // If collapsible → start from defaultOpen, else always open
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);

  // Keep state in sync if props change
  useEffect(() => {
    setOpen(collapsible ? defaultOpen : true);
  }, [collapsible, defaultOpen]);

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>

        <div className="flex items-center gap-2">
          {right}
          {collapsible && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="p-1 text-neutral-600 hover:text-neutral-900 transition"
              aria-expanded={open}
              aria-controls={panelId}
            >
              {open ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
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

function keywordArray(s?: string | null) {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}
function TagList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-1 flex flex-wrap text-sm text-neutral-500">
      {items.map((tag, i) => (
        <span key={tag} className="flex items-center">
          {tag}
          {/* <Link
            href={`/search?q=${encodeURIComponent(tag)}`}
            className="hover:underline hover:text-black transition-colors"
          >
            {tag}
          </Link> */}
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

/* —————————————————————————————————————————————
   Scoped components for this page
————————————————————————————————————————————— */

/** 1) ProductCarousel — framed, slightly taller, translucent dot rail */
function ProductCarousel({
  images,
  title,
  onOpen,
}: {
  images: string[];
  title: string;
  onOpen: (i: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIdx(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  return (
    <div className="px-4 pt-4">
      <div className="relative rounded-2xl bg-white   ">
        <div ref={emblaRef} className="overflow-hidden rounded-xl">
          <div className="flex">
            {(images.length ? images : [undefined]).map((src, i) => (
              <button
                key={i}
                className="min-w-0 flex-[0_0_100%] aspect-[7/8] sm:aspect-[4/3] bg-neutral-100"
                onClick={() => (src ? onOpen(i) : undefined)}
                aria-label={src ? `Open image ${i + 1} fullscreen` : "No image"}
              >
                {src ? (
                  <img
                    src={src}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-neutral-500">
                    No image
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dots with semi-transparent black background */}
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center">
            <div className="rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === idx ? "bg-white" : "bg-white/50"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 2) ReviewsHeader — big number + star + “View all reviews” pill */
function ReviewsHeader({
  avg,
  count,
  onViewAll,
}: {
  avg: number | null;
  count: number;
  onViewAll: () => void;
}) {
  const display = avg ? Number(avg).toFixed(2) : "—";
  const compact =
    count >= 1000 ? `${Math.floor(count / 100) / 10}k` : String(count);

  return (
    <div className="rounded-2xl bg-neutral-100 p-3 border">
      <div className="flex items-center">
        <div className="text-2xl font-semibold">{display}</div>
        <Star className="ml-1 h-4 w-4 fill-current text-amber-500" />
        <button
          onClick={onViewAll}
          className="ml-auto inline-flex items-center rounded-full border px-3 py-1 text-sm hover:bg-white"
        >
          View all reviews
        </button>
      </div>
      <div className="mt-1 text-sm text-neutral-500">{compact} ratings</div>
    </div>
  );
}

function prettify(s: string) {
  return s
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 3) ShopMoreSection — header card + horizontal ProductCard slider */
function ShopMoreSection({ shop, products }: { shop: any; products: any[] }) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
  });

  const since = shop?.created_at
    ? new Date(shop.created_at).getFullYear()
    : undefined;

  return (
    <section className="px-4 py-4 pt-12">
      <h3 className="text-lg font-semibold mb-3">More from this shop</h3>
      <div className="rounded-2xl bg-white p-5   overflow-hidden   border border-neutral-200 ">
        {/* header bar */}
        <div className="flex  gap-3 justify-between items-start">
          <div className="h-18 w-18 rounded-lg overflow-hidden bg-neutral-200 shrink-0">
            {shop?.avatar_url ? (
              <img
                src={shop.avatar_url}
                alt={shop?.title ?? "Shop"}
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>

          <Link
            href={`/shop/${shop?.id ?? ""}`}
            className="rounded-full border-2 border-black px-4 py-1 text-sm   font-semibold"
          >
            View the shop
          </Link>
        </div>

        <div className="min-w-0 grow my-3 mb-6">
          <div className="flex items-center gap-1">
            <div className="font-semibold truncate text-lg">
              {shop?.title ?? "Shop"}
            </div>
          </div>
          <div className="text-xs text-neutral-500">
            {since ? `On Zaha since ${since}` : "On Zaha"}{" "}
            {shop?.city ? <span className="mx-1">|</span> : null}
            {shop?.city ?? ""}
          </div>
        </div>

        {/* slider of products using ProductCard */}
        <div className="mt-4" ref={emblaRef}>
          <div className="flex gap-3">
            {products.map((item) => (
              <div
                key={item.id}
                className="min-w-[60%] xs:min-w-[60%] sm:min-w-[48%]"
              >
                <ProductCard p={item} fromshop />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* —————————————————————————————————————————————
   Page
————————————————————————————————————————————— */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [p, setP] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const shopImg = useMemo(
    () => shop?.avatar_url || shop?.photo || shop?.cover || null,
    [shop]
  );

  // Auth / owner detection
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
    return (
      (p?.shop_owner && p.shop_owner === uid) ||
      (shop?.owner && shop.owner === uid)
    );
  }, [uid, p?.shop_owner, shop?.owner]);

  // category
  const [categoryPath, setCategoryPath] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!p) return;
    remember(p);
    (async () => {
      // Similar by category subtree if we have it; otherwise fallback
      if (categoryPath) {
        const { data } = await supabase
          .from("products")
          .select(
            `
          *,
          product_categories!inner(category_id),
          cat:product_categories!inner(category_id) (
            path
          )
        `
          )
          .like("cat.path", `${categoryPath}%`)
          .neq("id", p.id)
          .eq("active", true)
          .eq("unavailable", false)
          .limit(12);

        setSimilar((data as any[]) ?? []);
      } else {
        // Fallback (no category yet): keep your old heuristic
        let q = supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("unavailable", false)
          .neq("id", p.id)
          .limit(8);
        if (p.city) q = q.ilike("city", p.city);
        const sim = await q;
        setSimilar((sim.data as any[]) ?? []);
      }

      // more from shop (unchanged)
      if (p.shop_id) {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("unavailable", false)
          .eq("shop_id", p.shop_id)
          .neq("id", p.id)
          .limit(10);
        setMoreFromShop((data as any[]) ?? []);
      }
    })();
  }, [p, categoryPath]);

  // pick deepest primary (fallback: deepest linked)
  useEffect(() => {
    if (!p?.id) return;
    (async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("is_primary, categories!inner(id, path, name_en, slug, depth)")
        .eq("product_id", p.id);

      if (error || !data?.length) {
        setCategoryPath(null);
        setCategoryId(null);
        return;
      }

      // prefer primary, otherwise deepest by depth (or path length)
      const rows = data as any[];
      const primary =
        rows.find((r) => r.is_primary) ??
        rows
          .sort((a, b) => (a.categories.depth ?? 0) - (b.categories.depth ?? 0))
          .pop();

      const cat = primary.categories;
      setCategoryPath(cat?.path ?? null); // e.g. "clothing/womens-clothing"
      setCategoryId(cat?.id ?? null);
    })();
  }, [p?.id]);

  // cart state
  const [inCart, setInCart] = useState(false);

  // page load
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // sheets
  const [descOpen, setDescOpen] = useState(false);
  const [personalizationOpen, setPersonalizationOpen] = useState(false);

  const [qty, setQty] = useState(1);

  // options
  const optionGroups: OptionGroup[] = useMemo(
    () =>
      Array.isArray(p?.options_config)
        ? (p.options_config as OptionGroup[])
        : [],
    [p?.options_config]
  );
  const [selected, setSelected] = useState<Record<string, string>>({}); // groupId -> valueId

  // personalization
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

  // Fullscreen gallery
  const [fsOpen, setFsOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const [fsRef, fsApi] = useEmblaCarousel({
    loop: true,
    startIndex,
    speed: 20,
    align: "start",
  });
  const openFullscreenAt = useCallback((i: number) => {
    setStartIndex(i);
    setFsOpen(true);
  }, []);
  useEffect(() => {
    if (!fsApi) return;
    fsApi.scrollTo(startIndex, true);
  }, [fsApi, startIndex]);
  const fsPrev = useCallback(() => fsApi?.scrollPrev(), [fsApi]);
  const fsNext = useCallback(() => fsApi?.scrollNext(), [fsApi]);
  useEffect(() => {
    if (!fsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") fsPrev();
      if (e.key === "ArrowRight") fsNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fsOpen, fsPrev, fsNext]);

  // sticky CTA sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showStickyAdd, setShowStickyAdd] = useState(false);

  // after: const [showStickyAdd, setShowStickyAdd] = useState(false);
  const priceBarRef = useRef<HTMLDivElement | null>(null);
  // ——— Sticky top title bar ———

  const [showStickyTop, setShowStickyTop] = useState(false);
  const mainCtaRef = useRef<HTMLDivElement | null>(null);
  const ctaObserverRef = useRef<IntersectionObserver | null>(null);

  // 1) Top bar scroll (unchanged)
  useEffect(() => {
    function handleScroll() {
      setShowStickyTop(window.scrollY > 600);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2) Bottom CTA observer — reattach when CTA mounts/changes
  useEffect(() => {
    // disconnect any old observer
    if (ctaObserverRef.current) {
      ctaObserverRef.current.disconnect();
      ctaObserverRef.current = null;
    }

    const el = mainCtaRef.current;
    if (!el) {
      // CTA not mounted yet — try again on next render
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting;
        // show sticky when CTA is NOT visible
        setShowStickyAdd(!visible);

        // 🔎 debug in console
        console.log(
          "[CTA observe]",
          {
            visible,
            top: entry.boundingClientRect.top,
            bottom: entry.boundingClientRect.bottom,
          },
          "rootBounds:",
          entry.rootBounds
        );
      },
      {
        threshold: 0,
        rootMargin: "0px 0px -80px 0px", // reveal just before CTA fully leaves
      }
    );

    obs.observe(el);
    ctaObserverRef.current = obs;

    return () => {
      obs.disconnect();
      ctaObserverRef.current = null;
    };
    // Re-run when things that affect the CTA block change/mount
  }, [p?.id, isOwner, inCart]);

  // fetch product
  useEffect(() => {
    const _id = (id ?? "").toString().trim();
    if (!_id) {
      setErr("No product id provided");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          shops:shop_id ( id, title, avatar_url, owner, created_at, city )
        `
        )
        .eq("id", _id)
        .maybeSingle();

      if (error) setErr(error.message);
      else if (!data) setErr("Product not found");
      else {
        setP(data);
        setShop((data as any).shops || null);
      }
      setLoading(false);
    })();
  }, [id]);

  // default option selections
  useEffect(() => {
    if (!optionGroups.length) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const g of optionGroups) {
        if (!next[g.id]) next[g.id] = g.values[0]?.id ?? "";
      }
      return next;
    });
  }, [optionGroups]);

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

  // remember + related
  const [similar, setSimilar] = useState<any[]>([]);
  const [moreFromShop, setMoreFromShop] = useState<any[]>([]);
  useEffect(() => {
    if (!p) return;
    remember(p);
    (async () => {
      let q = supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .eq("unavailable", false)
        .neq("id", p.id)
        .limit(8);
      if (p.city) q = q.ilike("city", p.city);
      const sim = await q;
      setSimilar((sim.data as any[]) ?? []);
      if (p.shop_id) {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("unavailable", false)
          .eq("shop_id", p.shop_id)
          .neq("id", p.id)
          .limit(10);
        setMoreFromShop((data as any[]) ?? []);
      }
    })();
  }, [p]);

  // images
  const images: string[] = useMemo(
    () =>
      (Array.isArray(p?.photos) ? (p.photos as string[]) : []).filter(Boolean),
    [p?.photos]
  );

  // pricing math
  const optionGroupsMemo = optionGroups;
  const basePrice = p?.price_mad ?? 0;
  const [minTotal, maxTotal] = useMemo(() => {
    if (!optionGroupsMemo.length)
      return [basePrice, basePrice] as [number, number];
    const sums = (pick: "min" | "max") =>
      optionGroupsMemo.reduce((acc, g) => {
        const deltas = g.values.map((v) => Number(v.price_delta_mad ?? 0));
        if (!deltas.length) return acc;
        const part = pick === "min" ? Math.min(...deltas) : Math.max(...deltas);
        return acc + part;
      }, basePrice);
    return [sums("min"), sums("max")] as [number, number];
  }, [basePrice, optionGroupsMemo]);

  const selectedDelta = useMemo(() => {
    let d = 0;
    for (const g of optionGroupsMemo) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      d += Number(v?.price_delta_mad ?? 0);
    }
    return d;
  }, [optionGroupsMemo, selected]);

  const currentTotal = basePrice + selectedDelta;

  const promoActive = isPromoActive(p);
  const promoTotal = promoActive
    ? Math.round(Number(p.promo_price_mad)) + selectedDelta
    : null;

  // availability
  const isUnavailable = Boolean(p?.unavailable);
  const isRemoved = Boolean(p?.deleted_at);
  const isInactive = !Boolean(p?.active);

  useEffect(() => {
    // sticky top bar
    function handleScroll() {
      const y = window.scrollY;
      setShowStickyTop(y > 600);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    // sticky add-to-cart bar
    const ctaEl = mainCtaRef.current;
    if (ctaEl) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          // when CTA block goes out of view → show sticky bar
          setShowStickyAdd(!entry.isIntersecting);
        },
        {
          threshold: 0,
          rootMargin: "0px 0px -80px 0px", // trigger slightly before it’s gone
        }
      );
      observer.observe(ctaEl);
      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", handleScroll);
      };
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function selectionsToLabel(): string {
    const parts: string[] = [];
    for (const g of optionGroupsMemo) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      if (v) parts.push(`${g.name}:${v.label}`);
    }
    return parts.join("|");
  }
  function selectionsToOptionsObject(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const g of optionGroupsMemo) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      if (v) out[g.name] = v.label;
    }
    return out;
  }

  async function handleAddToCartMerge() {
    if (isOwner) {
      toast.error("You can’t add your own item to your cart.");
      return;
    }
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
      toast.error("Failed to add to cart", { description: res.message });
    }
  }
  async function handleAddToCartNew() {
    if (isOwner) {
      toast.error("You can’t add your own item to your cart.");
      return;
    }
    const res = await addToCart({
      productId: p.id,
      qty,
      options: selectionsToOptionsObject(),
      personalization: personalization.trim() || null,
      mode: "new",
    });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent("cart:changed"));
      setInCart(true);
      toast.success("Added as a new item 🛒");
    } else {
      toast.error("Failed to add to cart", { description: res.message });
    }
  }
  function handleBuyNow() {
    if (isOwner) return;
    if (isUnavailable || isInactive || isRemoved) return;
    const variant = selectionsToLabel();
    const total = promoActive ? promoTotal : currentTotal;
    const params = new URLSearchParams();
    params.set("qty", String(qty));
    if (variant) params.set("variant", variant);
    if (total) params.set("total", String(total));
    if (personalizationConfig.enabled && personalization.trim())
      params.set("personalization", personalization.trim());
    router.push(`/checkout/${p.id}?${params.toString()}`);
  }

  // ratings aggregate for header
  const [ratingAvg, setRatingAvg] = useState<number | null>(null);
  const [ratingCount, setRatingCount] = useState<number>(0);
  useEffect(() => {
    if (!p?.id) return;
    (async () => {
      const { data, count } = await supabase
        .from("reviews")
        .select("avg:rating.avg()", { count: "exact", head: false })
        .eq("product_id", p.id)
        .single();
      setRatingAvg((data as any)?.avg ?? null);
      setRatingCount(count ?? 0);
    })();
  }, [p?.id]);

  // delivery ETA (for stat pill)
  const details = useMemo(() => {
    const d = (p?.item_details ?? {}) as any;
    return {
      type: d.type === "digital" ? "digital" : "physical",
      width_cm: Number(d.width_cm ?? 0) || null,
      height_cm: Number(d.height_cm ?? 0) || null,
      weight_kg: Number(d.weight_kg ?? 0) || null,
      personalizable: Boolean(d.personalizable ?? p?.personalization_enabled),
      ships_from: (d.ships_from ?? p?.city ?? null) as string | null,
      ships_to: Array.isArray(d.ships_to) ? d.ships_to.filter(Boolean) : [],
      materials: Array.isArray(d.materials) ? d.materials.filter(Boolean) : [],
      returns:
        d.returns === "accepted" || d.returns === "not_accepted"
          ? d.returns
          : null,
      shipping: d.shipping ?? null,
    };
  }, [p?.item_details, p?.personalization_enabled, p?.city]);

  const etaTitle = useMemo(() => {
    const maxDays =
      details.shipping?.estimate_days_max ??
      details.shipping?.estimate_days_min ??
      null;
    if (!maxDays || maxDays < 0) return null;
    const now = new Date();
    const eta = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + maxDays
    );
    return eta.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [
    details.shipping?.estimate_days_max,
    details.shipping?.estimate_days_min,
  ]);

  if (loading) return <main className="p-4">Loading…</main>;
  if (err) return <main className="p-4">Error: {err}</main>;
  if (!p) return <main className="p-4">Not found.</main>;

  const promoOff =
    promoActive && currentTotal > 0
      ? Math.round(
          ((currentTotal - (promoTotal as number)) / currentTotal) * 100
        )
      : 0;
  const showPriceRange = minTotal !== maxTotal && !promoActive;

  return (
    <>
      {/* overlay nav buttons */}

      <main className="pb-24 bg-neutral-50  min-h-screen">
        <section className="">
          <div className="absolute z-10 top-3 left-3 flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <div className="absolute z-10 top-3 right-3 flex items-center gap-2">
            <button className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center">
              <MessageSquare size={16} />
            </button>
            <button className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center">
              <Share2 size={16} />
            </button>
            <button className="h-9 w-9 rounded-full bg-black/60 text-white grid place-items-center">
              <Heart size={16} />
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
          <div
            className={`fixed top-0 inset-x-0 z-50 border-b border-neutral-200 backdrop-blur-md bg-white/90 transition-all duration-300 ease-out transform ${
              showStickyTop
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            <div className="px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="text-[15px] font-semibold truncate">
                  {p.title}
                </div>
                <button
                  type="button"
                  className="ml-auto h-8 w-8 rounded-full border border-neutral-300 text-neutral-700 grid place-items-center"
                >
                  <Heart className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <div className="font-semibold">
                  {promoActive
                    ? `MAD${(promoTotal as number).toLocaleString("en-US")}`
                    : `MAD${currentTotal.toLocaleString("en-US")}`}
                </div>
                {promoActive && (
                  <div className="line-through text-neutral-400 text-xs">
                    MAD{currentTotal.toLocaleString("en-US")}
                  </div>
                )}
                <div className="ml-2 text-neutral-500 truncate flex-1 text-xs">
                  {keywordArray(p.keywords).slice(0, 3).join(", ")}
                  {keywordArray(p.keywords).length > 3 && "…"}
                </div>
              </div>
            </div>
          </div>

          {/* ——— Carousel ——— */}
          <ProductCarousel
            images={images}
            title={p.title}
            onOpen={(i) => {
              setStartIndex(i);
              setFsOpen(true);
            }}
          />

          {/* ——— Title + meta ——— */}
          <div className="px-4 pt-3 space-y-4">
            {/* sentinel for sticky top bar */}

            <section className="-space-y-1 mt-4">
              {" "}
              <div className="text-sm text-emerald-800 font-medium">
                {promoActive ? (
                  <>
                    {promoOff}% off sale until{" "}
                    {formatEndsShort(p.promo_ends_at)}
                  </>
                ) : (
                  <>From MAD {minTotal.toLocaleString("en-US")}+</>
                )}
              </div>
              {/* price block */}
              {promoActive ? (
                <div className=" flex items-center gap-3 flex-wrap ">
                  <div className="text-xl font-bold text-emerald-800">
                    MAD{(promoTotal as number).toLocaleString("en-US")}
                  </div>
                  <div className="line-through text-neutral-400">
                    MAD{currentTotal.toLocaleString("en-US")}
                  </div>
                </div>
              ) : showPriceRange ? (
                <div className="mt-1 text-xl font-bold">
                  MAD{minTotal.toLocaleString("en-US")} – MAD
                  {maxTotal.toLocaleString("en-US")}
                </div>
              ) : (
                <div className="mt-1 text-xl font-bold">
                  MAD{currentTotal.toLocaleString("en-US")}
                </div>
              )}
            </section>

            <section className="-space-y-1">
              {" "}
              <h1 className="text-lg font-semibold leading-snug">{p.title}</h1>
              <TagList items={keywordArray(p.keywords)} />
              {categoryPath && (
                <div className="mt-1 text-sm text-neutral-600">
                  in{" "}
                  <Link
                    href={`/c/${categoryPath}`}
                    className="underline hover:text-black"
                  >
                    {categoryPath
                      .split("/")
                      .map((s) =>
                        s
                          .replace(/-/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())
                      )
                      .join(" / ")}
                  </Link>
                </div>
              )}
              <div className="text-sm text-neutral-600 mt-2">
                by{" "}
                {p.shop_id ? (
                  <Link
                    href={`/shop/${p.shop_id}`}
                    className="inline-flex items-center gap-2 hover:underline"
                  >
                    {/* {shopImg ? (
                  <span className="inline-block h-4 w-4 rounded-full overflow-hidden bg-neutral-200">
                    <img
                      src={shopImg}
                      alt={shop?.title ?? "Shop"}
                      className="h-full w-full object-cover"
                    />
                  </span>
                ) : null} */}
                    <span className="font-semibold">
                      {shop?.title || "shop"}
                    </span>
                  </Link>
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

            {(isInactive || isRemoved) && !isUnavailable ? (
              <div className="text-[11px] rounded-full px-2 py-1 bg-neutral-200 text-neutral-700 w-max">
                removed from seller’s store
              </div>
            ) : null}
            {isUnavailable && (
              <div className="text-[11px] rounded-full px-2 py-1 bg-amber-100 text-amber-800 w-max">
                temporarily unavailable
              </div>
            )}

            {/* stat pills like screenshot */}
            <div className="mt-6 flex items-stretch gap-2">
              <StatPill label="Est. Delivery" value={etaTitle ?? "—"} />
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

            {/* Free shipping badge */}
            {details.shipping?.mode === "free" && (
              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1 text-xs">
                Free shipping
              </div>
            )}
          </div>

          {/* ——— Options ——— */}
          {optionGroups.map((g) => {
            const valueId = selected[g.id] ?? "";
            return (
              <Section key={g.id} title={g.name}>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <select
                    className="w-full bg-transparent outline-none py-1.5 text-sm"
                    value={valueId}
                    onChange={(e) =>
                      setSelected((s) => ({ ...s, [g.id]: e.target.value }))
                    }
                  >
                    {g.values.map((v) => {
                      const delta = Number(v.price_delta_mad ?? 0);
                      const label =
                        delta === 0
                          ? v.label
                          : `${v.label}  ${
                              delta > 0
                                ? `+ MAD${delta}`
                                : `- MAD${Math.abs(delta)}`
                            }`;
                      return (
                        <option key={v.id} value={v.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </Section>
            );
          })}

          {/* ——— Personalization (inline CTA variant) ——— */}
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
                    <div className="break-words">{personalization}</div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPersonalizationOpen(true)}
                  className="inline-flex items-center gap-2 text-md font-semibold  text-amber-800 pb-4"
                >
                  <Plus className="h-4 w-4" />
                  Add personalization{" "}
                  <span className="text-neutral-500 font-normal">
                    (optional)
                  </span>
                </button>
              )}
            </Section>
          )}
        </section>

        {/* ——— Quantity & CTAs or Owner Edit ——— */}
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
                <div className="min-w-[2.25rem] text-center">{qty}</div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-3 py-1.5 text-lg"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-3 gap-3 grid-cols-2" ref={mainCtaRef}>
              {inCart ? (
                <>
                  <Link
                    href="/cart"
                    className="rounded-full border bg-white px-4 py-3 text-center font-medium"
                  >
                    View in your cart
                  </Link>
                  <button
                    onClick={handleAddToCartNew}
                    disabled={isUnavailable || isInactive || isRemoved}
                    className="rounded-full bg-amber-800 text-white px-4 py-3 font-medium disabled:opacity-60"
                  >
                    Add new item
                  </button>
                </>
              ) : (
                <div className="mt-3   gap-3 grid-cols-2">
                  <button
                    onClick={handleAddToCartMerge}
                    disabled={isUnavailable || isInactive || isRemoved}
                    className="rounded-full bg-amber-800 text-white px-4 py-3 font-medium disabled:opacity-60 w-full"
                  >
                    Add to cart
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={isUnavailable || isInactive || isRemoved}
                    className="rounded-full  ring-black ring-2   px-4 py-3 font-semibold disabled:opacity-60 w-full"
                  >
                    Buy it now
                  </button>
                </div>
              )}
            </div>
          </Section>
        ) : (
          <div className="px-4 pb-4">
            <Link
              href={`/seller/edit/${p.id}`}
              className="  inline-flex items-center justify-center gap-2 rounded-full bg-amber-800 text-white px-4 py-3 w-full font-medium"
            >
              <Pencil size={16} />
              Edit this product
            </Link>
            <p className="text-sm text-gray-500  mx-auto w-full text-center mt-2">
              You are the owner of this product
            </p>
          </div>
        )}

        {/* ——— Reviews ——— */}
        <section className="px-4 "></section>
        <div className=" ">
          <Section title="Reviews" collapsible defaultOpen>
            {" "}
            <div className="mt-3">
              <ProductReviewsStrip
                productId={p.id}
                shopId={p.shop_id ?? shop?.id}
              />
            </div>
          </Section>
          <hr className="  border-neutral-400 mx-4"></hr>
          {/* ——— Description ——— */}
          <Section title="Description" collapsible defaultOpen>
            <div className="">
              <p className="whitespace-pre-wrap">
                {p.description ??
                  "Handmade with care. Minimalist aesthetic and durable build. Perfect for modern homes."}
              </p>

              {/* Optional “Available options” list if exists */}
              {Array.isArray(optionGroups) && optionGroups.length > 0 && (
                <>
                  <div className="font-semibold mt-4 mb-1">
                    Available options
                  </div>
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
          <hr className="  border-neutral-400 mx-4"></hr>
          {/* ——— Item details ——— */}
          <Section title="Item Details" collapsible defaultOpen>
            <ul className="space-y-3">
              <DetailRow
                icon={<Store className="h-4 w-4 text-neutral-500" />}
                label="Designed by"
                value={shop?.title ?? p.shop_title ?? "Independent artisan"}
              />
              <DetailRow
                icon={
                  details.type === "digital" ? (
                    <FileDown className="h-4 w-4 text-neutral-500" />
                  ) : (
                    <Package className="h-4 w-4 text-neutral-500" />
                  )
                }
                label="Item type"
                value={
                  details.type === "digital"
                    ? "Instant Digital Download"
                    : "Physical item"
                }
              />
              {(details.width_cm || details.height_cm) && (
                <DetailRow
                  icon={<Ruler className="h-4 w-4 text-neutral-500" />}
                  label="Dimensions"
                  value={
                    <>
                      {details.width_cm ? `${details.width_cm} cm` : "—"} ×{" "}
                      {details.height_cm ? `${details.height_cm} cm` : "—"}
                    </>
                  }
                />
              )}
              {details.weight_kg && (
                <DetailRow
                  icon={<Scale className="h-4 w-4 text-neutral-500" />}
                  label="Weight"
                  value={`${details.weight_kg} kg`}
                />
              )}
              {details.personalizable && (
                <DetailRow
                  icon={<Edit3 className="h-4 w-4 text-neutral-500" />}
                  label="Personalizable"
                  value="Yes"
                />
              )}
              {details.materials?.length > 0 && (
                <DetailRow
                  icon={<Layers className="h-4 w-4 text-neutral-500" />}
                  label="Materials"
                  value={details.materials.join(", ")}
                />
              )}
            </ul>
          </Section>
          <hr className=" border-neutral-400 mx-4"></hr>
          {/* ——— Shipping & Policies ——— */}
          <Section title="Shipping & Policies" collapsible defaultOpen={false}>
            <ul className="space-y-3 ">
              {details.ships_from && (
                <DetailRow
                  icon={<MapPin className="h-4 w-4 text-neutral-500" />}
                  label="Ships from"
                  value={details.ships_from}
                />
              )}
              {details.ships_to?.length > 0 && (
                <DetailRow
                  icon={<Truck className="h-4 w-4 text-neutral-500" />}
                  label="Ships to"
                  value={details.ships_to.join(", ")}
                />
              )}
              {details.shipping?.mode === "free" ? (
                <DetailRow
                  icon={<Package className="h-4 w-4 text-neutral-500" />}
                  label="Shipping"
                  value={
                    details.shipping.free_over_mad
                      ? `Free (orders over MAD ${details.shipping.free_over_mad})`
                      : "Free"
                  }
                />
              ) : details.shipping?.mode === "fees" ? (
                <DetailRow
                  icon={<Package className="h-4 w-4 text-neutral-500" />}
                  label="Shipping"
                  value={
                    details.shipping.fee_mad != null
                      ? `MAD ${details.shipping.fee_mad}`
                      : "Additional fees"
                  }
                />
              ) : null}
              {(details.shipping?.estimate_days_min ||
                details.shipping?.estimate_days_max) && (
                <li className="flex items-start gap-3">
                  <span className="mt-0.5">
                    <Truck className="h-4 w-4 text-neutral-500" />
                  </span>
                  <div className="text-[15px] leading-relaxed">
                    <span className="font-medium">Estimated delivery: </span>
                    <span className="text-neutral-700">
                      {details.shipping.estimate_days_min &&
                      details.shipping.estimate_days_max
                        ? `${details.shipping.estimate_days_min}–${details.shipping.estimate_days_max} days`
                        : details.shipping.estimate_days_min
                          ? `${details.shipping.estimate_days_min} days`
                          : `${details.shipping.estimate_days_max} days`}
                    </span>
                  </div>
                </li>
              )}
              {(details.shipping?.cod ||
                details.shipping?.pickup ||
                details.shipping?.tracking) && (
                <li className="flex flex-wrap gap-2 pl-8">
                  {details.shipping.cod && (
                    <span className="text-xs px-2 py-1 rounded-full bg-neutral-200">
                      COD
                    </span>
                  )}
                  {details.shipping.pickup && (
                    <span className="text-xs px-2 py-1 rounded-full bg-neutral-200">
                      Pickup
                    </span>
                  )}
                  {details.shipping.tracking && (
                    <span className="text-xs px-2 py-1 rounded-full bg-neutral-200">
                      Tracking
                    </span>
                  )}
                </li>
              )}
              {details.shipping?.notes && (
                <DetailRow
                  icon={<Package className="h-4 w-4 text-neutral-500" />}
                  label="Shipping policy"
                  value={details.shipping.notes}
                />
              )}
              {details.returns && (
                <DetailRow
                  icon={<Undo2 className="h-4 w-4 text-neutral-500" />}
                  label="Returns & exchanges"
                  value={
                    details.returns === "accepted" ? "Accepted" : "Not accepted"
                  }
                />
              )}
            </ul>
          </Section>{" "}
          <hr className="border-neutral-400 mx-4"></hr>
        </div>

        {/* ——— More from this shop (shop header + slider) ——— */}
        {!!moreFromShop.length && shop?.id && (
          <ShopMoreSection shop={shop} products={moreFromShop} />
        )}

        {/* ——— Compare similar ——— */}
        {!!similar.length && (
          <Section title="Compare similar items">
            <div className="grid grid-cols-2 gap-3">
              {similar.map((x) => (
                <Link
                  key={x.id}
                  href={`/product/${x.id}`}
                  className="block rounded-xl bg-white border overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-neutral-100">
                    {Array.isArray(x.photos) && x.photos[0] ? (
                      <img
                        src={x.photos[0]}
                        alt={x.title}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="p-2">
                    <div className="text-sm line-clamp-2">{x.title}</div>
                    <div className="text-xs text-neutral-600 mt-1">
                      MAD{x.price_mad}
                    </div>
                  </div>
                </Link>
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
            style={{
              // 🟢 lift it above your BottomNav (which is ~64–72px tall)
              bottom: "calc(env(safe-area-inset-bottom) + 54px)",
            }}
          >
            <div className="max-w-screen-sm mx-auto   bg-white/90 backdrop-blur-sm border-t border-neutral-200 px-4 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
              <button
                onClick={handleAddToCartMerge}
                disabled={isUnavailable || isInactive || isRemoved}
                className="w-full rounded-full bg-amber-900 text-white px-4 py-3 font-medium shadow-md disabled:opacity-60"
              >
                {isUnavailable || isInactive || isRemoved
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
                {optionGroupsMemo.length > 0 && (
                  <>
                    <div className="font-semibold mt-2">Available options</div>
                    <ul className="list-disc ml-4">
                      {optionGroupsMemo.map((g) => (
                        <li key={g.id}>
                          <span className="font-medium">{g.name}:</span>{" "}
                          {g.values.map((v) => v.label).join(", ")}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Trigger to open description */}
        {/* <div className="px-4 -mt-2">
        <button
          onClick={() => setDescOpen(true)}
          className="mt-3 text-sm underline"
        >
          Read item description
        </button>
      </div> */}

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

                {images.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {images.slice(0, 4).map((src, i) => (
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
          <DialogContent
            className="p-0 border-0 max-w-none w-screen h-screen"
            hideClose
          >
            <div className="fixed inset-0 bg-black/95" />
            <button
              onClick={() => setFsOpen(false)}
              aria-label="Close fullscreen"
              className="fixed top-3 right-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>

            {images.length > 1 && (
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
                {(images.length ? images : [undefined]).map((src, i) => (
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
