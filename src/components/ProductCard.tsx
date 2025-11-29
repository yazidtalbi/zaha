"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/useFavorites";
import { useProductSeed, type SlimProduct } from "@/lib/productSeed";

/* -------------------------------------------
   Types (matches your schema)
------------------------------------------- */
type Product = {
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

  // availability + minimal shop context from parent
  unavailable?: boolean | null;
  active?: boolean | null;
  deleted_at?: string | null;
  shop_id?: string | null;
  shop_title?: string | null;
  city?: string | null;
};

type Props = {
  p: Product;
  variant?: "default" | "carousel" | "carouselAuto" | "mini" | "love";
  className?: string;
  onUnfavorite?: (id: string) => void;
  fromshop?: boolean;
};

/* -------------------------------------------
   Helpers
------------------------------------------- */
function formatMAD(v: number) {
  return `MAD ${v.toLocaleString("en-US")}`;
}

function isPromoActive(p: Product, now = new Date()) {
  if (!p.promo_price_mad || p.promo_price_mad <= 0) return false;
  if (!p.promo_starts_at || !p.promo_ends_at) return false;
  const start = new Date(p.promo_starts_at).getTime();
  const end = new Date(p.promo_ends_at).getTime();
  const t = now.getTime();
  return (
    Number.isFinite(start) && Number.isFinite(end) && t >= start && t < end
  );
}

function getDisplayPrice(p: Product) {
  const promoOn = isPromoActive(p);
  if (promoOn)
    return {
      current: p.promo_price_mad as number,
      compareAt: p.price_mad,
      promoOn: true,
    };
  if (p.compare_at_mad && p.compare_at_mad > p.price_mad)
    return {
      current: p.price_mad,
      compareAt: p.compare_at_mad,
      promoOn: false,
    };
  return { current: p.price_mad, compareAt: null, promoOn: false };
}

function fmtOrders(n?: number | null) {
  if (!n || n <= 0) return null;
  if (n >= 10000)
    return `${(Math.round(n / 100) / 10).toLocaleString("en-US")}k+`;
  return `${n.toLocaleString("en-US")}+ `;
}

/* -------------------------------------------
   Card
------------------------------------------- */
export default function ProductCard({
  p,
  variant = "default",
  className = "",
  onUnfavorite,
  fromshop = false,
}: Props) {
  const router = useRouter();
  const setSeed = useProductSeed((s) => s.setSeed);

  const imgs = useMemo(
    () => (Array.isArray(p.photos) ? p.photos.filter(Boolean) : []).slice(0, 5),
    [p.photos]
  );

  const hasVideo = !!p.video_url;
  const imagesForCard = useMemo(() => {
    const base = imgs.slice(0, 5);
    if (!hasVideo) return base;
    const poster = p.video_poster_url || base[0] || "";
    if (base.length >= 1) return [base[0], poster, ...base.slice(1)];
    return [poster];
  }, [imgs, hasVideo, p.video_poster_url]);

  const videoIndex = hasVideo ? (imgs.length >= 1 ? 1 : 0) : -1;
  const { current, compareAt, promoOn } = getDisplayPrice(p);
  const useCarousel = !fromshop && variant === "carousel";
  const useCarouselAuto = !fromshop && variant === "carouselAuto";

  function plural(n: number, singular: string, plural: string) {
    return n === 1 ? singular : plural;
  }

  function Stars({
    rating,
    size = "text-md",
    box = "w-2xl",
  }: {
    rating: number;
    size?: string;
    box?: string;
  }) {
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      const diff = rating - i + 1;

      if (diff >= 1) {
        // full star
        stars.push(
          <span key={i} className={`${size} text-amber-600`}>
            ★
          </span>
        );
      } else if (diff > 0) {
        // half star
        stars.push(
          <span key={i} className={`relative inline-block ${box} ${size}`}>
            {/* Filled left half */}
            <span className="absolute inset-0 overflow-hidden w-1/2 text-amber-600">
              ★
            </span>

            {/* Empty star underneath */}
            <span className="text-neutral-300">★</span>
          </span>
        );
      } else {
        // empty star
        stars.push(
          <span key={i} className={`${size} text-neutral-300`}>
            ★
          </span>
        );
      }
    }

    return <div className="flex items-center gap-[1px]">{stars}</div>;
  }

  // Slim seed snapshot for instant hydrate + cache
  const slim: SlimProduct = {
    id: p.id,
    title: p.title,
    price_mad: p.price_mad,
    compare_at_mad: p.compare_at_mad ?? null,
    promo_price_mad: p.promo_price_mad ?? null,
    promo_starts_at: p.promo_starts_at ?? null,
    promo_ends_at: p.promo_ends_at ?? null,
    photos: imgs,
    rating_avg: p.rating_avg ?? null,
    reviews_count: p.reviews_count ?? null,
    orders_count: p.orders_count ?? null,
    free_shipping: p.free_shipping ?? null,
    shop_owner: p.shop_owner ?? null,
    keywords: p.keywords ?? null,
    video_url: p.video_url ?? null,
    video_poster_url: p.video_poster_url ?? null,
    unavailable: p.unavailable ?? null,
    active: p.active ?? null,
    deleted_at: p.deleted_at ?? null,
    shop_id: p.shop_id ?? null,
    shop_title: p.shop_title ?? null,
    city: p.city ?? null,
  };

  // 💾 Session cache writer (used by ProductPage on reload)
  function writeCache() {
    try {
      sessionStorage.setItem(
        `product_cache_${p.id}`,
        JSON.stringify({ ...slim, __ts: Date.now(), v: 1 })
      );
    } catch {
      // ignore quota / serialization errors
    }
  }

  const handlePrefetch = () => {
    setSeed(p.id, slim);
    writeCache();
    router.prefetch(`/product/${p.id}`);
    if (imgs[0]) new Image().src = imgs[0];
  };

  const handleClickSeed = () => {
    setSeed(p.id, slim);
    writeCache();
  };

  return variant === "love" ? (
    // LOVE VARIANT — horizontal, clean, no overlay/infos inside the image
    <Link
      href={`/product/${p.id}`}
      prefetch
      onMouseEnter={handlePrefetch}
      onClick={handleClickSeed}
      className={`block ${className}`}
    >
      <div className="group relative overflow-hidden rounded-2xl   transition-all active:scale-[0.99] ">
        <div className="flex items-stretch gap-3">
          {/* Image (no overlay, no badges) */}
          <div className="relative shrink-0 w-28 h-28 rounded-xl overflow-hidden bg-neutral-100 sm:w-32 sm:h-32">
            {imgs[0] ? (
              <img
                src={imgs[0]}
                alt={p.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-neutral-500 text-xs">
                No image
              </div>
            )}
          </div>

          {/* Right content */}
          <div className="min-w-0 flex-1 py-1 pr-2">
            {/* Title */}
            <div className="line-clamp-2 text-[13px] sm:text-[14px] font-medium leading-snug text-neutral-900">
              {p.title}
            </div>

            {/* Rating (optional) */}
            {p.rating_avg && (
              <div className="mt-1 text-[11px] text-neutral-600">
                <span className="font-medium text-neutral-900">
                  {p.rating_avg.toFixed(1)}
                </span>
                <span className="ml-1 text-amber-600">★</span>
                {p.reviews_count ? (
                  <span className="ml-1">
                    ({p.reviews_count.toLocaleString("en-US")})
                  </span>
                ) : null}
              </div>
            )}

            {/* Price row */}
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`text-[13px] sm:text-[14px] font-medium ${
                  promoOn ? "text-emerald-700" : "text-neutral-900"
                }`}
              >
                {formatMAD(current)}
              </span>

              {compareAt && (
                <span className="text-[12px] line-through text-neutral-400">
                  {compareAt.toLocaleString("en-US")}
                </span>
              )}
              {promoOn && (
                <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-medium">
                  Promo
                </span>
              )}
            </div>

            {/* Meta chips (optional) */}
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {p.free_shipping && (
                <span className="rounded-full bg-neutral-100 text-neutral-700 px-2 py-0.5 text-[10px] font-medium">
                  Free shipping
                </span>
              )}
              {p.orders_count ? (
                <span className="rounded-full bg-neutral-100 text-neutral-700 px-2 py-0.5 text-[10px] font-medium">
                  {fmtOrders(p.orders_count)} orders
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Link>
  ) : variant === "mini" ? (
    // MINI VARIANT (Used for "Because you viewed" rail)
    <Link
      href={`/product/${p.id}`}
      prefetch
      onMouseEnter={handlePrefetch}
      onClick={handleClickSeed}
      className={`block overflow-hidden ${className}`}
    >
      <div className="relative ">
        <div className="relative h-36 rounded-lg overflow-hidden bg-neutral-100 ">
          {imgs[0] ? (
            <img
              src={imgs[0]}
              alt={p.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full grid place-items-center text-neutral-500 text-xs">
              No image
            </div>
          )}
          {promoOn && (
            <span className="absolute top-1 left-1 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500 text-white">
              Promo
            </span>
          )}
        </div>
      </div>

      <div className="pt-2">
        <div className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 truncate">
          {p.title}
        </div>
      </div>
    </Link>
  ) : (
    // DEFAULT OR CAROUSEL
    <Link
      href={`/product/${p.id}`}
      prefetch
      onMouseEnter={handlePrefetch}
      onClick={handleClickSeed}
      className={`block overflow-hidden ${className}`}
    >
      {useCarousel || useCarouselAuto ? (
        <CardCarousel
          images={imagesForCard}
          title={p.title}
          productId={p.id}
          shopOwner={p.shop_owner ?? undefined}
          promoOn={promoOn}
          onUnfavorite={onUnfavorite}
          videoSrc={p.video_url ?? undefined}
          videoIndex={videoIndex}
          autoHeight={useCarouselAuto}
        />
      ) : (
        <div className="relative">
          <div
            className={`relative h-36 bg-neutral-100 overflow-hidden ${
              fromshop ? "rounded-xl" : "rounded-lg"
            }`}
          >
            {imgs[0] ? (
              <img
                src={imgs[0]}
                alt={p.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-neutral-500 text-sm">
                No image
              </div>
            )}
            {promoOn && (
              <span className="absolute top-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500 text-white">
                Promo
              </span>
            )}
          </div>
          <FavButton
            productId={p.id}
            shopOwner={p.shop_owner ?? undefined}
            onUnfavorite={onUnfavorite}
          />
        </div>
      )}

      {/* BODY */}
      <div className="pt-1.5 -space-y-1">
        <div className="line-clamp-2 text-sm font-normal text-neutral-900 leading-snug">
          {p.title}
        </div>

        <div className="mt-1 flex items-baseline gap-1">
          <span
            className={`text-sm font-semibold ${
              promoOn ? "text-emerald-700" : "text-neutral-900"
            }`}
          >
            {formatMAD(current)}
          </span>
          {compareAt && (
            <span className="text-sm line-through text-neutral-500">
              MAD {compareAt.toLocaleString("en-US")}
            </span>
          )}
        </div>

        {/* Rating + reviews */}
        {!fromshop && p.rating_avg != null && p.rating_avg > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-900">
            <Stars rating={p.rating_avg} />

            {p.reviews_count != null && p.reviews_count > 0 && (
              <span className="opacity-75">
                ({p.reviews_count.toLocaleString("en-US")})
              </span>
            )}
          </div>
        )}

        {/* Orders count */}
        {!fromshop && p.orders_count != null && p.orders_count > 0 && (
          <div className="mt-1 text-sm font-medium text-neutral-900">
            {fmtOrders(p.orders_count)}
            <span className="font-normal">
              {plural(p.orders_count, "Order", "Orders")}
            </span>
          </div>
        )}

        {p.free_shipping && (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs px-3 py-1 font-medium">
              Free shipping
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

/* -------------------------------------------
   Carousel with lazy video + spinner + tight dots
   + autoHeight (based on first media, clamped to max-h-64)
------------------------------------------- */
function CardCarousel({
  images,
  title,
  productId,
  shopOwner,
  promoOn,
  onUnfavorite,
  videoSrc,
  videoIndex = -1,
  autoHeight = false,
  maxHeightClass = "max-h-64",
}: {
  images: string[];
  title: string;
  productId: string;
  shopOwner?: string;
  promoOn?: boolean;
  onUnfavorite?: (id: string) => void;
  videoSrc?: string;
  videoIndex?: number;
  autoHeight?: boolean;
  maxHeightClass?: string;
}) {
  const MAX_AUTO_HEIGHT_PX = 256; // Tailwind max-h-64
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [autoHeightPx, setAutoHeightPx] = useState<number | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel);
    onSel();
    return () => {
      emblaApi.off("select", onSel);
    };
  }, [emblaApi]);

  const shouldLoadVideo = !!videoSrc && videoIndex >= 0 && index === videoIndex;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (shouldLoadVideo) v.play().catch(() => {});
    else {
      v.pause();
      v.currentTime = 0;
    }
  }, [shouldLoadVideo]);

  // Measure the first slide (image or video) to determine height, then clamp
  function measureFirstMediaHeight(
    w: number,
    naturalW: number,
    naturalH: number
  ) {
    if (!autoHeight || autoHeightPx != null) return;
    if (!w || !naturalW || !naturalH) return;
    const ratio = naturalH / naturalW;
    const h = Math.min(w * ratio, MAX_AUTO_HEIGHT_PX);
    if (Number.isFinite(h) && h > 0) {
      setAutoHeightPx(h);
    }
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {images.map((src, i) => {
            const isVideo = videoSrc && i === videoIndex;

            return (
              <div className="min-w-0 flex-[0_0_100%] min-h-40" key={i}>
                <div
                  className={
                    autoHeight
                      ? `relative w-full bg-neutral-100 overflow-hidden ${maxHeightClass}`
                      : "relative h-60 bg-neutral-100"
                  }
                  style={
                    autoHeight && autoHeightPx != null
                      ? { height: autoHeightPx }
                      : undefined
                  }
                >
                  {isVideo ? (
                    <div className="relative w-full h-full">
                      <video
                        ref={videoRef}
                        className={
                          autoHeight
                            ? "w-full h-full object-cover"
                            : "w-full h-full object-cover"
                        }
                        poster={src}
                        {...(shouldLoadVideo ? { src: videoSrc } : {})}
                        muted
                        playsInline
                        autoPlay
                        loop
                        preload="none"
                        controls={false}
                        onLoadStart={() => setVideoLoading(true)}
                        onLoadedData={() => setVideoLoading(false)}
                        onCanPlay={(e) => {
                          setVideoLoading(false);
                          if (autoHeight && i === 0) {
                            const v = e.currentTarget;
                            measureFirstMediaHeight(
                              v.clientWidth,
                              v.videoWidth,
                              v.videoHeight
                            );
                          }
                        }}
                        onPlaying={() => setVideoLoading(false)}
                        onWaiting={() => setVideoLoading(true)}
                        onError={() => setVideoLoading(false)}
                      />
                      {videoLoading && (
                        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
                          <div className="h-6 w-6 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <img
                      src={src}
                      alt={title}
                      className={
                        autoHeight
                          ? "w-full h-full object-cover"
                          : "w-full h-full object-cover"
                      }
                      loading={i === 0 ? "eager" : "lazy"}
                      ref={
                        autoHeight && i === 0
                          ? (el) => {
                              if (!el) return;
                              if (el.complete) {
                                measureFirstMediaHeight(
                                  el.clientWidth,
                                  el.naturalWidth,
                                  el.naturalHeight
                                );
                              } else {
                                el.onload = () => {
                                  measureFirstMediaHeight(
                                    el.clientWidth,
                                    el.naturalWidth,
                                    el.naturalHeight
                                  );
                                };
                              }
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {promoOn && (
        <span className="absolute top-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500 text-white">
          Promo
        </span>
      )}

      <FavButton
        productId={productId}
        shopOwner={shopOwner}
        onUnfavorite={onUnfavorite}
      />

      {images.length > 1 && (
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-10 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-black/40 px-1 py-[1.5px] backdrop-blur-sm">
          {images.map((_, i) => (
            <span key={i} className="h-3 w-3 grid place-items-center">
              <span
                className={`block rounded-full h-[3px] transition-all duration-300 ease-out ${
                  i === index ? "bg-white w-2.5" : "bg-white/50 w-1.5"
                }`}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------
   Favorite button
------------------------------------------- */
function FavButton({
  productId,
  shopOwner,
  onUnfavorite,
}: {
  productId: string;
  shopOwner?: string;
  onUnfavorite?: (id: string) => void;
}) {
  const { favorites, uid, toggleFavorite } = useFavorites();
  const [busy, setBusy] = useState(false);
  const on = favorites.has(productId);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (!uid) return toast("Please sign in.");
      if (shopOwner && shopOwner === uid)
        return toast.error("You can’t favorite your own product.");

      if (on) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", uid)
          .eq("product_id", productId);
        if (error) throw error;
        toggleFavorite(productId);
        onUnfavorite?.(productId);
        toast("Removed");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: uid, product_id: productId });
        if (error) throw error;
        toggleFavorite(productId);
        toast.success("Added ❤️");
      }
    } catch (e: any) {
      toast.error("Failed to update favorites", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        toggle();
      }}
      className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white shadow-sm grid place-items-center text-neutral-900 active:scale-[0.98] disabled:opacity-60"
      aria-label="Favorite"
      title="Favorite"
    >
      <Heart size={18} className={on ? "fill-neutral-900" : ""} />
    </button>
  );
}
