// components/reviews/ShopReviewsStrip.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { Stars } from "./Stars";
import { ReviewCard, Review } from "./ReviewCard";

export default function ShopReviewsStrip({ shopId }: { shopId: string }) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
  });

  const [reviews, setReviews] = useState<Review[]>([]);
  const [count, setCount] = useState(0);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!shopId) return;

    (async () => {
      // 1) Latest visible reviews (limit for strip)
      const { data: list, count: total } = await supabase
        .from("reviews")
        .select(
          `
          id, rating, title, body, photos, created_at, author,
          author_profile:profiles!left(id, name, role, phone, city)
        `,
          { count: "exact" }
        )
        .eq("shop_id", shopId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(12);

      setReviews((list as any) ?? []);
      setCount(total ?? 0);

      // 2) Average rating (simple client-side mean)
      const { data: ratings } = await supabase
        .from("reviews")
        .select("rating")
        .eq("shop_id", shopId)
        .eq("is_public", true);

      const arr = (ratings as { rating: number | null }[]) ?? [];
      const mean = arr.length
        ? arr.reduce((s, r) => s + Number(r.rating || 0), 0) / arr.length
        : 0;
      setAvg(mean);
    })();
  }, [shopId]);

  if (!count) return null;

  return (
    <section className="mt-8 rounded-2xl border bg-background p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-end gap-3">
          <div className="text-3xl font-semibold">{avg.toFixed(2)}</div>
          <Stars value={avg} />
          <div className="text-sm text-muted-foreground">{count} ratings</div>
        </div>
        <Link href={`/shop/${shopId}/reviews`} className="text-sm underline">
          See all reviews
        </Link>
      </div>

      <div className="mt-5" ref={emblaRef}>
        <div className="flex gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="min-w-[85%] sm:min-w-[380px]">
              {/* Your existing review card */}
              <ReviewCard r={r} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
