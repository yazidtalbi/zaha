"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Heart } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useFavorites } from "@/hooks/useFavorites";

// ————————————————————————————
// Types
// ————————————————————————————
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
  rating_count?: number | null;
  shop_owner?: string | null;
};

type Props = {
  p: Product;
  variant?: "default" | "carousel";
  className?: string;
  onUnfavorite?: (id: string) => void; // 👈 allow parent (/favorites) to remove instantly
};

// ————————————————————————————
// Helpers
// ————————————————————————————
function formatMAD(v: number) {
  return `MAD${v.toLocaleString("en-US")}`;
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
): {
  current: number;
  compareAt: number | null;
  promoOn: boolean;
} {
  const promoOn = isPromoActive(p, now);
  if (promoOn) {
    return {
      current: p.promo_price_mad as number,
      compareAt: p.price_mad,
      promoOn: true,
    };
  }
  // fallback to old compare_at_mad if present
  if (p.compare_at_mad && p.compare_at_mad > p.price_mad) {
    return {
      current: p.price_mad,
      compareAt: p.compare_at_mad,
      promoOn: false,
    };
  }
  return { current: p.price_mad, compareAt: null, promoOn: false };
}

// ————————————————————————————
// ProductCard
// ————————————————————————————
export default function ProductCard({
  p,
  variant = "default",
  className = "",
  onUnfavorite, // 👈 NEW
}: Props) {
  const imgs = useMemo(
    () => (Array.isArray(p.photos) ? p.photos.filter(Boolean) : []).slice(0, 5),
    [p.photos]
  );

  const { current, compareAt, promoOn } = getDisplayPrice(p);

  return (
    <Link
      href={`/product/${p.id}`}
      className={`block rounded-2xl bg-[#1c171a]/90 border border-black/5 overflow-hidden ${className}`}
    >
      {variant === "carousel" ? (
        <CardCarousel
          images={imgs}
          title={p.title}
          productId={p.id}
          shopOwner={p.shop_owner}
          promoOn={promoOn}
          onUnfavorite={onUnfavorite} // 👈 pass through
        />
      ) : (
        <div className="relative">
          <div className="aspect-[4/5] bg-neutral-100 relative">
            {imgs[0] ? (
              <img
                src={imgs[0]}
                alt={p.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-neutral-500 text-sm">
                No image
              </div>
            )}
          </div>
          <FavButton
            productId={p.id}
            shopOwner={p.shop_owner ?? undefined}
            onUnfavorite={onUnfavorite} // 👈 pass through
          />
          {promoOn && (
            <span className="absolute top-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500 text-white">
              Promo
            </span>
          )}
        </div>
      )}

      <div className="p-3">
        <div className="line-clamp-2 text-[13px] text-white/95">{p.title}</div>

        {(p.rating_avg ?? 0) > 0 && (
          <div className="mt-1 text-[12px] text-white/80 flex items-center gap-1">
            <span className="font-semibold">
              {(p.rating_avg as number).toFixed(1)}
            </span>
            <span>★</span>
            {typeof p.rating_count === "number" && (
              <span className="opacity-75">
                (
                {p.rating_count >= 1000
                  ? `${Math.round(p.rating_count / 100) / 10}k`
                  : p.rating_count}
                )
              </span>
            )}
          </div>
        )}

        <div className="mt-1 flex items-baseline gap-2">
          <div className="text-[15px] font-semibold text-[#7ee084]">
            {formatMAD(current)}
          </div>
          {compareAt && (
            <div className="text-[12px] line-through text-white/40">
              {formatMAD(compareAt)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ————————————————————————————
// CardCarousel
// ————————————————————————————
function CardCarousel({
  images,
  title,
  productId,
  shopOwner,
  promoOn,
  onUnfavorite, // 👈 NEW
}: {
  images: string[];
  title: string;
  productId: string;
  shopOwner?: string | null;
  promoOn: boolean;
  onUnfavorite?: (id: string) => void; // 👈 NEW
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
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {(images.length ? images : [undefined]).map((src, i) => (
            <div className="min-w-0 flex-[0_0_100%]" key={i}>
              <div className="aspect-[4/5] bg-neutral-100 relative">
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
                {promoOn && (
                  <span className="absolute top-2 left-2 z-10 rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-500 text-white">
                    Promo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FavButton
        productId={productId}
        shopOwner={shopOwner ?? undefined}
        onUnfavorite={onUnfavorite} // 👈 pass through
      />

      {images.length > 1 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5">
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

// ————————————————————————————
// FavButton
// ————————————————————————————
function FavButton({
  productId,
  shopOwner,
  onUnfavorite, // 👈 NEW
}: {
  productId: string;
  shopOwner?: string;
  onUnfavorite?: (id: string) => void; // 👈 NEW
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
        setBusy(false); // ensure not stuck busy
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
        toggleFavorite(productId); // keep shared state in sync
        onUnfavorite?.(productId); // 👈 tell /favorites page to remove instantly
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: uid, product_id: productId });

        toast.success("Added to favorites ❤️");
        toggleFavorite(productId); // keep shared state in sync
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
      className="absolute top-2 right-2 h-9 w-9 rounded-full bg-black/60 grid place-items-center text-white"
    >
      <Heart size={18} className={on ? "fill-white" : ""} />
    </button>
  );
}
