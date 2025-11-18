// app/marketing/page.tsx
"use client";

import Image from "next/image";
import {
  ArrowRight,
  Download,
  Instagram,
  Facebook,
  Twitter,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { motion } from "framer-motion";

/* ========= Auto-scrolling label rows ========= */

const ROW_1 = [
  "Artisans",
  "Vintage Collectors",
  "Jewelry Designers",
  "Artists & Illustrators",
  "Photography Artists",
  "Weavers",
];

const ROW_2 = [
  "Bag Makers",
  "Creative Entrepreneurs",
  "Small Businesses",
  "Fashion Designers",
  "Boutique Owners",
];

const ROW_3 = [
  "Independent Sellers",
  "Tailors",
  "Ceramic Artists",
  "Home Decor Makers",
  "Calligraphers",
];

type AutoRowProps = {
  labels: string[];
  reverse?: boolean;
  duration?: number;
};

function AutoScrollRow({ labels, reverse, duration = 26 }: AutoRowProps) {
  const items = [...labels, ...labels];

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex gap-3 py-2"
        animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{
          duration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {items.map((label, i) => (
          <span
            key={`${label}-${i}`}
            className="whitespace-nowrap rounded-full border border-[#f1d9c7]   px-4 py-1.5 text-lg font-normal text-neutral-800"
          >
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ========= Page ========= */

export default function MarketingPage() {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);

  const [windowHeight, setWindowHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  /* Measure layout */
  useEffect(() => {
    const measure = () => {
      setWindowHeight(window.innerHeight);
      setContentHeight(contentRef.current?.offsetHeight ?? 0);
      setFooterHeight(footerRef.current?.offsetHeight ?? 0);
    };

    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  /* Lenis smooth scroll */
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.3,
      easing: (x) => 1 - Math.pow(1 - x, 3),
      smoothWheel: true,
      smoothTouch: false,
    });

    lenis.on("scroll", (e: any) => {
      setScrollY(e.scroll);
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  /* Derived values */

  // Footer is fixed, so it should NOT add to scroll height
  const heightDocument = (windowHeight || 0) + (contentHeight || 0);

  const bgPosY = 50 - (scrollY * 100) / (heightDocument || 1);

  const footerBottom = scrollY >= footerHeight ? 0 : -(footerHeight || 300);

  const heroProgress = Math.min(scrollY / ((windowHeight || 1) * 0.8), 1);
  const heroScale = 1 - heroProgress * 0.15;
  const heroOpacity = Math.max(1 - heroProgress * 1.2, 0);

  return (
    <main className="bg-[#f6f3ec]  tracking-tight">
      <div
        id="scroll-animate"
        style={{
          overflow: "hidden",
          height: heightDocument || windowHeight || 0,
          position: "relative",
        }}
      >
        <div
          id="scroll-animate-main"
          style={{
            position: "relative",
            width: "100%",
            height: heightDocument || windowHeight || 0,
          }}
        >
          <div
            className="wrapper-parallax shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            style={{
              marginTop: windowHeight,
              marginBottom: footerHeight,
            }}
          >
            {/* ================= HERO ================= */}
            <header
              style={{
                width: "100%",
                height: windowHeight || 0,
                position: "fixed",
                top: 0,
                zIndex: 0,
                backgroundImage:
                  "linear-gradient(to bottom, #fbe8cf, #f4dff5, #f6f3ec)",
                backgroundPosition: `50% ${bgPosY}%`,
                backgroundSize: "cover",
              }}
            >
              {/* Soft texture image */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.18]">
                <Image
                  src="/landing/hero-amzy.png"
                  alt="Amzy hero background"
                  fill
                  className="object-cover"
                  priority
                />
              </div>

              {/* Hero content */}
              <div
                className="relative z-10 flex h-full items-center"
                style={{
                  transform: `scale(${heroScale})`,
                  opacity: heroOpacity,
                  transformOrigin: "center center",
                }}
              >
                <section className="relative w-full">
                  {/* Huge AMZY in back */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="select-none text-[18vw] font-semibold tracking-[0.3em] text-[#e6d4c6]/60 leading-none">
                      AMZY.MA
                    </span>
                  </div>

                  <div className="relative mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center gap-10 px-4 py-16 md:min-h-[80vh] md:flex-row md:gap-8 lg:gap-12">
                    {/* Left heading */}
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

                    {/* Phone mock placeholder */}
                    <div className="relative flex min-h-[260px] items-center justify-center md:flex-[1.2]">
                      <div className="relative h-[320px] w-[180px] sm:h-[380px] sm:w-[210px] lg:h-[430px] lg:w-[240px]">
                        <Image
                          src="/placeholder-phone.png"
                          alt="Amzy app preview"
                          fill
                          className="object-contain drop-shadow-[0_32px_60px_rgba(0,0,0,0.35)]"
                          priority
                        />
                      </div>
                    </div>

                    {/* Right content */}
                    <div className="w-full max-w-sm md:flex-1">
                      <p className="text-sm leading-relaxed text-neutral-800 sm:text-base">
                        Connect with Morocco&apos;s most talented artisans and
                        discover pieces you won&apos;t find anywhere else.
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
              </div>
            </header>

            {/* ================= WHITE SECTION ================= */}
            <section className="content relative z-1" ref={contentRef}>
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4   pb-32">
                {/* Manifesto card */}
                <div className="mx-auto w-full max-w-4xl rounded-xl bg-white border border-[#eee7de] py-10 shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
                  <div className="flex justify-center mb-6">
                    <span className="inline-flex items-center rounded-full border border-neutral-200   px-5 py-1.5 text-sm font-normal  tracking-tight text-neutral-700">
                      Our Manifesto
                    </span>
                  </div>
                  <div className=" max-w-xl mx-auto">
                    {" "}
                    <p className="font-normal text-2xl leading-relaxed text-center">
                      In a time when everything is mass-produced, when speed
                      replaces care, when creators are hidden behind algorithms
                      and noise, our craft has little space to live.
                    </p>
                    <p className="font-normal text-2xl leading-relaxed tracking-tight text-center mt-8 ">
                      Our stories are scattered across marketplaces, stripped of
                      meaning. What should have never been lost is now yours
                      again.
                    </p>
                    <p className="mt-8 text-lg font-semibold text-center text-neutral-900 sm:text-xl">
                      Welcome to amzy.
                    </p>
                  </div>

                  {/* Creator avatars row (placeholders) */}
                  <div className="mt-10 flex items-center justify-center gap-6">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-[#ffe6d7]" />
                    <div className="relative h-16 w-16 overflow-hidden rounded-full bg-[#f3d4ff]" />
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-[#ffe6d7]" />
                  </div>

                  {/* 4 feature cards */}
                  <div className="grid gap-6 md:grid-cols-2 px-12">
                    {/* Explore the market */}
                    <div className="rounded-[24px] bg-[#fff6ec] p-5">
                      <div className="mb-4 overflow-hidden rounded-[18px] bg-neutral-200">
                        <div className="aspect-[4/3] w-full bg-neutral-200" />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900 sm:text-base">
                        Explore the market
                      </h3>
                      <p className="mt-1 text-xs text-neutral-700 sm:text-sm">
                        Discover unique handmade pieces crafted with heart.
                      </p>
                    </div>

                    {/* Connect with makers */}
                    <div className="rounded-[24px] bg-[#f7f1ff] p-5">
                      <div className="mb-4 overflow-hidden rounded-[18px] bg-neutral-200">
                        <div className="aspect-[4/3] w-full bg-neutral-200" />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900 sm:text-base">
                        Connect with makers
                      </h3>
                      <p className="mt-1 text-xs text-neutral-700 sm:text-sm">
                        Talk directly with the people who create what you love.
                      </p>
                    </div>

                    {/* Manage your shop */}
                    <div className="rounded-[24px] bg-[#fff6ec] p-5">
                      <div className="mb-4 overflow-hidden rounded-[18px] bg-neutral-200">
                        <div className="aspect-[4/3] w-full bg-neutral-200" />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900 sm:text-base">
                        Manage your shop
                      </h3>
                      <p className="mt-1 text-xs text-neutral-700 sm:text-sm">
                        Keep your products and orders running smoothly.
                      </p>
                    </div>

                    {/* Grow your reputation */}
                    <div className="rounded-[24px] bg-[#f7f1ff] p-5">
                      <div className="mb-4 overflow-hidden rounded-[18px] bg-neutral-200">
                        <div className="aspect-[4/3] w-full bg-neutral-200" />
                      </div>
                      <h3 className="text-sm font-semibold text-neutral-900 sm:text-base">
                        Grow your reputation
                      </h3>
                      <p className="mt-1 text-xs text-neutral-700 sm:text-sm">
                        Earn trust with great service and real reviews.
                      </p>
                    </div>
                  </div>

                  {/* Marketplace + scrolling labels */}
                  <section className="flex flex-col gap-8">
                    <div className="text-center">
                      <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl pt-16">
                        A marketplace built for makers &amp; buyers
                      </h2>
                    </div>

                    <div className="space-y-2">
                      <AutoScrollRow
                        labels={ROW_1}
                        reverse={false}
                        duration={26}
                      />
                      <AutoScrollRow
                        labels={ROW_2}
                        reverse={true}
                        duration={30}
                      />
                      <AutoScrollRow
                        labels={ROW_3}
                        reverse={false}
                        duration={24}
                      />
                    </div>
                  </section>

                  {/* CTA Banner */}
                  <section className="mt-6 rounded-xl bg-gradient-to-r from-[#f4dff5] via-[#fbe8cf] to-[#f6f3ec]  mx-3">
                    <div className="flex flex-col gap-6 rounded-xl   px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-7">
                      {/* Text side */}
                      <div className="max-w-md">
                        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#8d4d7a]">
                          Explore handmade treasures
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-neutral-900 sm:text-2xl">
                          Turn your craft into income.
                        </h3>
                        <p className="mt-2 text-xs text-neutral-700 sm:text-sm">
                          Create your shop, add your products, and start selling
                          to buyers across Morocco.
                        </p>

                        <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#23102f] px-5 py-2.5 text-xs font-medium text-white shadow-[0_10px_24px_rgba(0,0,0,0.35)] hover:bg-[#2d183b] transition-colors">
                          <Download className="h-4 w-4" />
                          <span>Install the App now</span>
                        </button>
                      </div>

                      {/* Image placeholder side */}
                      <div className="relative flex justify-end sm:flex-1">
                        <div className="relative h-40 w-40 sm:h-48 sm:w-48 lg:h-56 lg:w-56 overflow-hidden rounded-[24px] bg-neutral-200">
                          {/* placeholder phone/person image */}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Footer mini */}
                  <section className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[#eee] pt-4 text-xs text-neutral-600 sm:flex-row">
                    <p>© 2026 Amzy</p>
                    <div className="flex items-center gap-4">
                      <button className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-900">
                        <Facebook className="h-4 w-4" />
                      </button>
                      <button className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-900">
                        <Twitter className="h-4 w-4" />
                      </button>
                      <button className="inline-flex items-center gap-1 text-xs text-neutral-700 hover:text-neutral-900">
                        <Instagram className="h-4 w-4" />
                      </button>
                      <span className="text-[10px] text-neutral-400">
                        TikTok
                      </span>
                    </div>
                  </section>
                </div>
              </div>
            </section>

            {/* ================= FOOTER (parallax reveal) ================= */}
            {/* <footer
              ref={footerRef}
              style={{
                width: "100%",
                height: 300,
                background: "#e5e5e5",
                position: "fixed",
                bottom: footerBottom,
                left: 0,
                zIndex: -1,
              }}
            >
              <div className="flex h-full items-center justify-center">
                <h2 className="text-xl font-semibold text-neutral-800">
                  Footer / next sections go here
                </h2>
              </div>
            </footer> */}
          </div>
        </div>
      </div>
    </main>
  );
}
