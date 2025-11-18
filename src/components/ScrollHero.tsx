// components/ScrollHero.tsx
"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import HeroAmzy from "./HeroAmzy";

export default function ScrollHero() {
  const ref = useRef<HTMLDivElement | null>(null);

  // Scroll over this whole block (2x viewport height)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Hero zoom-out: from 1 → 0.9 as we scroll
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  // Manifesto card: starts below screen, slides up
  const cardY = useTransform(
    scrollYProgress,
    [0, 0.05, 0.18, 1],
    ["120%", "120%", "0%", "0%"]
  );

  return (
    <div className="relative bg-[#f6f3ec]">
      {/* Scroll region */}
      <div ref={ref} className="relative h-[200vh]">
        {/* Sticky hero: stays in place, only scales */}
        <section className="sticky top-0 h-screen overflow-hidden">
          {/* Background image + hero content that zooms out */}
          <motion.div
            style={{ scale: bgScale }}
            className="absolute inset-0 z-10"
          >
            <Image
              src="/landing/hero-amzy.png"
              alt="Amzy Hero"
              fill
              priority
              className="object-cover"
            />
            <HeroAmzy />
          </motion.div>

          {/* Manifesto card - comes from below, above hero */}
          <motion.div
            style={{ y: cardY }}
            className="
              absolute left-1/2 top-[100vh] z-20 w-full max-w-3xl 
              -translate-x-1/2 rounded-[32px] bg-white 
              border border-[#eee7de] px-6 py-10
            "
          >
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1 text-xs font-medium tracking-wide text-neutral-700">
                Our manifesto
              </span>
            </div>

            <p className="text-center text-sm text-neutral-600 leading-relaxed">
              In a time when everything is mass-produced, when speed replaces
              care…
            </p>

            <p className="mt-4 text-center text-sm text-neutral-600 leading-relaxed">
              Our stories are scattered across marketplaces, stripped of
              meaning.
            </p>

            <p className="mt-6 text-lg font-semibold text-center text-neutral-900">
              Welcome to amzy.
            </p>

            <div className="mt-7 flex items-center justify-center gap-5">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-neutral-100"></div>
              <div className="h-10 w-10 rounded-full bg-[#f5e1d3]"></div>
              <div className="h-12 w-12 overflow-hidden rounded-2xl bg-neutral-100"></div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
