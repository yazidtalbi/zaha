// app/marketing/page.tsx
"use client";

import Image from "next/image";
import {
  ArrowRight,
  Download,
  Instagram,
  Facebook,
  Twitter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  style: ["italic"],
});

const BrandStar = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="24"
    height="24"
    viewBox="0 0 108 110"
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
  >
    <path d="M54.1416 0.291992L70.5439 16.6943H92.1592V38.8096L107.913 54.5645L107.991 54.6426L92.1592 70.4746V92.8408H70.5439L54.1416 109.243V109.535L53.9951 109.389L53.8496 109.535V109.243L37.4473 92.8408H15.832V70.4746L0 54.6426L0.078125 54.5645L15.832 38.8096V16.6943H37.4473L53.8496 0.291992V0L53.9951 0.145508L54.1416 0V0.291992Z" />
  </svg>
);

type AutoRowProps = {
  labels: string[];
  reverse?: boolean;
  duration?: number;
};

const LABEL_STYLES = [
  { border: "#f1d9c7", star: "#e06a35" }, // peach
  { border: "#f3d2c7", star: "#c85527" }, // terracotta
  { border: "#e3c7b3", star: "#77401e" }, // brown
  { border: "#e8d9ff", star: "#b38cff" }, // lilac
  { border: "#F7BFBF", star: "#EB5E5E" }, // red
];

function AutoScrollRow({ labels, reverse, duration = 26 }: AutoRowProps) {
  const items = [...labels, ...labels];

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex gap-3 py-1"
        animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {items.map((label, i) => {
          const style = LABEL_STYLES[i % LABEL_STYLES.length];

          return (
            <span
              key={`${label}-${i}`}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-1 text-sm sm:text-base md:text-lg font-normal text-neutral-900"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: style.border,
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center"
                style={{ color: style.star }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 108 110"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M54.1416 0.291992L70.5439 16.6943H92.1592V38.8096L107.913 54.5645L107.991 54.6426L92.1592 70.4746V92.8408H70.5439L54.1416 109.243V109.535L53.9951 109.389L53.8496 109.535V109.243L37.4473 92.8408H15.832V70.4746L0 54.6426L0.078125 54.5645L15.832 38.8096V16.6943H37.4473L53.8496 0.291992V0L53.9951 0.145508L54.1416 0V0.291992Z" />
                </svg>
              </span>

              <span>{label}</span>
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ========= Reveal helpers ========= */

const EASE: [number, number, number, number] = [0.19, 1, 0.22, 1];

type RevealOnScrollProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

function RevealOnScroll({
  children,
  delay = 0,
  className,
}: RevealOnScrollProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px" }}
      transition={{ duration: 0.75, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* ========= Page ========= */

export default function MarketingPage() {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [windowHeight, setWindowHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  /* Measure layout */
  useEffect(() => {
    const measure = () => {
      setWindowHeight(window.innerHeight);
      setContentHeight(contentRef.current?.offsetHeight ?? 0);
    };

    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  /* Native scroll listener */
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY || window.pageYOffset || 0);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Derived values */

  const heightDocument = (windowHeight || 0) + (contentHeight || 0);
  const bgPosY = 50 - (scrollY * 100) / (heightDocument || 1);

  const heroProgress = Math.min(scrollY / ((windowHeight || 1) * 0.8), 1);
  const heroScale = 1 - heroProgress * 0.15;
  const heroOpacity = Math.max(1 - heroProgress * 1.2, 0);

  const imageOffset = heroProgress * 28;
  const contentOffset = -heroProgress * 20;

  return (
    <main className="min-h-screen bg-[#f6f3ec] tracking-tight">
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
              marginBottom: 0,
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
                backgroundImage: "linear-gradient(to bottom, #FEF8EB, #F5E8FB)",
                backgroundPosition: `50% ${bgPosY}%`,
                backgroundSize: "cover",
              }}
            >
              {/* Huge AMZY.MA */}
              <div
                className="pointer-events-none absolute inset-x-0 top-4 flex justify-center"
                style={{
                  transform: `scale(${heroScale})`,
                  opacity: heroOpacity,
                  transformOrigin: "center top",
                }}
              >
                <span className="select-none text-[26vw] sm:text-[20vw] md:text-[20vw] font-bold leading-none text-[#F2E4D9]">
                  AMZY.MA
                </span>
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
                <motion.section
                  className="relative h-full w-full"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
                >
                  {/* Hand + phone anchored near bottom (Klarna style on mobile, original size on desktop) */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center md:inset-0 md:items-center"
                    style={{
                      transform: `translateY(${imageOffset}px)`,
                      transformOrigin: "center bottom",
                    }}
                  >
                    <motion.div
                      className="
      relative 
      w-full 
      max-w-sm 
      h-[55vh] 
      md:max-w-none 
      md:h-full
    "
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 3, ease: EASE, delay: 0.15 }}
                    >
                      <Image
                        src="/landing/caftan-blur.png"
                        alt="Amzy app in hand"
                        fill
                        className="object-contain object-bottom md:object-contain"
                        priority
                      />
                    </motion.div>
                  </div>

                  {/* Foreground text + CTA (stays above, like Klarna) */}
                  <div
                    className="mt-24 relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center gap-10 px-4 pt-24 pb-[34vh] sm:pt-28 sm:pb-[36vh] md:flex-row md:items-center md:justify-end md:gap-12 md:px-8 lg:px-12 md:pb-24"
                    style={{
                      transform: `translateY(${contentOffset}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    {/* Left block */}
                    <div className="w-full max-w-sm text-center md:flex-1 ">
                      <motion.div
                        className="mx-auto mb-4 flex items-center justify-center sm:mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
                      >
                        <BrandStar className="h-8 w-8 text-[#C9B6A6] sm:h-10 sm:w-10" />
                      </motion.div>

                      <motion.h1
                        className="text-[2.1rem] sm:text-[2.6rem] md:text-[2.8rem] font-semibold leading-tight text-neutral-900"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
                      >
                        Discover
                        <br />
                        products made
                        <br />
                        with{" "}
                        <span className={`${playfair.className} italic`}>
                          Soul
                        </span>
                      </motion.h1>
                    </div>

                    {/* Spacer center on desktop */}
                    <div className="hidden flex-1 md:block" />

                    {/* Right copy + CTA */}
                    <motion.div
                      className="w-full max-w-xs text-center md:flex-1"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.85, ease: EASE, delay: 0.4 }}
                    >
                      <p className="text-base sm:text-lg leading-relaxed text-neutral-900">
                        Connect with Morocco&apos;s{" "}
                        <br className="hidden sm:block" />
                        most talented artisans & discover pieces you won&apos;t
                        find anywhere else.
                      </p>

                      <motion.div
                        className="mt-5 flex flex-col items-center justify-center gap-2 sm:mt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
                      >
                        <button
                          onClick={() =>
                            window.dispatchEvent(new Event("amzy-install-pwa"))
                          }
                          className="inline-flex items-center gap-2 rounded-full bg-[#23102f] px-5 py-2.5 text-sm sm:text-base font-medium text-white"
                        >
                          <Download className="h-4 w-4" />
                          <span>Install now</span>
                        </button>

                        <span className="text-[11px] sm:text-xs text-[#2d183b]/40">
                          No download required
                        </span>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.section>
              </div>
            </header>

            {/* ================= WHITE SECTION ================= */}
            <section className="content relative z-10" ref={contentRef}>
              <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 pb-10 sm:px-6 lg:px-4">
                {/* Manifesto card */}
                <RevealOnScroll>
                  <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white pt-10 pb-2 sm:pb-4 shadow-xl sm:pt-12">
                    <div className="mb-10 flex justify-center sm:mb-12">
                      <motion.span
                        className="mt-10 inline-flex items-center rounded-full border border-neutral-200 px-4 py-1.5 text-xs sm:px-5 sm:text-sm font-normal tracking-tight text-neutral-700"
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.6, ease: EASE }}
                      >
                        Our Manifesto
                      </motion.span>
                    </div>

                    <div className="mx-auto max-w-lg px-4 sm:px-0 px-10">
                      <motion.p
                        className="text-center text-lg sm:text-xl font-normal leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
                      >
                        In a time when everything is mass-produced, when speed
                        replaces care, when creators are hidden behind
                        algorithms and noise, our handmade heritage is fading.
                      </motion.p>

                      <motion.p
                        className="mt-6 sm:mt-8 text-center text-lg sm:text-xl font-normal leading-relaxed tracking-tight"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
                      >
                        We exist to connect makers with those who value their
                        craft. This is the home where creations are honored,
                        stories are preserved, and every purchase carries
                        weight.
                      </motion.p>

                      <motion.p
                        className="mt-6 sm:mt-8 text-center text-lg sm:text-xl font-normal leading-relaxed tracking-tight"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
                      >
                        What should never have been lost is now yours again.
                      </motion.p>
                      {/* 
                      <motion.p
                        className="mt-10 sm:mt-12 text-center text-xl font-semibold text-neutral-900"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
                      >
                        Welcome to amzy.ma
                      </motion.p> */}

                      <motion.div
                        className="mt-10 sm:mt-12 flex justify-center"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
                      >
                        <div className="relative h-10 w-40 sm:h-14 sm:w-48">
                          <Image
                            src="/landing/hello.png"
                            alt="Welcome to amzy.ma"
                            fill
                            className="object-contain"
                            priority={false}
                          />
                        </div>
                      </motion.div>
                    </div>

                    <div className="mx-auto mt-6 w-full text-center">
                      <button
                        onClick={() =>
                          window.dispatchEvent(new Event("amzy-install-pwa"))
                        }
                        className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#23102f] px-5 py-2.5 text-sm font-medium text-white"
                      >
                        <span>Try it out</span>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Creator avatars row */}
                    <motion.div
                      className="my-24 flex flex-col items-center justify-center gap-8 px-4 sm:my-32 sm:flex-row sm:gap-12 md:gap-14"
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "0px 0px -80px" }}
                      transition={{ duration: 0.75, ease: EASE, delay: 0.08 }}
                    >
                      <div className="relative h-24 w-24 overflow-hidden rounded-2xl sm:h-28 sm:w-28 md:h-32 md:w-32">
                        <Image
                          src="/landing/1.png"
                          alt="Creator 1"
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="relative h-20 w-20 overflow-hidden rounded-full sm:h-24 sm:w-24">
                        <Image
                          src="/landing/2.png"
                          alt="Creator 2"
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="relative h-24 w-24 overflow-hidden rounded-2xl sm:h-28 sm:w-28 md:h-32 md:w-32">
                        <Image
                          src="/landing/3.png"
                          alt="Creator 3"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </motion.div>

                    <div className="px-4 text-center sm:px-0">
                      <h2 className="mx-auto mb-14 max-w-sm text-3xl sm:text-4xl font-medium text-neutral-900">
                        Features Crafted for Everyday Ease
                      </h2>
                    </div>

                    {/* 4 feature cards */}
                    <div className="grid gap-8 px-4 pb-4 sm:px-10 md:grid-cols-2 md:gap-10">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <motion.div
                          key={i}
                          className="rounded-xl text-center"
                          initial={{ opacity: 0, y: 26 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "0px 0px -80px" }}
                          transition={{
                            duration: 0.7,
                            ease: EASE,
                            delay: 0.05 * i,
                          }}
                        >
                          <div className="mb-4 overflow-hidden rounded-[18px] bg-neutral-500">
                            <div className="aspect-[4/3] w-full bg-neutral-200" />
                          </div>
                          <h3 className="mt-3 text-lg sm:text-xl font-semibold text-neutral-900">
                            Explore the market
                          </h3>
                          <p className="mx-auto mt-1 max-w-xs px-4 text-sm sm:text-md font-normal text-neutral-500">
                            Discover unique handmade pieces crafted with heart.
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Marketplace + scrolling labels */}
                    <RevealOnScroll>
                      <section className="flex flex-col gap-6  pb-20 pt-16   sm:pt-20 sm:pb-24">
                        <div className="text-center">
                          <h2 className="mx-auto mb-4 max-w-sm text-3xl sm:text-4xl font-medium text-neutral-900 capitalize">
                            Marketplace built for makers &amp; buyers
                          </h2>
                        </div>

                        <div className="space-y-3">
                          <RevealOnScroll delay={0.02}>
                            <AutoScrollRow
                              labels={ROW_1}
                              reverse={false}
                              duration={20}
                            />
                          </RevealOnScroll>
                          <RevealOnScroll delay={0.08}>
                            <AutoScrollRow
                              labels={ROW_2}
                              reverse={true}
                              duration={35}
                            />
                          </RevealOnScroll>
                          <RevealOnScroll delay={0.14}>
                            <AutoScrollRow
                              labels={ROW_3}
                              reverse={false}
                              duration={30}
                            />
                          </RevealOnScroll>
                        </div>
                      </section>
                    </RevealOnScroll>

                    {/* CTA Banner */}
                    <RevealOnScroll>
                      <section className="relative mx-2 mb-0 sm:mb-0 overflow-hidden rounded-xl bg-gradient-to-b from-[#F5E8FB] to-[#FEF7EB] sm:mx-3">
                        {/* Background image block on the right */}
                        <div className="pointer-events-none absolute inset-0 right-0 flex items-center justify-end">
                          <div className="relative h-[220px] w-1/2 min-w-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]">
                            <Image
                              src="/landing/caftan.png"
                              alt="Phone"
                              fill
                              className="object-contain object-right"
                              priority
                            />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="relative z-20 flex flex-col gap-8 md:flex-row md:items-center">
                          {/* Left text column */}
                          <div className="max-w-xl px-6 py-8 sm:px-8 sm:py-10 md:px-10">
                            <h3 className="text-xl sm:text-4xl font-semibold leading-tight text-neutral-900">
                              <span className="block">Explore handmade</span>

                              <span
                                className={`${playfair.className} italic mt-0 sm:mt-1 block font-serif text-xl sm:text-4xl`}
                              >
                                treasures
                              </span>
                            </h3>

                            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-neutral-800 sm:block hidden">
                              Browse, shop, and create your store. <br />
                              All in one app.
                            </p>

                            <div className="mt-6 sm:mt-8">
                              <button className="inline-flex items-center gap-2 rounded-full bg-[#23102f] px-6 py-3 text-sm sm:text-base font-medium text-white shadow-[0_14px_32px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#2d183b]">
                                <Download className="h-4 w-4" />
                                <span>Install the App now</span>
                              </button>
                            </div>
                          </div>

                          {/* Spacer for two-column layout on desktop */}
                          <div className="hidden flex-1 md:block" />
                        </div>
                      </section>
                    </RevealOnScroll>
                  </div>
                </RevealOnScroll>

                {/* Brand footer bar */}
                <section className="mt-6 mb-8 px-1 sm:px-0">
                  <div className="mx-auto flex max-w-4xl  items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 text-center shadow-xl sm:flex-row sm:gap-0 sm:text-left">
                    {/* Left: star + text */}
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100/50 text-[#23102f]">
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 108 110"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M54.1416 0.291992L70.5439 16.6943H92.1592V38.8096L107.913 54.5645L107.991 54.6426L92.1592 70.4746V92.8408H70.5439L54.1416 109.243V109.535L53.9951 109.389L53.8496 109.535V109.243L37.4473 92.8408H15.832V70.4746L0 54.6426L0.078125 54.5645L15.832 38.8096V16.6943H37.4473L53.8496 0.291992V0L53.9951 0.145508L54.1416 0V0.291992Z" />
                        </svg>
                      </span>

                      <p className="text-xs sm:text-sm font-normal text-gray-500">
                        © 2026 amzy.ma
                      </p>
                    </div>

                    {/* Right: social icons */}
                    <div className="flex items-center gap-3 text-[#3b153f]">
                      <button className="inline-flex items-center justify-center rounded-full p-1.5 hover:opacity-80">
                        <Facebook className="h-5 w-5" />
                      </button>

                      <span className="h-5 w-px bg-neutral-200" />

                      <button className="inline-flex items-center justify-center rounded-full p-1.5 hover:opacity-80">
                        <Twitter className="h-5 w-5" />
                      </button>

                      <span className="h-5 w-px bg-neutral-200" />

                      <button className="inline-flex items-center justify-center rounded-full p-1.5 hover:opacity-80">
                        <span className="text-base font-semibold">t</span>
                      </button>

                      <span className="h-5 w-px bg-neutral-200" />

                      <button className="inline-flex items-center justify-center rounded-full p-1.5 hover:opacity-80">
                        <Instagram className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
