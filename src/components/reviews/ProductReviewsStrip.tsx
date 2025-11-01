// components/reviews/ProductReviewStrip.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Review = {
  id: string;
  author: string;
  rating: number | null;
  title: string | null;
  body: string | null;
  photos: string[] | null;
  created_at: string;
};

export default function ProductReviewStrip({
  productId,
  shopId, // ← pass this from the product page so we can link correctly
}: {
  productId: string;
  shopId?: string | null;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, author, rating, title, body, photos, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (!error && data) setReviews(data);
    })();
  }, [productId]);

  const { avg, count, histogram } = useMemo(() => {
    const count = reviews.length;
    const sum = reviews.reduce((a, r) => a + (r.rating ?? 0), 0);
    const avg = count ? +(sum / count).toFixed(2) : 0;

    const h: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of reviews)
      h[(r.rating as 1 | 2 | 3 | 4 | 5) || 0] =
        (h[(r.rating as 1 | 2 | 3 | 4 | 5) || 0] || 0) + 1;

    return { avg, count, histogram: h };
  }, [reviews]);

  if (!reviews.length) return null;

  const seeAllHref = shopId
    ? `/shop/${shopId}/reviews?product=${productId}`
    : `/reviews?product=${productId}`; // fallback if you open it elsewhere

  return (
    <section className="px-4 py-5">
      {/* Header summary (compact) */}
      <div className="flex items-end gap-3">
        <div className="text-2xl font-semibold">{avg.toFixed(2)}★</div>
        <div className="text-sm text-neutral-500">
          {count} rating{count === 1 ? "" : "s"}
        </div>
      </div>

      {/* small bars 5→1 */}
      <div className="mt-3 space-y-1.5">
        {[5, 4, 3, 2, 1].map((k) => {
          const qty = histogram[k] || 0;
          const pct = count ? (qty / count) * 100 : 0;
          return (
            <div key={k} className="flex items-center gap-2">
              <div className="w-12 text-xs">{k} star</div>
              <div className="h-2 w-full rounded bg-neutral-200 overflow-hidden">
                <div
                  className="h-full bg-neutral-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-8 text-right text-xs text-neutral-500">
                {qty}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">Item reviews</h3>
        <Link href={seeAllHref} className="text-sm underline" prefetch={false}>
          See all reviews ({count})
        </Link>
      </div>

      {/* Horizontal, native scroll with snap */}
      <div className="-mx-4 mt-3 overflow-x-auto px-4">
        <ul className="flex gap-3 snap-x snap-mandatory">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="snap-start shrink-0 w-[85%] sm:w-[420px] rounded-xl border bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  {r.author || "Anonymous"}
                </span>
                <span className="text-xs text-neutral-500">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>

              {r.title && (
                <div className="mt-1 text-sm font-medium">{r.title}</div>
              )}

              <div className="mt-1 text-[13px] leading-relaxed line-clamp-4">
                {r.body}
              </div>

              <div className="mt-1 text-[13px]">
                <span className="text-yellow-500">
                  {"★★★★★".slice(0, r.rating ?? 0)}
                </span>
                <span className="text-neutral-300">
                  {"★★★★★".slice(r.rating ?? 0)}
                </span>
              </div>

              {r.photos?.length ? (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {r.photos.slice(0, 4).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-10 w-10 rounded object-cover border"
                    />
                  ))}
                  {r.photos.length > 4 && (
                    <div className="h-10 w-10 rounded border grid place-items-center text-xs text-neutral-600">
                      +{r.photos.length - 4}
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
