"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = {
  image: string; // image URL
  title: string;
  description?: string;
  // Optional small kicker/pill above title, or anything else you want to render:
  kicker?: string;
  // Optional custom node for the right-side content if you want full control:
  contentNode?: React.ReactNode;
};

type Props = {
  items: Item[];
  /** Sticky offset (px). Matches your header height if you have one */
  stickyOffset?: number; // e.g., 80 for a tall header
  /** Height of the sticky image area */
  viewportHeight?: number | string; // e.g., "75vh" or 640
  /** Enable debug outline */
  debug?: boolean;
};

export default function ScrollFadeSwap({
  items,
  stickyOffset = 80,
  viewportHeight = "75vh",
  debug = false,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRefs = useRef<HTMLDivElement[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Ensure we always have refs for each item
  sectionRefs.current = useMemo(
    () => Array(items.length).fill(null),
    [items.length]
  );

  useEffect(() => {
    if (!sectionRefs.current.length) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Use an IntersectionObserver tuned so the "most centered" section wins.
    // threshold ~ how much of the section is visible to count as active
    const threshold = prefersReducedMotion ? 0.3 : 0.6;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Among all intersecting entries, pick the one with the highest intersectionRatio
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const idx = Number((visible.target as HTMLElement).dataset.index);
          if (!Number.isNaN(idx)) setActiveIndex(idx);
        }
      },
      {
        // rootMargin lets a section become "active" slightly before/after it’s truly centered
        root: null,
        rootMargin: "0px 0px -20% 0px",
        threshold: Array.from({ length: 6 }, (_, i) => (i + 1) / 6).concat(
          0.01
        ),
      }
    );

    sectionRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [items.length]);

  return (
    <section
      className={`relative ${debug ? "outline outline-1 outline-rose-300" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* LEFT: Sticky image that cross-fades */}
          <div
            className="relative md:sticky top-0"
            style={{ top: stickyOffset }}
          >
            <div
              className={`
                relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white
                shadow-sm
              `}
              style={{
                height:
                  typeof viewportHeight === "number"
                    ? `${viewportHeight}px`
                    : viewportHeight,
              }}
            >
              {/* Stack of images */}
              {items.map((it, i) => (
                <div
                  key={i}
                  className={`
                    absolute inset-0 transition-opacity duration-700 ease-out
                    ${i === activeIndex ? "opacity-100" : "opacity-0"}
                  `}
                  aria-hidden={i !== activeIndex}
                >
                  {/* You can swap this <img> with next/image if you prefer */}
                  <img
                    src={it.image}
                    alt={it.title ?? `Slide ${i + 1}`}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Scrolling content blocks */}
          <div className="flex flex-col">
            {items.map((it, i) => (
              <div
                key={i}
                data-index={i}
                ref={(el) => {
                  if (el) sectionRefs.current[i] = el;
                }}
                className={`
                  relative scroll-mt-24
                  ${debug ? "outline outline-1 outline-blue-300" : ""}
                `}
              >
                <article className="py-16 md:py-24">
                  {/* Optional kicker */}
                  {it.kicker ? (
                    <div className="mb-3 inline-flex items-center rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur">
                      {it.kicker}
                    </div>
                  ) : null}

                  {/* Title */}
                  <h3
                    className={`
                      text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900
                      ${i === activeIndex ? "opacity-100" : "opacity-60"}
                      transition-opacity duration-500
                    `}
                  >
                    {it.title}
                  </h3>

                  {/* Body */}
                  {it.contentNode ? (
                    <div className="mt-4 text-neutral-700 leading-relaxed">
                      {it.contentNode}
                    </div>
                  ) : it.description ? (
                    <p className="mt-4 text-neutral-700 leading-relaxed">
                      {it.description}
                    </p>
                  ) : null}

                  {/* Divider between sections */}
                  {i < items.length - 1 && (
                    <div className="mt-12 h-px bg-neutral-200" />
                  )}
                </article>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
