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
  ChevronDown,
  Store,
  MapPin,
  Truck,
  HeartHandshake,
  Smartphone,
  ShieldCheck,
  ListChecks,
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

/* ========= FAQ + Feature copy ========= */

const FAQ_ITEMS = [
  {
    question: "How do I install the Zaha app?",
    answer:
      "Scan the QR code on this page or open zaha.ma on your phone and tap “Install app”. Zaha works as a lightweight app straight from your browser.",
  },
  {
    question: "Is Zaha only for professional sellers?",
    answer:
      "No. Whether you’re an established brand or just starting with a few handmade pieces, you can open a shop and start selling.",
  },
  {
    question: "How do I pay for my order?",
    answer:
      "Most orders support cash-on-delivery. Some shops may also offer other payment options depending on the city and delivery partner.",
  },
  {
    question: "Can I shop by city or region?",
    answer:
      "Yes. You can browse products by city to discover makers near you and see which items can be delivered faster to your area.",
  },
  {
    question: "What happens if there’s an issue with my order?",
    answer:
      "You can contact the seller through their shop page and use the order details as reference. We encourage clear communication and fair resolutions between buyers and sellers.",
  },
];

const FEATURE_ITEMS = [
  {
    title: "100% Moroccan",
    description: "Explore handmade pieces from independents across Morocco.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        viewBox="0 0 256 256"
        fill="currentColor"
      >
        <path d="M239.18 91.05A15.75 15.75 0 0 0 224 80h-61l-19.77-60.74a15.93 15.93 0 0 0-30.45-.05L93.06 80H32a16 16 0 0 0-9.37 29l49.46 35.58L53.15 203A15.75 15.75 0 0 0 59 220.88a15.74 15.74 0 0 0 18.77 0L128 184.75l50.23 36.13A16 16 0 0 0 202.85 203l-19-58.46l49.49-35.61a15.74 15.74 0 0 0 5.84-17.88M128 24.15L146.12 80h-36.24ZM32 96h55.87L77.3 128.56Zm36.34 112l17.39-53.59l28.54 20.54Zm22.57-69.57L104.69 96h46.62l13.75 42.38L128 165ZM187.6 208l-45.9-33l28.54-20.54Zm-8.93-79.38L168.13 96H224Z" />
      </svg>
    ),
  },

  {
    title: "City discovery",
    description: "Find products by city to enjoy faster delivery & lower fees.",
    icon: <MapPin className="h-6 w-6" />,
  },
  {
    title: "Cash-on-delivery",
    description: "Shop confidently with COD available in many cities.",
    icon: <Truck className="h-6 w-6" />,
  },
  {
    title: "Built for mobile first",
    description: "Enjoy an experience designed for discovering unique items.",
    icon: <Smartphone className="h-6 w-6" />,
  },
  {
    title: "Favorites listings",
    description: "Save various items you love to access anytime.",
    icon: <ListChecks className="h-6 w-6" />,
  },
  {
    title: "Optimized for growth",
    description: "Manage products, orders in one simple dashboard.",
    icon: <ShieldCheck className="h-6 w-6" />,
  },
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
  const [actualDuration, setActualDuration] = useState(duration);

  // Detect mobile and speed up
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isMobile = window.innerWidth < 640; // sm breakpoint
      setActualDuration(isMobile ? duration * 0.5 : duration);
      // 0.5 = 2x faster. Adjust if needed.
    }
  }, [duration]);

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex gap-3 py-1"
        animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{
          duration: actualDuration,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {items.map((label, i) => {
          const style = LABEL_STYLES[i % LABEL_STYLES.length];

          return (
            <span
              key={`${label}-${i}`}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-1 text-base sm:text-base md:text-lg font-normal text-neutral-900"
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

const NAV_LINKS = [
  { href: "#manifesto", label: "What", color: "#e06a35" }, // orange
  { href: "#features", label: "Why", color: "#d4b300" }, // yellow
  { href: "#faq", label: "How", color: "#d86adf" }, // pink
];

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

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40); // triggers once you start scrolling
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Measure window height */
  useEffect(() => {
    const measureWindow = () => {
      setWindowHeight(window.innerHeight);
    };

    measureWindow();
    window.addEventListener("resize", measureWindow);

    return () => window.removeEventListener("resize", measureWindow);
  }, []);

  /* Measure content height (react to images / layout changes) */
  useEffect(() => {
    if (!contentRef.current || typeof ResizeObserver === "undefined") return;

    const el = contentRef.current;

    const observer = new ResizeObserver(() => {
      setContentHeight(el.offsetHeight);
    });

    observer.observe(el);
    setContentHeight(el.offsetHeight);

    return () => observer.disconnect();
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

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-[#f6f3ec] tracking-tight ">
      <nav
        className={`
    hidden md:block fixed left-1/2 -translate-x-1/2
    z-[9999]          /* ✅ real z-index, above hero */
    pointer-events-none
    top-4 w-full
  `}
      >
        {/* Inner wrapper = actual navbar pill + invisible bottom space */}
        <div
          className={`
      mx-auto  
      flex items-center justify-between
      px-4 sm:px-6 lg:px-8 lg:pr-4 py-3
      transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
      pointer-events-auto
      ${
        scrolled
          ? "max-w-5xl  bg-white  rounded-full border border-[#f3e3d9]"
          : "max-w-[1400px] bg-transparent shadow-none rounded-none  border-none "
      }
    `}
          style={{
            marginBottom: "18px", // ✅ invisible space under the navbar
          }}
        >
          {/* Logo / wordmark */}
          <span className="text-sm sm:text-xl font-medium text-[#2a1335]">
            Fazar
          </span>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-10 ml-6">
            {NAV_LINKS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 text-sm sm:text-base font-medium text-[#341339] hover:opacity-80"
              >
                <span
                  className="flex h-3 w-3 items-center justify-center"
                  style={{ color: item.color }}
                >
                  <BrandStar className="h-2.5 w-2.5" />
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>

          {/* CTA */}
          <button className="inline-flex items-center gap-1.5 rounded-full bg-[#23102f] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2d183b]">
            <span>Open the app</span>
          </button>
        </div>
      </nav>

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
              {/* NAVBAR */}

              {/* Huge zaha.MA */}
              <div
                className="pointer-events-none absolute inset-x-0 top-4 sm:top-18 flex justify-center"
                style={{
                  transform: `scale(${heroScale})`,
                  opacity: heroOpacity,
                  transformOrigin: "center top",
                }}
              >
                <span className="select-none text-[22vw] sm:text-[20vw] mt-0 sm:-mt-0   font-bold leading-none text-[#F2E4D9]   ">
                  fazar.ma
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
                  {/* Hand + phone anchored near bottom */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center md:inset-0 md:items-center"
                    style={{
                      transform: `translateY(${imageOffset}px)`,
                      transformOrigin: "center bottom",
                    }}
                  >
                    <motion.div
                      className="relative w-full max-w-sm h-[55vh] md:max-w-none md:h-full"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 3, ease: EASE, delay: 0.15 }}
                    >
                      <Image
                        src="/landing/handspremium2.png"
                        alt="zaha app in hand"
                        fill
                        className="object-contain object-bottom md:object-contain"
                        priority
                      />
                    </motion.div>
                  </div>

                  {/* Foreground text + CTA */}
                  <div
                    className="mt-0 sm:mt-24 relative z-10 mx-auto flex h-full max-w-[90vw] flex-col items-center justify-center gap-10 px-4 pt-24 pb-[34vh] sm:pt-28 sm:pb-[36vh] md:flex-row md:items-center md:justify-end md:gap-12 md:px-8 lg:px-12 md:pb-24"
                    style={{
                      transform: `translateY(${contentOffset}px)`,
                      transformOrigin: "center center",
                    }}
                  >
                    {/* Left block */}
                    <div className="w-full max-w-sm text-center md:flex-1 mt-0 sm:mt-10 ">
                      <motion.div
                        className="mx-auto mb-4 flex items-center justify-center sm:mb-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
                      >
                        <BrandStar className="h-6 w-6 text-[#C9B6A6] sm:h-6 sm:w-6" />
                      </motion.div>

                      <motion.h1
                        className="text-[2.1rem] sm:text-[2.6rem] md:text-[2.8rem] font-semibold leading-10 sm:leading-13 text-[#1B1124] "
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
                      >
                        Discover
                        <br />
                        products made
                        <br />
                        with{" "}
                        <span
                          className={`${playfair.className} italic font-normal`}
                        >
                          Soul
                        </span>
                      </motion.h1>
                    </div>

                    {/* Spacer center on desktop */}
                    <div className="hidden flex-1 md:block" />

                    {/* Right copy + QR CTA card */}
                    <motion.div
                      className="w-full max-w-xs text-center md:flex-1"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.85, ease: EASE, delay: 0.4 }}
                    >
                      <p className="text-base sm:text-lg leading-relaxed text-[#1B1124] font-normal mt-0 sm:mt-7 ">
                        Connect with Morocco&apos;s
                        <br className="hidden sm:block" />
                        most talented artisans & discover{" "}
                        <br className="hidden sm:block" />
                        pieces you won&apos;t find anywhere else.
                      </p>

                      <motion.div
                        className="mt-5 flex justify-center sm:mt-10"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
                      >
                        <button className="inline-flex sm:hidden items-center gap-2 rounded-full bg-[#23102f] px-6 py-3 text-sm sm:text-base font-medium text-white shadow-[0_14px_32px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#2d183b]">
                          <Download className="h-4 w-4" />
                          <span>Install the App now</span>
                        </button>
                        <div className="hidden sm:inline-flex items-center gap-4 rounded-xl   bg-white px-2 py-3 sm:px-2 sm:py-2 sm:pr-10">
                          {/* QR block */}
                          <div className="flex items-center justify-center rounded-lg bg-white overflow-hidden">
                            <div className="relative h-16 w-16 sm:h-20 sm:w-20">
                              <Image
                                src="/landing/qr.jpg"
                                alt="Scan to install the Zaha app"
                                fill
                                className="object-contain"
                                priority={false}
                              />
                            </div>
                          </div>

                          {/* Text */}
                          <div className="text-left">
                            <p className="text-[11px] sm:text-lg font-semibold text-[#2a1335] leading-6">
                              Scan to <br />
                              launch the <br />
                              Zaha app
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.section>
              </div>
            </header>

            {/* ================= WHITE SECTION ================= */}
            <section className="content relative z-10 " ref={contentRef}>
              <div className="mx-auto flex w-full container flex-col gap-1 px-4 sm:pb-10 sm:px-6 lg:px-4">
                {/* Manifesto card */}
                <RevealOnScroll>
                  <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white pt-10 pb-2 sm:pb-4  sm:pt-12 arabic-corners  border border-[#f3e3d9]">
                    <div className="mb-10 flex justify-center sm:mb-12">
                      <motion.span
                        className="mt-10 inline-flex items-center rounded-full border border-neutral-200 px-4 py-1.5 text-sm sm:px-5 sm:text-bas e font-normal tracking-tight text-neutral-700"
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 0.6, ease: EASE }}
                      >
                        Our Manifesto
                      </motion.span>
                    </div>

                    <div className="mx-auto max-w-xl px-7 sm:px-0  ">
                      <motion.p
                        className="text-center text-lg sm:text-2xl font-medium leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.25 }}
                      >
                        In a time when everything is mass-produced, when speed
                        replaces care, when creators are hidden behind
                        algorithms and noise, our handmade heritage is fading.
                      </motion.p>

                      <motion.p
                        className="mt-6 sm:mt-8 text-center text-lg sm:text-2xl font-medium leading-relaxed tracking-tight"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.3 }}
                      >
                        We exist to connect makers with those who value their
                        craft. This is the home where creations are honored,
                        stories are preserved, and every purchase carries
                        weight.
                      </motion.p>

                      <motion.p
                        className="mt-6 sm:mt-8 text-center text-lg sm:text-2xl font-medium leading-relaxed tracking-tight"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.34 }}
                      >
                        What should never have been lost is now yours again.
                      </motion.p>

                      <motion.p
                        className="mt-10 sm:mt-12 text-center text-xl sm:text-2xl font-medium text-neutral-900"
                        initial={{ opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "0px 0px -60px" }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.68 }}
                      >
                        <span>Welcome</span>
                        <br className="hidden sm:block" />
                        <span className="sm:ml-0 ml-1">to zaha.ma</span>
                      </motion.p>
                    </div>

                    {/* Creator avatars row */}
                    <motion.div
                      className="my-24 flex flex-col items-center justify-center gap-8 px-4 sm:my-32 sm:flex-row sm:gap-12 md:gap-14"
                      initial={{ opacity: 0, y: 26 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "0px 0px -80px" }}
                      transition={{ duration: 0.75, ease: EASE, delay: 0.08 }}
                    >
                      <div className="relative h-40 w-40 overflow-hidden rounded-2xl sm:h-28 sm:w-28 md:h-32 md:w-32">
                        <Image
                          src="/landing/aa.png"
                          alt="Creator 1"
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="relative  h-40 w-40 overflow-hidden rounded-full sm:h-30 sm:w-30">
                        <Image
                          src="/landing/bb.png"
                          alt="Creator 2"
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="relative  h-40 w-40 overflow-hidden rounded-2xl sm:h-28 sm:w-28 md:h-32 md:w-32">
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
                    <div className="grid gap-4 px-4 pb-4 sm:px-10 md:grid-cols-2 md:gap-8">
                      {[
                        {
                          title: "Discover unique finds",
                          desc: "Explore handmade products from real Moroccan makers.",
                          image: "/landing/a.png",
                          placeholder: "Home Feed Image",
                        },
                        {
                          title: "Customized shop pages",
                          desc: "Establish a real brand presence with a personalized page.",
                          image: "/landing/b.png",
                          placeholder: "Shop Page Image",
                        },
                        {
                          title: "Dashboard for real sellers",
                          desc: "Track sales, orders, and performance instantly.",
                          image: "/landing/dashboard.png",
                          placeholder: "Product Page Image",
                        },
                        {
                          title: "Built to convert",
                          desc: "Smart layouts and clear details that guide shoppers to buy.",
                          image: "/landing/d.png",
                          placeholder: "Contact Sheet Image",
                        },
                      ].map((item, i) => {
                        const titleColor = i % 2 === 0 ? "#be7846" : "#ae74e4";

                        return (
                          <motion.div
                            key={i}
                            className="rounded-xl text-left border-2 border-neutral-100"
                            initial={{ opacity: 0, y: 26 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "0px 0px -80px" }}
                            transition={{
                              duration: 0.7,
                              ease: EASE,
                              delay: 0.05 * i,
                            }}
                          >
                            {/* TEXT BLOCK */}
                            <h3
                              className="mt-1 text-xl sm:text-2xl font-semibold px-8 pt-8"
                              style={{ color: titleColor }}
                            >
                              {item.title}
                            </h3>

                            <p className="max-w-xs mt-2 text-md sm:text-lg font-normal   text-neutral-500 leading-6 sm:leading-7 px-8">
                              {item.desc}
                            </p>

                            {/* IMAGE BLOCK */}
                            <div className="overflow-hidden rounded-t-xl">
                              {item.image ? (
                                <div className="pb-0">
                                  <Image
                                    src={item.image}
                                    alt={item.title}
                                    width={800}
                                    height={600}
                                    className="w-full mx-auto h-auto object-contain rounded-xl"
                                  />
                                </div>
                              ) : (
                                <div className="aspect-[4/3] w-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-xs">
                                  {item.placeholder}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* ========= FEATURE LIST SECTION (aligned + no colored bg) ========= */}
                    <RevealOnScroll>
                      <section className="mt-20 px-4 sm:px-6 lg:px-8">
                        <h2 className="mx-auto mb-8 max-w-sm text-3xl sm:text-4xl font-medium text-neutral-900 capitalize text-center">
                          And much more..
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-3">
                          {FEATURE_ITEMS.map((item, i) => {
                            const columns = 3;
                            const total = FEATURE_ITEMS.length;

                            const isLastColumn = i % columns === columns - 1;
                            const isLastRow = i >= total - columns;

                            return (
                              <div
                                key={item.title}
                                className={`
          flex flex-col 
          items-center sm:items-center
          justify-center 
          pt-10 gap-4 px-6 pb-10
          text-center sm:text-center

          ${i !== 0 ? "border-t border-neutral-200 sm:border-t-0" : ""}
          ${!isLastColumn ? "sm:border-r border-neutral-200" : ""}
          ${!isLastRow ? "border-b border-neutral-200" : ""}
        `}
                              >
                                {/* Icon with background star */}
                                <div className="relative flex items-center justify-center h-12 w-12">
                                  <BrandStar className="absolute inset-0 h-full w-full scale-[1.5] text-[#f3e3d9] opacity-50" />
                                  <div className="relative z-10 text-[#997b68]">
                                    {item.icon}
                                  </div>
                                </div>

                                <h3 className="text-lg sm:text-xl font-semibold text-neutral-600 capitalize mt-3">
                                  {item.title}
                                </h3>

                                <p className="max-w-xs text-md sm:text-md text-neutral-500 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    </RevealOnScroll>

                    {/* ========= FAQ SECTION (Accordion) ========= */}
                    <RevealOnScroll>
                      <section className="gap-6 pt-16 sm:pt-20">
                        <h2 className="mx-auto mb-4 max-w-xl text-3xl sm:text-4xl font-medium text-neutral-900 capitalize text-center">
                          Frequently Asked Questions
                        </h2>

                        <div className="mt-8 divide-y divide-neutral-200 mx-auto max-w-2xl container px-4 sm:px-6 lg:px-8">
                          {FAQ_ITEMS.map((faq, i) => {
                            const isOpen = openIndex === i;

                            return (
                              <details
                                key={faq.question}
                                open={isOpen}
                                className="group py-3 sm:py-4"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setOpenIndex(isOpen ? null : i);
                                }}
                              >
                                <summary
                                  className={`
                flex cursor-pointer items-center justify-between gap-4 list-none
                text-lg sm:text-lg
                transition-opacity

                ${
                  isOpen
                    ? "font-semibold text-neutral-900 opacity-100" /* ACTIVE */
                    : "font-medium text-neutral-800 opacity-70"
                }    /* INACTIVE */
              `}
                                >
                                  <span>{faq.question}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </summary>

                                <p className="mt-2 max-w-xl text-md sm:text-base text-neutral-700 leading-relaxed">
                                  {faq.answer}
                                </p>
                              </details>
                            );
                          })}
                        </div>
                      </section>
                    </RevealOnScroll>

                    {/* Marketplace + scrolling labels */}
                    <RevealOnScroll>
                      <section className="flex flex-col gap-6 pb-20 pt-16 sm:pt-20 sm:pb-24">
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
                          <div className="relative h-[260px] w-14/12 sm:w-7/12 min-w-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px] mr:0 sm:-mr-16">
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
                          <div className="max-w-xl py-6 sm:px-8 sm:py-10 md:px-10 px-6">
                            <h3 className="text-xl sm:text-4xl font-semibold leading-7 text-neutral-900">
                              <span className="block">
                                Explore <br className="block sm:hidden" />
                                handmade
                              </span>

                              <span
                                className={`${playfair.className} italic -mt-1 sm:mt-0 block font-serif text-xl sm:text-4xl`}
                              >
                                treasures
                              </span>
                            </h3>

                            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-neutral-800 sm:block hidden">
                              Browse, shop, and create your store. <br />
                              All in one app.
                            </p>

                            <div className="mt-6 sm:mt-8">
                              <button className="inline-flex sm:hidden items-center gap-2 rounded-full bg-[#23102f] px-6 py-3 text-sm sm:text-base font-medium text-white shadow-[0_14px_32px_rgba(0,0,0,0.35)] transition-colors hover:bg-[#2d183b]">
                                <Download className="h-4 w-4" />
                                <span>Install the App now</span>
                              </button>

                              <div className="hidden sm:inline-flex items-center gap-4 rounded-xl border-0 sm:border-2 border-[#e5d6ff] bg-white sm:bg-none px-2 py-3 sm:px-2 sm:py-2 pr-10 w-full">
                                {/* QR block */}
                                <div className="flex items-center justify-center rounded-lg bg-white overflow-hidden">
                                  <div className="relative h-16 w-16 sm:h-16 sm:w-16">
                                    <Image
                                      src="/landing/qr.jpg"
                                      alt="Scan to install the Zaha app"
                                      fill
                                      className="object-contain"
                                      priority={false}
                                    />
                                  </div>
                                </div>

                                {/* Text */}
                                <div className="text-left">
                                  <p className="text-lg sm:text-lg font-semibold text-[#2a1335] leading-6">
                                    Scan to <br />
                                    launch the Zaha app
                                  </p>
                                </div>
                              </div>
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
                <RevealOnScroll>
                  <section className="mt-6 mb-8 px-1 sm:px-0">
                    <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-3xl bg-white px-5 py-4 text-center  border border-[#f3e3d9] sm:flex-row sm:gap-0 sm:text-left">
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
                          © 2026 zaha.ma
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
                </RevealOnScroll>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
