// components/HeroAmzy.tsx
"use client";

import Image from "next/image";
import { ArrowRight, Download } from "lucide-react";

export default function HeroAmzy() {
  return (
    <section className="min-h-full">
      {/* Huge soft AMZY.MA word in the back */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="select-none text-[18vw] font-semibold tracking-[0.3em] text-[#e6d4c6]/60 leading-none">
          AMZY.MA
        </span>
      </div>

      <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center gap-10 px-4 py-16 md:min-h-[80vh] md:flex-row md:gap-8 lg:gap-12">
        {/* Left: main heading */}
        <div className="w-full max-w-sm md:flex-1">
          <p className="mb-4 h-2 w-2 rounded-full bg-[#c89b72]" />
          <h1 className="text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
            Discover
            <br />
            products made
            <br />
            with <span className="font-serif italic">Soul</span>
          </h1>
        </div>

        {/* Center: phone image */}
        <div className="relative flex min-h-[260px] items-center justify-center md:flex-[1.2]">
          <div className="relative h-[320px] w-[180px] sm:h-[380px] sm:w-[210px] lg:h-[430px] lg:w-[240px]">
            <Image
              src="/placeholder-phone.png" // TODO: replace with your real hero phone image
              alt="Amzy app preview"
              fill
              className="object-contain drop-shadow-[0_32px_60px_rgba(0,0,0,0.35)]"
              priority
            />
          </div>
        </div>

        {/* Right: description + CTAs */}
        <div className="w-full max-w-sm md:flex-1">
          <p className="text-sm leading-relaxed text-neutral-800 sm:text-base">
            Connect with Morocco&apos;s most talented artisans and discover
            pieces you won&apos;t find anywhere else.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#23102f] px-5 py-2.5 text-sm font-medium text-white shadow-[0_14px_30px_rgba(0,0,0,0.35)] hover:bg-[#2d183b] transition-colors">
              <Download className="h-4 w-4" />
              <span>Install the App</span>
            </button>

            <button className="inline-flex items-center gap-1 text-sm font-medium text-neutral-900 hover:underline">
              <span>Learn more</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
