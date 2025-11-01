"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import useEmblaCarousel from "embla-carousel-react";
import Link from "next/link";
import { Stars } from "./Stars";
import { ReviewCard, Review } from "./ReviewCard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export default function ProductReviewsStrip({
  productId,
  shopId,
}: {
  productId: string;
  shopId: string;
}) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
  });

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Review | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [count, setCount] = useState(0);
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      const { data: list, count: total } = await supabase
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
        .order("created_at", { ascending: false })
        .limit(12);

      setReviews((list as any) ?? []);
      setCount(total ?? 0);

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
  }, [productId]);

  const onOpen = (r: Review) => {
    setSelected(r);
    setOpen(true);
  };

  return (
    <section className="mt-8 rounded-2xl border bg-background p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-end gap-3">
          <div className="text-3xl font-semibold">
            {count ? avg.toFixed(2) : "—"}
          </div>
          <Stars value={avg} />
          <div className="text-sm text-muted-foreground">
            {count} {count === 1 ? "rating" : "ratings"}
          </div>
        </div>
        <Link
          href={`/product/${productId}/reviews`}
          className="text-sm underline"
        >
          See all reviews
        </Link>
      </div>

      {count === 0 ? (
        <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          No reviews yet — be the first to review this item.
        </div>
      ) : (
        <div className="mt-5" ref={emblaRef}>
          <div className="flex gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="min-w-[85%] sm:min-w-[380px]">
                <ReviewCard r={r} onClick={() => onOpen(r)} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-auto">
          <SheetHeader>
            <SheetTitle>Review</SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {selected.author_profile?.name ?? "Verified buyer"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(selected.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-2">
                <Stars value={selected.rating} />
              </div>
              {selected.title && (
                <div className="mt-2 font-medium">{selected.title}</div>
              )}
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                {selected.body}
              </p>
              {!!selected.photos?.length && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {selected.photos.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt="review photo"
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              <div className="mt-6">
                <Link href={`/product/${productId}/reviews`}>
                  <Button className="w-full">See all reviews</Button>
                </Link>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </section>
  );
}
