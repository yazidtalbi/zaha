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

function formatCount(n: number) {
  if (n >= 1_000_000)
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return `${n}`;
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function Stars({ value }: { value: number | null }) {
  const v = Math.max(0, Math.min(5, value ?? 0));
  return (
    <span className="tracking-[2px] text-[18px] leading-none">
      <span className="text-amber-500">{"★★★★★".slice(0, v)}</span>
      <span className="text-neutral-300">{"★★★★★".slice(v)}</span>
    </span>
  );
}

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
  const { avg, count } = useMemo(() => {
    const count = reviews.length;
    const sum = reviews.reduce((a, r) => a + (r.rating ?? 0), 0);
    const avg = count ? +(sum / count).toFixed(2) : 0;
    return { avg, count };
  }, [reviews]);

  const seeAllHref = shopId
    ? `/shop/${shopId}/reviews?product=${productId}`
    : `/reviews?product=${productId}`;

  // -------- Lightbox controls --------
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

  if (!reviews.length) return null;

  return (
    <section className=" py-3">
      {/* ===== Header summary (matches mock) ===== */}
      <div className="flex items-center justify-between">
        <div className="  items-baseline gap-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl leading-none font-semibold">
              {avg.toFixed(2)}
            </div>
            <div className="text-2xl leading-none text-amber-500">★</div>
          </div>
          <div className="text-neutral-500 text-md">
            {formatCount(count)} rating{count === 1 ? "" : "s"}
          </div>
        </div>

        <Link
          href={seeAllHref}
          prefetch={false}
          className="rounded-full border-2 border-black px-4 py-1 text-sm     font-semibold"
        >
          All reviews
        </Link>
      </div>

      {/* ===== Horizontal strip ===== */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4">
        <ul className="flex gap-4 snap-x snap-mandatory">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="snap-start shrink-0 w-[92%] sm:w-[520px] rounded-lg bg-white p-4   border border-neutral-200 cursor-pointer"
              onClick={() => setOpenReview(r)} // open sheet when card clicked
            >
              {/* Stars + date (top line) */}
              <div className="flex items-center justify-between">
                <Stars value={r.rating} />
                <span className="text-sm text-neutral-500">
                  {formatDate(r.created_at)}
                </span>
              </div>

              <p className="text-md leading-7 font-semibold text-neutral-900 mt-3">
                {r.body}
              </p>

              {/* Thumb + body */}
              <div className="mt-3 flex gap-3 items-start">
                {r.photos?.length ? (
                  <button
                    type="button"
                    className="relative h-16 w-16 rounded-xl overflow-hidden border border-neutral-200 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox({
                        photos: r.photos!,
                        index: 0,
                        originReviewId: r.id,
                      });
                    }}
                  >
                    {/* square image */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.photos[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="h-16 w-16 rounded-xl border border-dashed border-neutral-200 shrink-0" />
                )}
              </div>

              {/* Author */}
              <div className="mt-6 text-[15px] text-neutral-400 font-medium">
                {r.author || "Anonymous"}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ===== Sheet: Full Review ===== */}
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
                    {formatDate(openReview.created_at)}
                  </span>
                </SheetTitle>
                <SheetDescription className="mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {openReview.author || "Anonymous"}
                    </span>
                    <Stars value={openReview.rating} />
                  </div>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 text-[15px] leading-7 whitespace-pre-wrap">
                {openReview.body}
              </div>

              {openReview.photos?.length ? (
                <div className="mt-5 grid grid-cols-3 gap-2">
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
                      className="relative aspect-square overflow-hidden rounded-xl border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* ===== Dialog: Fullscreen Lightbox ===== */}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
