// components/BecomeSellerCTA.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function BecomeSellerCTA() {
  return (
    <section className="bg-[#0D5D4D] text-[#F6F3EC]">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-16 md:flex-row md:items-center md:justify-between md:py-20 lg:px-6">
        {/* Left: Copy + CTA */}
        <div className="max-w-xl">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-[52px]">
            Become a
            <br />
            seller
          </h2>

          <p className="mt-8 text-lg">Turn your craft into income.</p>

          <p className="mt-3 text-base leading-relaxed text-[#E9F0EA]">
            Create your shop, add your products, and
            <br />
            start selling to buyers across Morocco.
          </p>

          <Link
            href="/sell"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-[#F8EFD6] px-6 py-3 text-sm font-medium text-[#194338] shadow-sm transition hover:bg-[#F4E5BF]"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#194338] text-[#F8EFD6]">
              <ArrowRight size={16} />
            </span>
            <span>Start selling today</span>
          </Link>
        </div>

        {/* Right: Images / visual stack */}
        <div className="relative flex flex-1 items-center justify-center md:justify-end">
          {/* Center decorative outline star (placeholder shape) */}
          <div className="pointer-events-none absolute -bottom-14 left-1/2 hidden h-48 w-48 -translate-x-1/2 opacity-30 md:block">
            <div className="h-full w-full rounded-4xl border border-[#567B6A]" />
          </div>

          <div className="relative">
            {/* Main portrait image */}
            <div className="relative h-64 w-64 sm:h-72 sm:w-72">
              <Image
                src="/placeholder-seller.png" // replace later
                alt="Smiling Moroccan seller"
                fill
                className="object-cover"
              />
            </div>

            {/* Small kasbah / craft image */}
            <div className="absolute -bottom-8 -right-10 h-32 w-32 sm:h-36 sm:w-36">
              <Image
                src="/placeholder-kasbah.png" // replace later
                alt="Moroccan craft architecture"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
