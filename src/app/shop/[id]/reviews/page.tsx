// app/shop/[id]/reviews/page.tsx
"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Stars } from "@/components/reviews/Stars";
import { ReviewCard, Review } from "@/components/reviews/ReviewCard";

export default function ShopAllReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const shopId = (id ?? "").toString().trim();
  const search = useSearchParams();
  const productId = search.get("product");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      setLoading(true);

      let query = supabase
        .from("reviews")
        .select(
          `
          id, rating, title, body, photos, created_at, author, product_id,
          author_profile:profiles!left(id, name, role, phone, city)
        `,
          { count: "exact" }
        )
        .eq("shop_id", shopId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (productId) query = query.eq("product_id", productId);

      const { data, count: c, error } = await query;
      if (!error) {
        setReviews((data as any) ?? []);
        setCount(c ?? 0);
      }
      setLoading(false);
    })();
  }, [shopId, productId]);

  // avg + histogram derived from fetched rows
  const { avg, histogram } = useMemo(() => {
    const buckets: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let sum = 0;
    let n = 0;
    for (const r of reviews) {
      const rating = Number(r.rating ?? 0) as 0 | 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        buckets[rating] = (buckets[rating] || 0) + 1;
        sum += rating;
        n++;
      }
    }
    const avg = n ? sum / n : 0;
    return { avg, histogram: buckets };
  }, [reviews]);

  const backHref = productId ? `/product/${productId}` : `/shop/${shopId}`;
  const heading = productId ? "Item Reviews" : "Shop Reviews";

  return (
    <main className="p-4">
      <Link href={backHref} className="text-sm underline">
        ← Back
      </Link>

      <h1 className="mt-3 text-xl font-semibold">
        {heading} ({count})
      </h1>

      <div className="mt-2 flex items-center gap-3">
        <Stars value={avg} />
        <div className="text-sm text-muted-foreground">
          {avg.toFixed(2)} average
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {([5, 4, 3, 2, 1] as const).map((k) => {
          const qty = histogram[k] || 0;
          const pct = count ? (qty / count) * 100 : 0;
          return (
            <div key={k} className="flex items-center gap-3">
              <div className="w-12 text-sm">{k} star</div>
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-foreground"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-10 text-right text-sm">{qty}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : reviews.length ? (
          reviews.map((r) => <ReviewCard key={r.id} r={r} />)
        ) : (
          <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
            {productId
              ? "No reviews yet for this item."
              : "No reviews yet for this shop."}
          </div>
        )}
      </div>
    </main>
  );
}
