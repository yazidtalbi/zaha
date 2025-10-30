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
  price_mad: number;
  compare_at_mad?: number | null;
  photos?: string[] | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  shop_owner?: string | null; // 👈 add this
};

type Props = {
  p: Product;
  variant?: "default" | "carousel";
  className?: string;
};

// ————————————————————————————
// Helpers
// ————————————————————————————
function formatMAD(v: number) {
  return `MAD${v.toLocaleString("en-US")}`;
}

// ————————————————————————————
// ProductCard
// ————————————————————————————
export default function ProductCard({
  p,
  variant = "default",
  className = "",
}: Props) {
  const imgs = useMemo(
    () => (Array.isArray(p.photos) ? p.photos.filter(Boolean) : []).slice(0, 5),
    [p.photos]
  );

  const hasDiscount =
    p.compare_at_mad && (p.compare_at_mad as number) > p.price_mad;

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
          <FavButton productId={p.id} shopOwner={p.shop_owner} />
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
            {formatMAD(p.price_mad)}
          </div>
          {hasDiscount && (
            <div className="text-[12px] line-through text-white/40">
              {formatMAD(p.compare_at_mad as number)}
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
}: {
  images: string[];
  title: string;
  productId: string;
  shopOwner?: string | null;
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
              <div className="aspect-[4/5] bg-neutral-100">
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

      <FavButton productId={productId} shopOwner={shopOwner ?? undefined} />

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
}: {
  productId: string;
  shopOwner?: string;
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
        return;
      }
      if (shopOwner && shopOwner === uid) {
        toast.error("You can’t favorite your own product.");
        return;
      }

      if (on) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", uid)
          .eq("product_id", productId);
        toast("Removed from favorites");
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: uid, product_id: productId });
        toast.success("Added to favorites ❤️");
      }

      toggleFavorite(productId);
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
