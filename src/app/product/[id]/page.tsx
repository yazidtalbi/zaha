// app/product/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Heart,
  Share2,
  MessageSquare,
  ChevronLeft,
  Pencil,
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
import useEmblaCarousel from "embla-carousel-react";

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
          shops:shop_id ( id, title, avatar_url )
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
      // ✅ Use the object signature so personalization + options are saved
      const res = await addToCart({
        productId: p.id,
        qty,
        options: optionsObject, // jsonb
        personalization: personalization.trim() || null, // text
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

  if (loading) return <main className="p-4">Loading…</main>;
  if (err) return <main className="p-4">Error: {err}</main>;
  if (!p) return <main className="p-4">Not found.</main>;

  return (
    <>
      {isRemoved ? (
        <main className="pb-10">
          {/* Top bar with back arrow */}
          <div className="absolute z-10 top-3 left-3 flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="h-9 w-9 rounded-full grid place-items-center"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          {/* Centered unavailable message */}
          <div className="flex flex-col items-center justify-center pt-28 pb-8 text-center">
            <div className="text-lg font-medium mb-1">
              Sorry, this item is unavailable
            </div>
            <div className="text-sm text-neutral-400">
              The seller has removed this product from their store.
            </div>
          </div>

          {/* More from shop */}
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
          </div>

          {/* gallery (Embla) */}
          <div className="relative">
            <div ref={emblaRef} className="embla overflow-hidden">
              <div className="flex">
                {(images.length ? images : [undefined]).map((src, i) => (
                  <div
                    key={i}
                    className="min-w-0 flex-[0_0_100%] aspect-[4/3] bg-black/5"
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
                  </div>
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

          {/* title + price */}
          <div className="px-4 pt-1 space-y-2">
            <h1 className="text-lg font-semibold leading-snug">{p.title}</h1>

            {isUnavailable && (
              <div className="text-[12px] text-amber-800 bg-amber-100 px-2 py-1 rounded-full inline-block">
                temporarily unavailable
              </div>
            )}

            {promoActive ? (
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium text-green-400">
                  {percentOff}% off sale ends {formatEndsShort(p.promo_ends_at)}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-xl font-bold text-green-400">
                    MAD{(promoTotal as number).toLocaleString("en-US")}
                  </div>
                  <div className="line-through text-neutral-400">
                    MAD{currentTotal.toLocaleString("en-US")}
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
                    MAD{currentTotal.toLocaleString("en-US")}
                  </div>
                )}
                {(isInactive || isRemoved) && !isUnavailable && (
                  <span className="text-[11px] rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-700">
                    removed from seller’s store
                  </span>
                )}
              </div>
            )}

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

          {/* OPTIONS (dynamic) */}
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

          {/* quantity + CTAs */}
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
              <button
                onClick={handleAddToCart}
                disabled={isUnavailable || isInactive || isRemoved}
                className="rounded-full border bg-white px-4 py-3 font-medium disabled:opacity-60"
              >
                {isUnavailable || isInactive || isRemoved
                  ? "Unavailable"
                  : "Add to cart"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isUnavailable || isInactive || isRemoved}
                className="rounded-full bg-black text-white px-4 py-3 font-medium disabled:opacity-60"
              >
                {isUnavailable || isInactive || isRemoved
                  ? "Unavailable"
                  : "Buy it now"}
              </button>
            </div>
            <div ref={sentinelRef} className="h-px" />
          </Section>

          {/* Reviews placeholder */}
          <Section title="Item reviews and shop ratings">
            <div className="rounded-xl border bg-white p-3 text-sm text-neutral-600">
              This item has not been reviewed yet. Buy it now and leave a
              review.
            </div>
          </Section>

          {/* Item details */}
          <Section title="Item details">
            <ul className="space-y-3 text-[15px]">
              <li>
                <span className="font-medium">Made by</span>{" "}
                {shop?.title ?? p.shop_title ?? "independent artisan"}
              </li>
              <li>
                <span className="font-medium">Made to order</span>
              </li>
              <li>
                <span className="font-medium">Ships from</span>{" "}
                {p.city ?? "Morocco"}
              </li>
            </ul>
          </Section>

          {/* Similar */}
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

          {showStickyAdd && (
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

          {/* ---------- DESCRIPTION: shadcn Sheet ---------- */}
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

          {/* ---------- PERSONALIZATION: shadcn Sheet ---------- */}
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
    </>
  );
}

/* Tailwind helpers:
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
