// app/product/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

/* -------------------- utils -------------------- */
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
      photo: Array.isArray(p.photos) ? p.photos[0] ?? null : null,
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
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-4 py-5">
      <h3 className="text-base font-semibold mb-3">{title}</h3>
      {children}
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

/* Small helper for item details rows */
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
      <span className="text-[15px] leading-relaxed">
        <span className="font-medium">{label}: </span>
        <span className="text-neutral-700">{value}</span>
      </span>
    </li>
  );
}

/* -------- NEW: keywords helpers (comma-separated -> pill list) -------- */
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
    <div className="mt-1 flex flex-wrap gap-1.5">
      {items.map((tag) => (
        <Link
          href={`/search?q=${encodeURIComponent(tag)}`}
          key={tag}
          className="inline-flex items-center rounded-full bg-neutral-100 text-neutral-700 px-2.5 py-1 text-[12px] hover:bg-neutral-200"
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}

/* -------------------- page -------------------- */
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

  //cta
  const [inCart, setInCart] = useState(false);

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

  // personalization config/state
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

  // Embla carousel (top gallery)
  const [idx, setIdx] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setIdx(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // ---------- Fullscreen viewer state ----------
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

  // keyboard arrows in fullscreen
  useEffect(() => {
    if (!fsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") fsPrev();
      if (e.key === "ArrowRight") fsNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fsOpen, fsPrev, fsNext]);

  // sticky CTA
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showStickyAdd, setShowStickyAdd] = useState(false);

  // load product
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
          shops:shop_id ( id, title, avatar_url, owner )
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

  // default selections
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
          .limit(6);
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

  // base + pricing math
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
  const percentOff =
    promoActive && currentTotal > 0
      ? Math.round(
          ((currentTotal - (promoTotal as number)) / currentTotal) * 100
        )
      : 0;

  // NEW availability semantics
  const isUnavailable = Boolean(p?.unavailable);
  const isRemoved = Boolean(p?.deleted_at);
  const isInactive = !Boolean(p?.active);

  // sticky observe
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStickyAdd(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -72px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  function selectionsToLabel(): string {
    const parts: string[] = [];
    for (const g of optionGroups) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      if (v) parts.push(`${g.name}:${v.label}`);
    }
    return parts.join("|");
  }

  /** Build a clean options object like { Size: "M", Color: "Blue" } */
  function selectionsToOptionsObject(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const g of optionGroups) {
      const vid = selected[g.id];
      const v = g.values.find((x) => x.id === vid);
      if (v) out[g.name] = v.label;
    }
    return out;
  }

  async function handleAddToCart() {
    if (isOwner) {
      toast.error("You can’t add your own item to your cart.");
      return;
    }
    if (isUnavailable || isInactive || isRemoved) {
      toast("This item is currently unavailable.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast("Please sign in to add items.");
      router.push("/account");
      return;
    }
    if (p.shop_owner === user.id) {
      toast.error("You can’t add your own item to your cart.");
      return;
    }

    const optionsObject = selectionsToOptionsObject();

    try {
      const res = await addToCart({
        productId: p.id,
        qty,
        options: optionsObject,
        personalization: personalization.trim() || null,
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent("cart:changed"));
        toast.success("Added to cart 🛒");
      } else {
        toast.error("Failed to add to cart", { description: res.message });
      }
    } catch (e: any) {
      toast.error("Failed to add to cart", { description: e?.message });
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

  // -------- Item details (from JSON) --------
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

  // Compute "Order now and get it on <date>"
  const etaString = useMemo(() => {
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
    const pretty = eta.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
    return `Order now and get it on ${pretty}`;
  }, [
    details.shipping?.estimate_days_max,
    details.shipping?.estimate_days_min,
  ]);

  if (loading) return <main className="p-4">Loading…</main>;
  if (err) return <main className="p-4">Error: {err}</main>;
  if (!p) return <main className="p-4">Not found.</main>;

  return (
    <>
      {isRemoved ? (
        /* ---------------- Removed screen ---------------- */
        <main className="pb-10">
          <div className="absolute z-10 top-3 left-3 flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 rounded-full grid place-items-center"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
          <div className="flex flex-col items-center justify-center pt-28 pb-8 text-center">
            <div className="text-lg font-medium mb-1">
              Sorry, this item is unavailable
            </div>
            <div className="text-sm text-neutral-400">
              The seller has removed this product from their store.
            </div>
          </div>
          {isOwner && (
            <div className="px-4">
              <Link
                href={`/seller/edit/${p.id}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-black text-white px-4 py-3 font-medium"
              >
                <Pencil size={16} />
                Edit this product
              </Link>
            </div>
          )}
          <div className="px-4 space-y-8">
            {!!moreFromShop.length && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">
                    Discover more from this store →
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {moreFromShop.map((x) => (
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
                        <div className="text-sm line-clamp-2 text-black">
                          {x.title}
                        </div>
                        <div className="text-xs text-neutral-600 mt-1">
                          MAD{x.price_mad.toLocaleString("en-US")}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        </main>
      ) : (
        /* ---------------- Normal product screen ---------------- */
        <main className="pb-10 bg-neutral-50 min-h-screen">
          {/* top buttons */}
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

          {/* gallery */}
          <div className="relative">
            <div ref={emblaRef} className="embla overflow-hidden">
              <div className="flex">
                {(images.length ? images : [undefined]).map((src, i) => (
                  <button
                    key={i}
                    className="min-w-0 flex-[0_0_100%] aspect-[4/3] bg-black/5"
                    onClick={() => (src ? openFullscreenAt(i) : undefined)}
                    aria-label={
                      src ? `Open image ${i + 1} fullscreen` : "No image"
                    }
                  >
                    {src ? (
                      <img
                        src={src}
                        alt={p.title}
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

            {/* dots */}
            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    className={`h-2 w-2 rounded-full ${
                      i === idx ? "bg-black" : "bg-neutral-300"
                    }`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* title + price + shop */}
          <div className="px-4 pt-1 space-y-2">
            <h1 className="text-lg font-semibold leading-snug">{p.title}</h1>

            {/* NEW: keyword/tag pills */}
            <TagList items={keywordArray(p.keywords)} />

            {isUnavailable && (
              <div className="text-[12px] text-amber-800 bg-amber-100 px-2 py-1 rounded-full inline-block">
                temporarily unavailable
              </div>
            )}

            {/* pricing */}
            {(() => {
              const promoActiveLocal = isPromoActive(p);
              const currentTotalLocal = currentTotal;
              const promoTotalLocal = promoActiveLocal
                ? Math.round(Number(p.promo_price_mad)) + selectedDelta
                : null;
              const percentOffLocal =
                promoActiveLocal && currentTotalLocal > 0
                  ? Math.round(
                      ((currentTotalLocal - (promoTotalLocal as number)) /
                        currentTotalLocal) *
                        100
                    )
                  : 0;

              return promoActiveLocal ? (
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-medium text-green-400">
                    {percentOffLocal}% off sale ends{" "}
                    {formatEndsShort(p.promo_ends_at)}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="text-xl font-bold text-green-400">
                      MAD{(promoTotalLocal as number).toLocaleString("en-US")}
                    </div>
                    <div className="line-through text-neutral-400">
                      MAD{currentTotalLocal.toLocaleString("en-US")}
                    </div>
                    {(isInactive || isRemoved) && !isUnavailable && (
                      <span className="text-[11px] rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-700">
                        removed from seller’s store
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  {minTotal !== maxTotal ? (
                    <div className="text-xl font-bold">
                      MAD{minTotal.toLocaleString("en-US")} – MAD
                      {maxTotal.toLocaleString("en-US")}
                    </div>
                  ) : (
                    <div className="text-xl font-bold">
                      MAD{currentTotalLocal.toLocaleString("en-US")}
                    </div>
                  )}
                  {(isInactive || isRemoved) && !isUnavailable && (
                    <span className="text-[11px] rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-700">
                      removed from seller’s store
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="text-sm text-neutral-500">
              by{" "}
              {p.shop_id ? (
                <Link
                  href={`/shop/${p.shop_id}`}
                  className="inline-flex items-center gap-2 hover:underline"
                >
                  {shopImg ? (
                    <span className="inline-block h-5 w-5 rounded-full overflow-hidden bg-neutral-200">
                      <img
                        src={shopImg}
                        alt={shop?.title ?? "Shop"}
                        className="h-full w-full object-cover"
                      />
                    </span>
                  ) : null}
                  <span className="font-medium">{shop?.title || "shop"}</span>
                </Link>
              ) : (
                <span className="font-medium">
                  {p.shop_title || "a Moroccan maker"}
                </span>
              )}
            </div>
          </div>

          {/* OPTIONS */}
          {optionGroups.map((g) => {
            const valueId = selected[g.id] ?? "";
            return (
              <Section key={g.id} title={g.name}>
                <div className="rounded-xl border bg-white px-3 py-2">
                  <select
                    className="w-full bg-transparent outline-none py-1"
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

          {/* PERSONALIZATION */}
          {personalizationConfig.enabled && (
            <Section title="Personalization">
              {personalization.trim() ? (
                <div className="rounded-xl border bg-white">
                  <div className="flex items-center justify-between px-3 py-3 border-b">
                    <div className="font-medium">Your personalization</div>
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
                <div className="text-center">
                  <div className="text-sm text-neutral-600 mb-2">
                    Personalize before adding to your cart
                  </div>
                  <button
                    type="button"
                    onClick={() => setPersonalizationOpen(true)}
                    className="w-full rounded-full border bg-white px-4 py-3 font-medium"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-4 w-4 rounded border border-dashed" />
                      Add personalization
                    </span>
                  </button>
                </div>
              )}
            </Section>
          )}

          {/* Quantity & CTAs or Owner Edit */}
          {!isOwner ? (
            <Section title="Quantity">
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

              <div className="mt-4 grid grid-cols-1 gap-2">
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
                      className="rounded-full bg-black text-white px-4 py-3 font-medium disabled:opacity-60"
                    >
                      Add new item
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleAddToCartMerge}
                      disabled={isUnavailable || isInactive || isRemoved}
                      className="rounded-full border bg-white px-4 py-3 font-medium disabled:opacity-60"
                    >
                      Add to cart
                    </button>
                    <button
                      onClick={handleBuyNow}
                      disabled={isUnavailable || isInactive || isRemoved}
                      className="rounded-full bg-black text-white px-4 py-3 font-medium disabled:opacity-60"
                    >
                      Buy it now
                    </button>
                  </>
                )}
              </div>

              <div ref={sentinelRef} className="h-px" />
            </Section>
          ) : (
            <div className="px-4 py-3">
              <Link
                href={`/seller/edit/${p.id}`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-black text-white px-4 py-3 font-medium"
              >
                <Pencil size={16} />
                Edit this product
              </Link>
            </div>
          )}

          {/* Reviews strip */}
          <ProductReviewsStrip
            productId={p.id}
            shopId={p.shop_id ?? shop?.id}
          />

          {/* ---------------- ITEM DETAILS ---------------- */}
          <Section title="Item details">
            <ul className="space-y-3">
              <DetailRow
                icon={<Store className="h-5 w-5 text-neutral-500" />}
                label="Designed by"
                value={shop?.title ?? p.shop_title ?? "Independent artisan"}
              />

              <DetailRow
                icon={
                  details.type === "digital" ? (
                    <FileDown className="h-5 w-5 text-neutral-500" />
                  ) : (
                    <Package className="h-5 w-5 text-neutral-500" />
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
                  icon={<Ruler className="h-5 w-5 text-neutral-500" />}
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
                  icon={<Scale className="h-5 w-5 text-neutral-500" />}
                  label="Weight"
                  value={`${details.weight_kg} kg`}
                />
              )}

              {details.personalizable && (
                <DetailRow
                  icon={<Edit3 className="h-5 w-5 text-neutral-500" />}
                  label="Personalizable"
                  value="Yes"
                />
              )}

              {details.materials?.length > 0 && (
                <DetailRow
                  icon={<Layers className="h-5 w-5 text-neutral-500" />}
                  label="Materials"
                  value={details.materials.join(", ")}
                />
              )}
            </ul>
          </Section>

          {/* ---------------- SHIPPING ---------------- */}
          <Section title="Shipping & returns">
            <ul className="space-y-3">
              {details.ships_from && (
                <DetailRow
                  icon={<MapPin className="h-5 w-5 text-neutral-500" />}
                  label="Ships from"
                  value={details.ships_from}
                />
              )}

              {details.ships_to?.length > 0 && (
                <DetailRow
                  icon={<Truck className="h-5 w-5 text-neutral-500" />}
                  label="Ships to"
                  value={details.ships_to.join(", ")}
                />
              )}

              {/* Pricing */}
              {details.shipping?.mode === "free" ? (
                <DetailRow
                  icon={<Package className="h-5 w-5 text-neutral-500" />}
                  label="Shipping"
                  value={
                    details.shipping.free_over_mad
                      ? `Free (orders over MAD ${details.shipping.free_over_mad})`
                      : "Free"
                  }
                />
              ) : details.shipping?.mode === "fees" ? (
                <DetailRow
                  icon={<Package className="h-5 w-5 text-neutral-500" />}
                  label="Shipping"
                  value={
                    details.shipping.fee_mad != null
                      ? `MAD ${details.shipping.fee_mad}`
                      : "Additional fees"
                  }
                />
              ) : null}

              {/* Estimate */}
              {(details.shipping?.estimate_days_min ||
                details.shipping?.estimate_days_max) && (
                <li className="flex items-start gap-3">
                  <span className="mt-0.5">
                    <Truck className="h-5 w-5 text-neutral-500" />
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
                    {etaString && (
                      <div className="text-xs text-neutral-500 mt-1">
                        {etaString}
                      </div>
                    )}
                  </div>
                </li>
              )}

              {/* Badges */}
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

              {/* Notes */}
              {details.shipping?.notes && (
                <DetailRow
                  icon={<Package className="h-5 w-5 text-neutral-500" />}
                  label="Shipping policy"
                  value={details.shipping.notes}
                />
              )}

              {details.returns && (
                <DetailRow
                  icon={<Undo2 className="h-5 w-5 text-neutral-500" />}
                  label="Returns & exchanges"
                  value={
                    details.returns === "accepted" ? "Accepted" : "Not accepted"
                  }
                />
              )}
            </ul>
          </Section>

          {/* Compare similar */}
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

          {/* More from shop */}
          {!!moreFromShop.length && (
            <Section title="More from this shop">
              <div className="grid grid-cols-2 gap-3">
                {moreFromShop.map((x) => (
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

          <div className="h-24" />

          {/* Sticky add-to-cart (hidden for owner) */}
          {showStickyAdd && !isOwner && (
            <div
              className="fixed inset-x-0 px-4 z-50"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
            >
              <div className="max-w-screen-sm mx-auto">
                <button
                  onClick={handleAddToCart}
                  disabled={isUnavailable || isInactive || isRemoved}
                  className="w-full rounded-full bg-black text-white px-4 py-4 font-medium shadow-xl disabled:opacity-60"
                >
                  {isUnavailable || isInactive || isRemoved
                    ? "Unavailable"
                    : "Add to cart"}
                </button>
              </div>
            </div>
          )}

          {/* ---------- DESCRIPTION Sheet ---------- */}
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

                  {optionGroups.length > 0 && (
                    <>
                      <div className="font-semibold mt-2">
                        Available options
                      </div>
                      <ul className="list-disc ml-4">
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
              </div>
            </SheetContent>
          </Sheet>

          {/* Trigger for description sheet */}
          <div className="px-4 -mt-2">
            <button
              onClick={() => setDescOpen(true)}
              className="mt-3 text-sm underline"
            >
              Read item description
            </button>
          </div>

          {/* ---------- PERSONALIZATION Sheet ---------- */}
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
                    <div className="flex gap-2 overflow-x-auto pb-1">
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
                          e.target.value.slice(
                            0,
                            personalizationConfig.maxChars
                          )
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
        </main>
      )}

      {/* ---------- FULLSCREEN DIALOG FOR IMAGES ---------- */}
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
            <X className="h-5 w-5" />
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
    </>
  );
}

/* Tailwind helpers:
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
