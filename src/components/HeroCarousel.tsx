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

  // Optional per-slide styling
  textColor?: string; // title color (default: white)
  ctaBg?: string; // CTA background (default: white)
  ctaTextColor?: string; // CTA text color (default: near-black)
  align?: "start" | "center" | "end"; // keeps API parity, used for text block alignment
};

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [selected, setSelected] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [
      Autoplay({
        delay: 5500, // smoother + premium feel
        stopOnInteraction: false,
      }),
    ]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi]);

  return (
    <div className="embla ">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex ">
          {slides.map((s, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%] px-2">
              {/* Banner surface */}
              <div
                className="relative h-36 sm:h-56 md:h-64 rounded-2xl overflow-hidden"
                style={{ backgroundColor: s.bg ?? "#1E1724" }} // default deep purple
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
                      <h2
                        className="text-xl sm:text-2xl md:text-3xl font-medium leading-tight max-w-md"
                        style={{ color: s.textColor ?? "#FFFFFF" }}
                      >
                        {s.title}
                      </h2>

                      {s.ctaHref && s.ctaLabel && (
                        <Link
                          href={s.ctaHref}
                          className="mt-3 inline-block rounded-full px-4 py-2 text-sm font-semibold"
                          style={{
                            backgroundColor: s.ctaBg ?? "#FFFFFF",
                            color: s.ctaTextColor ?? "#050608",
                          }}
                        >
                          {s.ctaLabel}
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Visual column */}
                  <div className="col-span-5 sm:col-span-5 md:col-span-6 relative h-full">
                    {/* Your PNG (photo + star shape baked in) */}
                    <div className="absolute right-0 bottom-0   ">
                      <div className="relative h-32 ">
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
