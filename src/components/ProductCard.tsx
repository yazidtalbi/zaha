"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/useFavorites";

/* -------------------------------------------
   Types
------------------------------------------- */
type Product = {
  id: string;
  title: string;
  price_mad: number; // base price
  compare_at_mad?: number | null; // legacy strike-through
  promo_price_mad?: number | null; // NEW
  promo_starts_at?: string | null; // NEW ISO
  promo_ends_at?: string | null; // NEW ISO
  photos?: string[] | null;
  rating_avg?: number | null;
  reviews_count?: number | null;
  shop_owner?: string | null;

  // Optional extras for the visual (won’t render if not provided)
  orders_count?: number | null; // e.g. 10200
  free_shipping?: boolean | null; // e.g. true
};

type Props = {
  p: Product;
  variant?: "default" | "carousel";
  className?: string;
  onUnfavorite?: (id: string) => void; // allow parent (/favorites) to remove instantly
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

/** Returns the current display price and an optional compareAt (for strikethrough) */
function getDisplayPrice(
  p: Product,
  now = new Date()
): { current: number; compareAt: number | null; promoOn: boolean } {
  const promoOn = isPromoActive(p, now);
  if (promoOn) {
    return {
      current: p.promo_price_mad as number,
      compareAt: p.price_mad,
      promoOn: true,
    };
  }
  if (p.compare_at_mad && p.compare_at_mad > p.price_mad) {
    return {
      current: p.price_mad,
      compareAt: p.compare_at_mad,
      promoOn: false,
    };
  }
  return { current: p.price_mad, compareAt: null, promoOn: false };
}

function fmtOrders(n?: number | null) {
  if (!n || n <= 0) return null;
  if (n >= 10000)
    return `${(Math.round(n / 100) / 10).toLocaleString("en-US")}k+`;
  return `${n.toLocaleString("en-US")}+`;
}

/* -------------------------------------------
   ProductCard
------------------------------------------- */
export default function ProductCard({
  p,
  variant = "default",
  className = "",
  onUnfavorite,
}: Props) {
  const imgs = useMemo(
    () => (Array.isArray(p.photos) ? p.photos.filter(Boolean) : []).slice(0, 5),
    [p.photos]
  );
  const { current, compareAt, promoOn } = getDisplayPrice(p);

  return (
    <Link
      href={`/product/${p.id}`}
      className={`block    overflow-hidden rounded-lg ${className}`}
    >
      {variant === "carousel" ? (
        <CardCarousel
          images={imgs}
          title={p.title}
          productId={p.id}
          shopOwner={p.shop_owner}
          promoOn={promoOn}
          onUnfavorite={onUnfavorite}
        />
      ) : (
        <div className="relative">
          {/* FIXED HEIGHT image container */}
          <div className="relative h-60 bg-neutral-100 roun ">
            {imgs[0] ? (
              <img
                src={imgs[0]}
                alt={p.title}
                className="w-full h-full object-cover "
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-neutral-500 text-sm">
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
      <div className="pt-3">
        {/* Title */}
        <div className="line-clamp-2 text-md leading-snug text-neutral-900 font-semibold">
          {p.title}
        </div>

        {/* Price row: “From MAD 780 1000” */}
        <div className="mt-1 flex items-baseline gap-2">
          {/* <span className="text-[14px] text-neutral-600">From</span> */}
          <span className="text-md font-semibold text-emerald-700">
            {formatMAD(current)}
          </span>
          {compareAt && (
            <span className="text-[14px] line-through text-neutral-400">
              {(compareAt as number).toLocaleString("en-US")}
            </span>
          )}
        </div>

        {/* Rating */}
        {(p.rating_avg ?? 0) > 0 && (
          <div className="mt-1 text-md text-neutral-900 flex items-center gap-1.5">
            <span className="font-semibold">
              {(p.rating_avg as number).toFixed(1)}
            </span>
            <span className="text-amber-600">★</span>
            {typeof p.reviews_count === "number" && (
              <span className="opacity-75">
                ({p.reviews_count.toLocaleString("en-US")})
              </span>
            )}
          </div>
        )}

        {/* Orders (optional) */}
        {p.orders_count ? (
          <div className="mt-1 text-[16px] font-semibold text-neutral-900">
            {fmtOrders(p.orders_count)}{" "}
            <span className="font-normal">Orders</span>
          </div>
        ) : null}

        {/* Free shipping pill (optional) */}
        {p.free_shipping ? (
          <div className="mt-2">
            <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs px-3 py-1 font-medium">
              Free shipping
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

/* -------------------------------------------
   CardCarousel
------------------------------------------- */
function CardCarousel({
  images,
  title,
  productId,
  shopOwner,
  promoOn,
  onUnfavorite,
}: {
  images: string[];
  title: string;
  productId: string;
  shopOwner?: string | null;
  promoOn: boolean;
  onUnfavorite?: (id: string) => void;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSel = () => setIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSel);
    onSel();
    return () => emblaApi.off("select", onSel);
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg" ref={emblaRef}>
        <div className="flex">
          {(images.length ? images : [undefined]).map((src, i) => (
            <div className="min-w-0 flex-[0_0_100%]" key={i}>
              {/* FIXED HEIGHT image container */}
              <div className="relative h-60 bg-neutral-100">
                {src ? (
                  <img
                    src={src}
                    alt={title}
                    className="w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-neutral-500 text-sm">
                    No image
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {promoOn && (
        <span className="absolute top-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500 text-white">
          Promo
        </span>
      )}
      <FavButton
        productId={productId}
        shopOwner={shopOwner ?? undefined}
        onUnfavorite={onUnfavorite}
      />

      {images.length > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-1.5 py-1 backdrop-blur-sm">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-white" : "w-2 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------
   FavButton
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
      if (!uid) {
        toast("Please sign in to save favorites.");
        setBusy(false);
        return;
      }
      if (shopOwner && shopOwner === uid) {
        toast.error("You can’t favorite your own product.");
        setBusy(false);
        return;
      }

      if (on) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", uid)
          .eq("product_id", productId);
        toast("Removed from favorites");
        toggleFavorite(productId);
        onUnfavorite?.(productId);
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: uid, product_id: productId });
        toast.success("Added to favorites ❤️");
        toggleFavorite(productId);
      }
    } catch (err: any) {
      toast.error("Failed to update favorites", { description: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      aria-label="Favorite"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        toggle();
      }}
      className="absolute top-2 right-2 h-9 w-9 rounded-full bg-white shadow-sm grid place-items-center text-neutral-900"
    >
      <Heart size={18} className={on ? "fill-neutral-900" : ""} />
    </button>
  );
}
