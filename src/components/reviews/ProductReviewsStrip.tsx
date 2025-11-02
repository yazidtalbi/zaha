// components/reviews/ProductReviewStrip.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

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
  shopId,
}: {
  productId: string;
  shopId?: string | null;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [openReview, setOpenReview] = useState<Review | null>(null);

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    photos: string[];
    index: number;
    originReviewId?: string;
  } | null>(null);

  // Fetch reviews
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

  // Summary
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

  const seeAllHref = shopId
    ? `/shop/${shopId}/reviews?product=${productId}`
    : `/reviews?product=${productId}`;

  // -------- Lightbox controls (hooks must be unconditional) --------
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const next = useCallback(() => {
    setLightbox((lb) =>
      lb ? { ...lb, index: (lb.index + 1) % lb.photos.length } : lb
    );
  }, []);
  const prev = useCallback(() => {
    setLightbox((lb) =>
      lb
        ? { ...lb, index: (lb.index - 1 + lb.photos.length) % lb.photos.length }
        : lb
    );
  }, []);

  // Keyboard handlers for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, closeLightbox, next, prev]);

  // Now it's safe to early return (after all hooks)
  if (!reviews.length) return null;

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
              className="snap-start shrink-0 w-[85%] sm:w-[420px] rounded-xl border bg-white p-3 cursor-pointer"
              onClick={() => setOpenReview(r)} // open sheet when card clicked
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
                      onClick={(e) => {
                        e.stopPropagation(); // don’t open the sheet
                        setLightbox({
                          photos: r.photos!,
                          index: i,
                          originReviewId: r.id,
                        });
                      }}
                    />
                  ))}
                  {r.photos.length > 4 && (
                    <button
                      type="button"
                      className="h-10 w-10 rounded border grid place-items-center text-xs text-neutral-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightbox({
                          photos: r.photos!,
                          index: 4,
                          originReviewId: r.id,
                        });
                      }}
                    >
                      +{r.photos.length - 4}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {/* ---------------- Sheet: Full Review ---------------- */}
      <Sheet
        open={!!openReview}
        onOpenChange={(o) => !o && setOpenReview(null)}
      >
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto p-0">
          {openReview && (
            <div className="p-4">
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <span>{openReview.title || "Review"}</span>
                  <span className="text-xs font-normal text-neutral-500">
                    {new Date(openReview.created_at).toLocaleDateString()}
                  </span>
                </SheetTitle>
                <SheetDescription className="mt-1">
                  <span className="text-sm font-medium">
                    {openReview.author || "Anonymous"}
                  </span>
                  <div className="text-[13px] mt-1">
                    <span className="text-yellow-500">
                      {"★★★★★".slice(0, openReview.rating ?? 0)}
                    </span>
                    <span className="text-neutral-300">
                      {"★★★★★".slice(openReview.rating ?? 0)}
                    </span>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-3 text-[14px] leading-relaxed whitespace-pre-wrap">
                {openReview.body}
              </div>

              {openReview.photos?.length ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {openReview.photos.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        setLightbox({
                          photos: openReview.photos!,
                          index: i,
                          originReviewId: openReview.id,
                        })
                      }
                      className="relative aspect-square overflow-hidden rounded border"
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ---------------- Dialog: Fullscreen Lightbox ---------------- */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && closeLightbox()}>
        <DialogContent className="p-0 w-screen max-w-none h-screen bg-black/95 border-none">
          {lightbox && (
            <div className="relative h-full w-full">
              {/* Close */}
              <button
                onClick={closeLightbox}
                className="absolute top-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-white" />
              </button>

              {/* Prev / Next */}
              {lightbox.photos.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
                    aria-label="Previous"
                  >
                    <ChevronLeft className="h-6 w-6 text-white" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 hover:bg-black/80"
                    aria-label="Next"
                  >
                    <ChevronRight className="h-6 w-6 text-white" />
                  </button>
                </>
              )}

              {/* Image */}
              <div className="h-full w-full grid place-items-center">
                <img
                  src={lightbox.photos[lightbox.index]}
                  alt=""
                  className="max-h-[90vh] max-w-[90vw] object-contain select-none"
                  draggable={false}
                  onClick={next}
                />
              </div>

              {/* Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm z-20">
                {lightbox.index + 1} / {lightbox.photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
