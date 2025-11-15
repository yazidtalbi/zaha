"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * StickyImageScroll
 * ------------------------------------------------------
 * A two‑column section:
 *  • Left: sticky image that cross‑fades as the right content scrolls
 *  • Right: stacked content sections that slide in/out as you scroll
 *
 * Drop‑in usage (Next.js App Router):
 *   import StickyImageScroll from "./StickyImageScroll";
 *   <StickyImageScroll items={[{ image:"/img/1.jpg", kicker:"Made by hand", title:"Craft that lasts", body:"…" }, …]} />
 *
 * Dependencies: framer-motion, tailwindcss (for styles)
 */

export type StickyItem = {
  image: string; // URL for the image shown on the left
  title: string;
  body?: string;
  kicker?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function StickyImageScroll({
  items,
  className = "",
  stickyHeight = 720, // px height of the sticky viewport on desktop
  mobileStack = true,
}: {
  items: StickyItem[];
  className?: string;
  stickyHeight?: number;
  /** On mobile, stack image above content instead of two columns. */
  mobileStack?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // IntersectionObserver to track which section is most visible
  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (!sections.length) return;

    const opts: IntersectionObserverInit = {
      root: null,
      // Trigger when 35% of a section is visible; tweak to taste
      threshold: [0, 0.35, 0.51, 0.75, 1],
    };

    const observer = new IntersectionObserver((entries) => {
      // Pick the entry with largest intersectionRatio
      const mostVisible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (mostVisible) {
        const idx = sections.indexOf(mostVisible.target as HTMLElement);
        if (idx !== -1) setActive(idx);
      }
    }, opts);

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items?.length]);

  const safeItems = useMemo(() => items ?? [], [items]);

  return (
    <section
      ref={containerRef}
      className={
        "relative w-full " + (className || "bg-[#F6F3EC] py-24 sm:py-28")
      }
    >
      <div
        className={
          "mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 md:grid-cols-2 md:gap-12 lg:gap-16"
        }
      >
        {/* LEFT: Sticky image area */}
        <div
          className={mobileStack ? "md:sticky md:top-16" : "sticky top-16"}
          style={{ height: mobileStack ? undefined : stickyHeight }}
        >
          <div
            className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm md:h-[720px] md:aspect-auto"
            style={{ height: mobileStack ? undefined : stickyHeight }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {safeItems.map((it, i) => (
                <motion.img
                  key={i + it.image}
                  src={it.image}
                  alt={it.title}
                  className={
                    "absolute inset-0 h-full w-full object-cover " +
                    (i === active ? "" : "pointer-events-none")
                  }
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: i === active ? 1 : 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>

            {/* Subtle gradient overlay for text legibility if you place captions on image */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          {/* Progress dots (desktop) */}
          <div className="mt-4 hidden items-center gap-2 md:flex">
            {safeItems.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const target = sectionRefs.current[i];
                  if (target)
                    target.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    });
                }}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  i === active ? "bg-black w-6" : "bg-black/20"
                }`}
                aria-label={`Go to ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Scrollable content sections */}
        <div className="space-y-16">
          {safeItems.map((it, i) => (
            <article
              key={i + it.title}
              ref={(el) => (sectionRefs.current[i] = el)}
              className="scroll-mt-24"
            >
              <motion.span
                className="text-xs uppercase tracking-wider text-neutral-500"
                initial={{ opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.4 }}
              >
                {it.kicker}
              </motion.span>

              <motion.h3
                className="mt-2 text-2xl font-semibold text-neutral-900 md:text-3xl"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: 0.05 }}
              >
                {it.title}
              </motion.h3>

              {it.body && (
                <motion.p
                  className="mt-3 text-neutral-700 leading-relaxed"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                >
                  {it.body}
                </motion.p>
              )}

              {it.ctaLabel && it.ctaHref && (
                <motion.a
                  href={it.ctaHref}
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-neutral-50"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.35, delay: 0.15 }}
                >
                  {it.ctaLabel}
                </motion.a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Example data (remove in production)
 */
export const demoItems: StickyItem[] = [
  {
    image: "/placeholders/zaha-1.jpg",
    kicker: "Handmade • Morocco",
    title: "Craft that feels personal",
    body: "Every piece on Zaha is made or curated by an artisan. Discover one‑of‑one goods with a story behind them.",
    ctaLabel: "Shop new arrivals",
    ctaHref: "/new",
  },
  {
    image: "/placeholders/zaha-2.jpg",
    kicker: "Natural Materials",
    title: "Terracotta, cedar, wool & more",
    body: "From cedar wood to Beni Ourain wool, find timeless materials shaped by skilled hands.",
    ctaLabel: "Explore home & living",
    ctaHref: "/c/home",
  },
  {
    image: "/placeholders/zaha-3.jpg",
    kicker: "Direct From Makers",
    title: "Support local workshops",
    body: "Your purchase goes to real people and their craft—keeping traditions alive.",
    ctaLabel: "Meet verified shops",
    ctaHref: "/shops",
  },
];

/** Quick demo usage
 *
 * <StickyImageScroll items={demoItems} />
 */
