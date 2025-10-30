"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import BottomSheet from "@/components/BottomSheet";
import { Heart, Share2, MessageSquare, ChevronLeft } from "lucide-react";
import { addToCart } from "@/lib/cart";
import { toast } from "sonner";

/** Save to local “recently viewed” */
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

/** Mini section wrapper */
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

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [p, setP] = useState<any>(null);
  const [shop, setShop] = useState<any>(null);
  const shopImg = useMemo(
    () =>
      shop?.avatar_url ||
      shop?.avatar_url ||
      shop?.photo ||
      shop?.cover ||
      null,
    [shop]
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<string | null>(null);

  const [similar, setSimilar] = useState<any[]>([]);
  const [moreFromShop, setMoreFromShop] = useState<any[]>([]);

  // --- Carousel
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const _id = (id ?? "").toString().trim();
    if (!_id) {
      setErr("No product id provided");
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      // JOIN the shop so we have its title immediately
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          shops:shop_id (
            id, title,  avatar_url 
          )
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

  // Remember + fetch related lists (no extra shop fetch needed now)
  useEffect(() => {
    if (!p) return;

    remember(p);

    (async () => {
      // Similar: same city or overlapping tag, exclude self
      let q = supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .neq("id", p.id)
        .limit(8);
      if (p.city) q = q.ilike("city", p.city);
      const sim = await q;
      setSimilar((sim.data as any[]) ?? []);

      // More from this shop
      if (p.shop_id) {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("active", true)
          .eq("shop_id", p.shop_id)
          .neq("id", p.id)
          .limit(6);
        setMoreFromShop((data as any[]) ?? []);
      }
    })();
  }, [p]);

  const images: string[] = useMemo(
    () =>
      (Array.isArray(p?.photos) ? (p.photos as string[]) : []).filter(Boolean),
    [p?.photos]
  );
  const img = images[0];

  // price + compare at (optional discount)
  const price = p?.price_mad ?? 0;
  const compareAt = p?.compare_at_mad ? Number(p.compare_at_mad) : null;
  const hasDiscount = !!compareAt && compareAt > price;

  // removed state (inactive or soft-deleted)
  const removed: boolean = !!p && (!p.active || !!p.deleted_at);

  // variants support: p.options OR p.sizes (array of strings), else One size
  const variantOptions: string[] = useMemo(() => {
    if (Array.isArray(p?.options) && p.options.length)
      return p.options as string[];
    if (Array.isArray(p?.sizes) && p.sizes.length) return p.sizes as string[];
    return ["One size"];
  }, [p?.options, p?.sizes]);

  useEffect(() => {
    if (!variant && variantOptions.length)
      setVariant(variantOptions[0] ?? null);
  }, [variant, variantOptions]);

  // --- REAL add to cart (supabase)
  async function handleAddToCart() {
    if (removed) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast("Please sign in to add items.");
      router.push("/account");
      return;
    }

    // 🚫 Prevent adding your own products
    if (p.shop_owner === user.id) {
      toast.error("You can’t add your own item to your cart.");
      return;
    }

    const res = await addToCart(p.id, qty);
    if (res.ok) {
      window.dispatchEvent(new CustomEvent("cart:changed"));
      toast.success("Added to cart 🛒");
    } else {
      toast.error("Failed to add to cart", { description: res.message });
    }
  }

  function handleBuyNow() {
    if (removed) return;
    router.push(
      `/checkout/${p.id}?qty=${qty}${
        variant ? `&variant=${encodeURIComponent(variant)}` : ""
      }`
    );
  }

  // carousel scroll snap index tracking (mobile-friendly)
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIdx(i);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <main className="p-4">Loading…</main>;
  if (err) return <main className="p-4">Error: {err}</main>;
  if (!p) return <main className="p-4">Not found.</main>;

  return (
    <main className="pb-28 bg-neutral-50 min-h-screen">
      {/* Top controls over images */}
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

      {/* Image carousel */}
      <div
        ref={trackRef}
        className="w-full aspect-[4/3] overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
      >
        <div className="flex w-full h-full">
          {(images.length ? images : [undefined]).map((src, i) => (
            <div
              key={i}
              className="w-full h-full shrink-0 snap-start bg-black/5"
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
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-1 py-2">
          {images.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i === idx ? "bg-black" : "bg-neutral-300"
              }`}
            />
          ))}
        </div>
      )}

      {/* Title & price block */}
      <div className="px-4 pt-1 space-y-2">
        <h1 className="text-lg font-semibold leading-snug">{p.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-xl font-bold">
            MAD{price.toLocaleString("en-US")}
          </div>
          {hasDiscount && (
            <>
              <div className="line-through text-neutral-400">
                MAD{compareAt!.toLocaleString("en-US")}
              </div>
              <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs">
                {Math.round(((compareAt! - price) / compareAt!) * 100)}% off
              </span>
            </>
          )}
          {(!p.active || !!p.deleted_at) && (
            <span className="text-[11px] rounded-full px-2 py-0.5 bg-neutral-200 text-neutral-700">
              removed from seller’s store
            </span>
          )}
        </div>
        <div className="text-sm text-neutral-500">
          by{" "}
          {p.shop_id ? (
            <Link
              href={`/shop/${p.shop_id}`}
              className="inline-flex items-center gap-2 hover:underline"
            >
              {shopImg ? (
                <span className="inline-block h-5 w-5 rounded-full overflow-hidden bg-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* Variant + Add to cart */}
      <Section title="Size">
        <div className="rounded-xl border bg-white px-3 py-2">
          <select
            className="w-full bg-transparent outline-none py-1"
            value={variant ?? ""}
            onChange={(e) => setVariant(e.target.value)}
          >
            {variantOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* qty selector */}
        <div className="mt-3 flex items-center gap-3">
          <div className="text-sm text-neutral-600">Quantity</div>
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
      </Section>

      {/* Reviews placeholder */}
      <Section title="Item reviews and shop ratings">
        <div className="rounded-xl border bg-white p-3 text-sm text-neutral-600">
          This item has not been reviewed yet. Buy it now and leave a review.
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
        <button
          onClick={() => setSheetOpen(true)}
          className="mt-3 text-sm underline"
        >
          Read item description
        </button>
      </Section>

      {/* Compare similar items */}
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

      {/* Estimated delivery (static MVP) */}
      <Section title="Estimated delivery">
        <div className="text-sm">Dec 8–13</div>
      </Section>

      {/* Shipping & policies (static MVP) */}
      <Section title="Shipping & policies">
        <ul className="space-y-2 text-[15px]">
          <li>Arrives by Dec 8–13</li>
          <li>Ships from {p.city ?? "Morocco"}</li>
          <li>Returns & exchanges: Accepted within 7 days</li>
        </ul>
      </Section>

      {/* More from this shop */}
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

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 border-t bg-white/95 backdrop-blur p-3">
        <div className="max-w-screen-sm mx-auto grid grid-cols-1 gap-2">
          <button
            onClick={handleAddToCart}
            disabled={!p.active || !!p.deleted_at}
            className="rounded-full border bg-white px-4 py-3 font-medium disabled:opacity-60"
          >
            {!p.active || !!p.deleted_at ? "Unavailable" : "Add to cart"}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!p.active || !!p.deleted_at}
            className="rounded-full bg-black text-white px-4 py-3 font-medium disabled:opacity-60"
          >
            {!p.active || !!p.deleted_at ? "Unavailable" : "Buy it now"}
          </button>
        </div>
        <div className="mt-2 text-center">
          <Link href="/home" className="text-sm underline">
            Back to Home
          </Link>
        </div>
      </div>

      {/* Description sheet */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Description"
      >
        <div className="space-y-3 text-[15px]">
          <p className="whitespace-pre-wrap">
            {p.description ??
              "Handmade with care. Minimalist aesthetic and durable build. Perfect for modern homes."}
          </p>
          {Array.isArray(variantOptions) && variantOptions.length > 1 && (
            <>
              <div className="font-semibold mt-2">Available sizes</div>
              <ul className="list-disc ml-4">
                {variantOptions.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </BottomSheet>
    </main>
  );
}

/* Tailwind helpers (optional)
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
