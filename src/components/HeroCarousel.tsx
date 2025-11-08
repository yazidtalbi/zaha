// components/HeroCarousel.tsx
"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import { useEffect, useState } from "react";

/* ---------------- Types ---------------- */
type Slide = {
  img: string; // main product/visual image (public URL or /path)
  title: string; // headline
  ctaLabel?: string; // optional CTA label
  ctaHref?: string; // optional CTA href
  bg?: string; // slide background (e.g. "#285847")
  accent?: string; // star shape color (e.g. "#F29B57")
  align?: "start" | "center" | "end"; // keeps API parity, used for text block alignment
};

/* 8-point star made from two overlapping squares */
function EightPointStar({ color }: { color: string }) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0" style={{ backgroundColor: color }} />
      <div
        className="absolute inset-0 rotate-45"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [selected, setSelected] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [Autoplay({ delay: 1113500, stopOnInteraction: false })]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi]);

  return (
    <div className="embla">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {slides.map((s, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              {/* Banner surface */}
              <div
                className="relative h-36 sm:h-56 md:h-64 rounded-2xl overflow-hidden"
                style={{ backgroundColor: s.bg ?? "#2F5E52" }} // default deep green
              >
                {/* Content grid */}
                <div className="absolute inset-0 grid grid-cols-12 items-center">
                  {/* Text column */}
                  <div
                    className={[
                      "col-span-7 sm:col-span-7 md:col-span-6",
                      "h-full flex",
                      s.align === "start"
                        ? "items-start"
                        : s.align === "end"
                          ? "items-end"
                          : "items-center",
                    ].join(" ")}
                  >
                    <div className="p-5 sm:p-6 md:p-8">
                      <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-medium leading-tight max-w-md">
                        {s.title}
                      </h2>

                      {s.ctaHref && s.ctaLabel && (
                        <Link
                          href={s.ctaHref}
                          className="mt-3 inline-block bg-white text-black px-4 py-2 rounded-full text-sm font-semibold"
                        >
                          {s.ctaLabel}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Visual column */}
                  <div className="col-span-5 sm:col-span-5 md:col-span-6 relative h-full">
                    {/* Star shape */}
                    <div className="absolute right-4 sm:right-6 md:right-10 top-1/2 -translate-y-1/2 w-32 h-32 sm:w-40 sm:h-40 md:w-56 md:h-56">
                      <EightPointStar color={s.accent ?? "#F29B57"} />
                    </div>

                    {/* Product image on top of star */}
                    <div className="absolute right-2 sm:right-4 md:right-10 top-1/2 -translate-y-1/2">
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-md">
                        <img
                          src={s.img}
                          alt={s.title}
                          className="w-full h-full object-cover select-none"
                          draggable={false}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional dark overlay for contrast — tweak if needed */}
                {/* <div className="absolute inset-0 bg-black/0" /> */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-1 justify-center mt-2">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              selected === i ? "w-6 bg-black/80" : "w-2 bg-black/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
