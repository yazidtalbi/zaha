"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Link from "next/link";
import { useEffect, useState } from "react";

type Slide = {
  img: string; // image url (/banners/1.jpg or Supabase public URL)
  title: string; // headline
  ctaLabel?: string;
  ctaHref?: string;
  align?: "start" | "center" | "end"; // overlay alignment
};

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [selected, setSelected] = useState(0);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false },
    [Autoplay({ delay: 3500, stopOnInteraction: false })]
  );

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi]);

  return (
    <div className="embla px-4">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {slides.map((s, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%] relative">
              <div className="relative h-48">
                <img
                  src={s.img}
                  alt={s.title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                <div
                  className={`absolute inset-0 bg-black/35 p-4 flex ${
                    s.align === "start"
                      ? "items-start justify-start"
                      : s.align === "end"
                      ? "items-end justify-end"
                      : "items-end justify-start"
                  }`}
                >
                  <div>
                    <h2 className="text-white text-lg font-semibold leading-snug">
                      {s.title}
                    </h2>
                    {s.ctaHref && s.ctaLabel && (
                      <Link
                        href={s.ctaHref}
                        className="mt-2 inline-block bg-white text-black px-4 py-1 rounded-full text-sm"
                      >
                        {s.ctaLabel}
                      </Link>
                    )}
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
