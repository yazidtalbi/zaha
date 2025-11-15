// components/ScreensOnScroll.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/** -----------------------------------------------------------
 *  Usage:
 *  <ScreensOnScroll
 *    items={[
 *      { image: "/screens/1.png", kicker: "Discover", title: "Handmade finds", body: "Browse curated Moroccan crafts and vintage gems." },
 *      { image: "/screens/2.png", kicker: "Sell", title: "Open your shop", body: "Create a shop in minutes. Get orders, not headaches." },
 *      { image: "/screens/3.png", kicker: "Trust", title: "Buy with confidence", body: "Verified shops, reviews, and secure contact exchange." },
 *    ]}
 *  />
 * ----------------------------------------------------------*/

type Item = {
  image: string;
  kicker?: string;
  title: string;
  body: string;
};

export default function ScreensOnScroll({
  items,
  className = "",
  leftWidth = "lg:w-[48%]",
  rightWidth = "lg:w-[52%]",
  topOffset = 96, // sticky offset in px (matches your header height if needed)
}: {
  items: Item[];
  className?: string;
  leftWidth?: string; // Tailwind width class for left (sticky) column on lg+
  rightWidth?: string; // Tailwind width class for right (content) column on lg+
  topOffset?: number;
}) {
  const [active, setActive] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ensure we always have the same array length for refs
  useEffect(() => {
    sectionRefs.current = sectionRefs.current.slice(0, items.length);
  }, [items.length]);

  // Intersection observer to detect which content block is "current"
  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const opts: IntersectionObserverInit = {
      root: null,
      rootMargin: "0px 0px -40% 0px", // favor the top half of viewport
      threshold: 0.35,
    };

    const handler = (entries: IntersectionObserverEntry[]) => {
      // Pick the most visible entry
      let topCandidate = { idx: active, ratio: 0 };
      entries.forEach((e) => {
        const idx = Number(e.target.getAttribute("data-idx") || 0);
        if (e.isIntersecting && e.intersectionRatio > topCandidate.ratio) {
          topCandidate = { idx, ratio: e.intersectionRatio };
        }
      });
      if (topCandidate.ratio > 0 && topCandidate.idx !== active) {
        setActive(topCandidate.idx);
      }
    };

    const io = new IntersectionObserver(handler, opts);
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items.length, active]);

  // Prevent layout shift by fixing a consistent aspect for the phone image area
  const aspect = useMemo(() => 100 / (19.5 / 9), []); // ~19.5:9 phone-ish

  return (
    <section
      ref={containerRef}
      className={[
        "w-full bg-[#F6F3EC]",
        "px-4 sm:px-6 lg:px-8",
        "py-16 sm:py-20 lg:py-28",
        className,
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl">
        <div className="lg:flex lg:gap-10">
          {/* LEFT: Sticky image stack */}
          <div
            className={["relative mb-10 lg:mb-0 lg:shrink-0", leftWidth].join(
              " "
            )}
          >
            <div className="sticky" style={{ top: topOffset }}>
              <div className="relative w-full rounded-2xl border border-black/10 bg-white p-2 shadow-sm">
                {/* Phone bezel / frame */}
                <div
                  className="relative w-full overflow-hidden rounded-xl bg-black/3"
                  style={{ paddingTop: `${aspect}%` }}
                >
                  {/* Cross-fade stack */}
                  <div className="absolute inset-0">
                    <AnimatePresence initial={false}>
                      {items.map((it, idx) => (
                        <motion.div
                          key={
                            idx === active
                              ? `img-${idx}-active`
                              : `img-${idx}-idle`
                          }
                          className="absolute inset-0"
                          initial={{ opacity: idx === active ? 0 : 0 }}
                          animate={{ opacity: idx === active ? 1 : 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                          style={{
                            pointerEvents: idx === active ? "auto" : "none",
                          }}
                        >
                          {/* next/image for perf */}
                          <Image
                            src={it.image}
                            alt={it.title}
                            fill
                            sizes="(max-width: 1024px) 100vw, 48vw"
                            className="object-cover"
                            priority={idx === 0}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Scrollable content */}
          <div className={["relative flex-1", rightWidth].join(" ")}>
            <ol className="space-y-24 sm:space-y-28">
              {items.map((it, idx) => (
                <li key={idx}>
                  <article
                    ref={(el) => (sectionRefs.current[idx] = el)}
                    data-idx={idx}
                    className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8 shadow-sm"
                  >
                    {it.kicker && (
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        {it.kicker}
                      </div>
                    )}
                    <h3 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                      {it.title}
                    </h3>
                    <p className="mt-3 text-neutral-700 leading-relaxed">
                      {it.body}
                    </p>

                    {/* Progress pills */}
                    <div className="mt-6 flex items-center gap-2">
                      {items.map((_, i) => (
                        <span
                          key={i}
                          className={[
                            "h-1.5 rounded-full transition-all",
                            i === active ? "w-10 bg-black" : "w-4 bg-black/20",
                          ].join(" ")}
                        />
                      ))}
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
