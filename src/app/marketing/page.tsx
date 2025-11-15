"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const TRANSITION = { duration: 0.7, ease: "easeInOut" };
const SCROLL_COOLDOWN = 900; // ms between section changes
const SWIPE_THRESHOLD = 40; // px

export default function Page() {
  const [index, setIndex] = React.useState(0);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const touchStartY = React.useRef<number | null>(null);

  const sectionsCount = 5;

  const goTo = React.useCallback(
    (next: number) => {
      if (next < 0 || next >= sectionsCount) return;
      setIsAnimating(true);
      setIndex(next);
      // cooldown so wheel doesn’t spam
      setTimeout(() => setIsAnimating(false), SCROLL_COOLDOWN);
    },
    [sectionsCount]
  );

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    if (e.deltaY > 40) {
      goTo(index + 1);
    } else if (e.deltaY < -40) {
      goTo(index - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isAnimating) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") goTo(index + 1);
    if (e.key === "ArrowUp" || e.key === "PageUp") goTo(index - 1);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY.current == null || isAnimating) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const delta = endY - touchStartY.current;

    if (delta > SWIPE_THRESHOLD) {
      // swipe down -> previous
      goTo(index - 1);
    } else if (delta < -SWIPE_THRESHOLD) {
      // swipe up -> next
      goTo(index + 1);
    }
    touchStartY.current = null;
  };

  const navItems = [
    // { label: "Overview", to: 0 },
    { label: "Discover", to: 1 },
    { label: "Stories", to: 2 },
    { label: "Sell", to: 3 },
  ];

  const handleNavClick =
    (targetIndex: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (isAnimating) return;
      goTo(targetIndex);
    };

  const handleDownloadClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isAnimating) return;
    goTo(4);
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#0B1020] text-white"
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0} // so keyboard works
    >
      {/* TOP NAVBAR */}
      {/* TOP NAVBAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white   ">
        <div className="mx-auto flex h-18 w-full px-5 items-center justify-between ">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-[#0B1020] grid place-items-center text-[11px] font-bold text-white">
              Z
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#0B1020]">
              Zaha
            </span>
          </div>

          {/* Center links (desktop only) */}

          {/* Right: CTA */}
          <div className="flex items-center gap-2">
            {/* <button
              onClick={() => goTo(1)}
              className="hidden md:inline-flex h-8 rounded-full bg-white border border-black/10 px-4 text-xs font-medium text-[#0B1020] hover:bg-black/5 transition"
            >
              Start exploring
            </button> */}

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#0B1020]/70 mr-5">
              {/* <button
              onClick={() => goTo(0)}
              className={`hover:text-[#0B1020] transition ${
                index === 0 ? "text-[#0B1020] font-semibold" : ""
              }`}
            >
              Overview
            </button> */}
              <button
                onClick={() => goTo(1)}
                className={`hover:text-[#0B1020] transition ${
                  index === 1 ? "text-[#0B1020] font-semibold" : ""
                }`}
              >
                Discover
              </button>
              <button
                onClick={() => goTo(2)}
                className={`hover:text-[#0B1020] transition ${
                  index === 2 ? "text-[#0B1020] font-semibold" : ""
                }`}
              >
                Buy
              </button>
              <button
                onClick={() => goTo(3)}
                className={`hover:text-[#0B1020] transition ${
                  index === 3 ? "text-[#0B1020] font-semibold" : ""
                }`}
              >
                Sell
              </button>
            </nav>

            <button
              onClick={() => goTo(4)}
              className="h-8 rounded-full bg-[#0B1020] px-4 text-xs font-semibold text-white hover:bg-black transition"
            >
              Download app
            </button>
          </div>
        </div>
      </header>

      {/* Vertical carousel */}
      <motion.div
        className="h-full w-full"
        animate={{ y: `-${index * 100}vh` }}
        transition={TRANSITION}
      >
        {/* ===== 1. HERO ===== */}
        <section className="relative flex h-screen items-center justify-center bg-[#0B1020] px-6 md:px-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-12 md:flex-row md:items-center mt-18">
            <div className="max-w-xl space-y-6 mt-20 md:mt-0">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#F6F3EC]/70">
                Zaha · Morocco
              </p>
              <h1 className="text-4xl font-bold leading-tighter md:text-5xl lg:text-6xl">
                Discover
                <br />
                Products Made
                <br />
                with <span className="text-white italic">Soul</span>
              </h1>
              <p className="max-w-md text-base leading-relaxed text-[#F6F3EC]/80">
                Connect with Morocco&apos;s most talented artisans and discover
                pieces you won&apos;t find anywhere else.
              </p>

              <Button
                asChild
                className="mt-4 rounded-full bg-[#F6A3D6] px-6 py-5 text-sm font-bold text-[#0B1020] hover:bg-[#f893cd]"
              >
                <Link href="#download">Download on the App Store</Link>
              </Button>
            </div>

            <div className="relative flex flex-1 justify-center md:justify-end">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-64 w-64 rotate-45 rounded-[40px] bg-[#241133]" />
              </div>

              <div className="relative z-10 h-[420px] w-[220px] overflow-hidden rounded-[40px] border border-white/10 bg-black/80 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
                <Image
                  src="/images/zaha-hero-phone.png"
                  alt="Zaha app preview"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== 2. DISCOVER (BUYER) ===== */}
        <section className="flex h-screen items-center justify-center bg-[#FFD6E3] px-6 md:px-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 md:flex-row mt-18">
            <div className="flex flex-1 items-center justify-center">
              <div className="relative h-[360px] w-[260px]">
                <div className="absolute -left-20 top-6 h-40 w-32 rounded-[28px] bg-[#FFB84D]" />
                <div className="absolute bottom-2 -left-10 h-52 w-40 rounded-[32px] bg-[#F5666E]" />
                <div className="absolute right-0 top-0 h-56 w-40 rounded-[32px] bg-[#FF8AA0]" />
                <div className="absolute inset-10 rounded-[36px] bg-white shadow-xl">
                  <Image
                    src="/images/zaha-discover-cards.png"
                    alt="Discover handmade goods on Zaha"
                    fill
                    className="rounded-[36px] object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 max-w-xl">
              <h2 className="text-5xl font-bold leading-tight text-red-700/80 md:text-5xl">
                Discover handmade crafts &amp; goods.
              </h2>
              <p className="mt-4 text-xl leading-normal text-red-700/80 max-w-sm font-medium py-6">
                What would you like to explore next? Think of something you love
                — for example “handmade jewelry” — and see what Zaha brings you.
              </p>

              <Button
                asChild
                className="mt-4 rounded-full bg-red-700/80 px-6 py-5 text-sm font-bold text-white hover:bg-[#d21342]"
              >
                <Link href="/explore">Explore</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ===== 3. BUY PIECES THAT TELL A STORY ===== */}
        <section className="flex h-screen items-center justify-center bg-[#E9DBFF] px-6 md:px-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 md:flex-row mt-18">
            <div className="flex-1 max-w-xl">
              <h2 className="text-4xl font-bold leading-tight text-[#2B1034] md:text-5xl">
                Buy pieces
                <br />
                that tell a story.
              </h2>
              <p className="mt-4 text-xl leading-normal  font-medium py-6 text-[#3D2249] max-w-sm">
                The best part about Zaha is finding creations made by real
                people — makers who pour their time, care, and passion into
                every detail.
              </p>

              <Button
                asChild
                className=" mt-4 rounded-full bg-[#2B1034] px-6 py-5 text-sm font-bold text-white hover:bg-[#220c29]"
              >
                <Link href="/browse">Explore</Link>
              </Button>
            </div>

            <div className="relative flex flex-1 items-center justify-center">
              <div className="h-64 w-64 rotate-45 rounded-[48px] bg-[#C2A4FF]" />
              <div className="absolute h-64 w-64 overflow-hidden rounded-[48px]">
                <Image
                  src="/images/zaha-maker-woman.png"
                  alt="Moroccan artisan on Zaha"
                  fill
                  className="-rotate-45 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ===== 4. SELL WHAT YOU CREATE ===== */}
        <section className="flex h-screen items-center justify-center bg-[#F6E5CC] px-6 md:px-16">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-12 md:flex-row mt-18">
            <div className="relative flex flex-1 items-center justify-center">
              <div className="h-64 w-64 rounded-[40px] bg-[#2F1308]" />
              <div className="absolute -bottom-10 left-6 h-40 w-40 rounded-[40px] bg-[#FF8F4E]" />
              <div className="absolute inset-6 overflow-hidden rounded-[40px] shadow-xl">
                <Image
                  src="/images/zaha-seller-preview.png"
                  alt="Zaha seller dashboard"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            <div className="flex-1 max-w-xl text-[#2A1607] ">
              <h2 className="text-4xl font-bold leading-tight md:text-5xl">
                Sell what you create.
                <br />
                Your way.
              </h2>
              <p className="mt-4 text-xl leading-normal   font-medium py-6  text-[#4D2D13] max-w-sm">
                Turn your craft into income. Create your shop, add your
                products, and start selling to buyers across Morocco.
              </p>

              <Button
                asChild
                className=" mt-4 rounded-full bg-[#F26E2A] px-6 py-5 text-sm font-bold text-white hover:bg-[#e06525]"
              >
                <Link href="/sell">Become a seller</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ===== 5. FINAL CTA / DOWNLOAD ===== */}
        <section className="flex h-screen items-center justify-center bg-gradient-to-b from-[#C5A8FF] to-[#FDD9FF] px-6 md:px-16">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-center mt-18">
            <div className="relative flex w-full flex-col overflow-hidden rounded-[40px] bg-[#14071E] px-8 py-10 text-white md:flex-row md:items-center md:px-12 md:py-16">
              <div className="relative z-10 max-w-xl space-y-4">
                <h2 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
                  Dive into the world
                  <br />
                  of Shopping
                </h2>
                <p className="text-base leading-relaxed text-white/80">
                  Turn your craft into income. Create your shop, add your
                  products, and start selling to buyers across Morocco.
                </p>

                <Button
                  asChild
                  className="mt-6 rounded-full bg-[#C5A8FF] px-6 py-5 text-sm font-bold text-[#14071E] hover:bg-[#b89bff]"
                >
                  <Link href="#">Download on the App Store now</Link>
                </Button>
              </div>

              <div className="relative mt-10 flex flex-1 justify-center md:mt-0 md:justify-end">
                <div className="absolute -left-10 -top-10 h-44 w-44 rotate-45 rounded-[40px] border border-white/20" />
                <div className="relative h-[320px] w-[180px] overflow-hidden rounded-[32px] border border-white/10 bg-black/70 shadow-[0_0_40px_rgba(0,0,0,0.7)]">
                  <Image
                    src="/images/zaha-wallet-phone.png"
                    alt="Zaha wallet preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
