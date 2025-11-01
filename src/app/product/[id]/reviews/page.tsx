"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Stars } from "@/components/reviews/Stars";
import { ReviewCard, Review } from "@/components/reviews/ReviewCard";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function ProductAllReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const productId = (id ?? "").toString().trim();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [withPhotos, setWithPhotos] = useState(false);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      let q = supabase
        .from("reviews")
        .select(
          `
          id, rating, title, body, photos, created_at, author,
          author_profile:profiles!left(id, name, role, phone, city)
        `,
          { count: "exact" }
        )
        .eq("product_id", productId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (withPhotos) q = q.not("photos", "eq", "{}");
      if (ratingFilter !== "all") q = q.eq("rating", ratingFilter);

      const { data, count: c } = await q;
      setReviews((data as any) ?? []);
      setCount(c ?? 0);

      const { data: ratings } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", productId)
        .eq("is_public", true);
      const arr = (ratings as { rating: number }[]) ?? [];
      const mean = arr.length
        ? arr.reduce((s, r) => s + Number(r.rating || 0), 0) / arr.length
        : 0;
      setAvg(mean);
    })();
  }, [productId, ratingFilter, withPhotos]);

  const histogram = useMemo(() => {
    const buckets: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    for (const r of reviews)
      buckets[r.rating as 1 | 2 | 3 | 4 | 5] =
        (buckets[r.rating as 1 | 2 | 3 | 4 | 5] || 0) + 1;
    return buckets;
  }, [reviews]);

  return (
    <main className="p-4">
      <Link href={`/product/${productId}`} className="text-sm underline">
        ← Back to product
      </Link>

      <h1 className="mt-3 text-xl font-semibold">Reviews ({count})</h1>
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

      <div className="mt-5 flex items-center gap-2">
        <Badge
          variant="secondary"
          className="cursor-pointer"
          onClick={() => setWithPhotos((v) => !v)}
        >
          {withPhotos ? "With photos ✓" : "With photos"}
        </Badge>
        <Select
          onValueChange={(v) =>
            setRatingFilter(v === "all" ? "all" : (Number(v) as any))
          }
          defaultValue="all"
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} stars
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 space-y-3">
        {reviews.map((r) => (
          <ReviewCard key={r.id} r={r} />
        ))}
        {!reviews.length && (
          <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
            No reviews match your filters.
          </div>
        )}
      </div>
    </main>
  );
}
