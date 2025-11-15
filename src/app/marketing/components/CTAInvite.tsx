// components/CTAInvite.tsx
"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";

/**
 * CTAInvite
 * - Floating hero images (woman + architecture)
 * - Infinite horizontal slider at the bottom
 * - Uses only Tailwind + Framer Motion
 *
 * Place /become.svg in your public/ folder (public/become.svg).
 * Replace the placeholder image URLs with your assets when ready.
 */

const SLIDER_IMAGES = [
  "https://images.unsplash.com/photo-1601933470928-c1c54b5b10f2?q=80&w=1000&auto=format&fit=crop", // pottery
  "https://images.unsplash.com/photo-1544033527-b192daee1f2a?q=80&w=1000&auto=format&fit=crop", // silver jewelry
  "https://images.unsplash.com/photo-1562261240-1d9c2b2c2b9e?q=80&w=1000&auto=format&fit=crop", // rugs
  "https://images.unsplash.com/photo-1542042161784-26ab9e041e89?q=80&w=1000&auto=format&fit=crop", // leather
  "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9b?q=80&w=1000&auto=format&fit=crop", // ceramics
  "https://images.unsplash.com/photo-1601571116925-3b8f24f1525c?q=80&w=1000&auto=format&fit=crop", // textiles
];

export default function CTAInvite() {
  // Duplicate array for seamless looping
  const track = React.useMemo(() => [...SLIDER_IMAGES, ...SLIDER_IMAGES], []);

  return (
    <section className="relative overflow-hidden bg-[#F6F3EC] py-20">
      {/* subtle gradient wash */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,#ffffff40,transparent_70%)]" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 lg:gap-20">
        {/* Left — copy */}
        <div className="relative z-10">
          <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm">
            Sell what you make
          </span>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#0B1020] sm:text-5xl">
            Open your Zaha shop in minutes.
          </h2>
          <p className="mt-4 max-w-prose text-neutral-700">
            Join Morocco’s marketplace for handmade, vintage, and unique goods.
            List your products, get discovered by local buyers, and grow with
            tools built for artisans—not engineers.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sell"
              className="inline-flex items-center justify-center rounded-xl bg-[#0D5D4D] px-5 py-3 text-white shadow-sm hover:bg-[#0b4d40] focus:outline-none"
            >
              Open your shop
            </Link>
            <Link
              href="/help/selling"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-5 py-3 text-[#0B1020] hover:bg-neutral-50"
            >
              Learn more
            </Link>
          </div>

          {/* Trust row */}
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
            <span className="rounded-full bg-white px-3 py-1">
              No monthly fees
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              Payouts to MA banks
            </span>
            <span className="rounded-full bg-white px-3 py-1">
              Reviews & protection
            </span>
          </div>
        </div>

        {/* Right — illustration stack */}
        <div className="relative">
          {/* Main SVG */}
          <div className="relative z-10">
            <Image
              src="/become.svg"
              alt="Become a seller"
              width={900}
              height={900}
              className="w-full"
              priority
            />
          </div>

          {/* Floating woman */}
          <motion.img
            src="https://images.unsplash.com/photo-1582582429416-b4f3c8c11039?q=80&w=900&auto=format&fit=crop"
            alt="Moroccan artisan"
            className="absolute -left-6 -top-10 hidden w-36 rounded-2xl border border-black/10 shadow-xl sm:block md:-left-10 md:w-44 lg:-left-16 lg:w-52"
            initial={{ y: 0, rotate: -2, opacity: 0 }}
            animate={{ y: [0, -10, 0], rotate: -2, opacity: 1 }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating riad/arch */}
          <motion.img
            src="https://images.unsplash.com/photo-1589308078054-832c8f9f1fcd?q=80&w=900&auto=format&fit=crop"
            alt="Moorish arch"
            className="absolute -right-4 top-4 hidden w-32 rounded-2xl border border-black/10 shadow-xl sm:block md:-right-8 md:w-40 lg:-right-14 lg:w-48"
            initial={{ y: 0, rotate: 2, opacity: 0 }}
            animate={{ y: [0, 12, 0], rotate: 2, opacity: 1 }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Infinite slider (bottom) */}
      <div className="relative mt-16">
        {/* gradient masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#F6F3EC] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#F6F3EC] to-transparent" />

        <div className="overflow-hidden">
          <motion.div
            className="flex gap-4"
            // animate from 0 -> -50% -> 0 to create seamless loop with duplicated track
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 20, ease: "linear", repeat: Infinity }}
            style={{ willChange: "transform" }}
          >
            {track.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative h-28 w-[220px] shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-white"
              >
                {/* image */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </motion.div>
        </div>

        {/* captions */}
        <div className="mx-auto mt-6 max-w-7xl px-6">
          <p className="text-center text-sm text-neutral-600">
            Featured: pottery · silver jewelry · textiles · rugs · ceramics ·
            leather
          </p>
        </div>
      </div>
    </section>
  );
}
