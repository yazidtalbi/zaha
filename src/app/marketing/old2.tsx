"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Check,
  Star,
  MessageSquare,
  Calendar,
  Clock,
  Zap,
  Settings,
  Shield,
  Bell,
  ChevronRight,
  Mail,
  Twitter,
  Instagram,
  Facebook,
  PhoneCall,
} from "lucide-react";

// shadcn/ui — make sure you've generated these
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

import FeatureMasonry from "./components/FeatureMasonry";
import BentoGrid from "./components/BentoGrid";
import CTAInvite from "./components/CTAInvite";
import BecomeSellerCTA from "./components/BecomeSellerCTA";
import ZahaUseCases from "./components/ZahaUseCases";

// ---- brand palette (used via Tailwind classes inline) ----
// Ink: #0B1020, Sand: #F6F3EC, Lilac: #B9A8FF, Terracotta: #D96E43, Olive: #66785F

function Container({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

function Glass({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-black/10 bg-white/70  backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

// Helper for placeholder images without Next config
function PlaceholderImg({
  w = 960,
  h = 720,
  text,
  className = "",
  rounded = "rounded-xl",
}: {
  w?: number;
  h?: number;
  text?: string;
  className?: string;
  rounded?: string;
}) {
  const url = `https://placehold.co/${w}x${h}?text=${encodeURIComponent(
    text || `${w}×${h}`
  )}`;
  return (
    <img
      src={url}
      alt={text || "placeholder"}
      className={`${rounded} w-full h-auto object-cover ${className}`}
      width={w}
      height={h}
      loading="lazy"
    />
  );
}

// components/ZahaMosaic.tsx
// Tailwind-only. Uses Sand bg, soft cards, and a 3×2 mosaic like your screenshot.
function ZahaMosaic() {
  return (
    <section className="bg-[#F6F3EC] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-12 lg:grid-rows-2">
          {/* LEFT TALL — artisan image with starburst + bubble */}
          <div className="relative lg:row-span-2 lg:col-span-4">
            <CardWrap className="h-full">
              <div className="relative h-full overflow-hidden rounded-2xl">
                {/* starburst */}
                <svg
                  viewBox="0 0 200 200"
                  className="pointer-events-none absolute -left-6 top-6 h-56 w-56 opacity-20"
                >
                  <path
                    d="M100 10l18 40 44 6-32 30 8 44-38-20-38 20 8-44-32-30 44-6 18-40z"
                    fill="none"
                    stroke="#0B1020"
                    strokeWidth="3"
                  />
                </svg>

                {/* image (replace with real) */}
                <img
                  src="https://placehold.co/800x1000/EEE/0B1020?text=Artisan+Photo"
                  alt="Moroccan artisan"
                  className="h-full w-full rounded-2xl object-cover"
                />

                {/* chat/bubble badge */}
                <div className="absolute right-4 top-4 rounded-full bg-[#0B1020] px-2.5 py-1 text-xs font-semibold text-white  ">
                  Y
                </div>
              </div>

              {/* caption below image */}
              <div className="px-5 pb-5 pt-4">
                <h3 className="font-serif text-2xl italic text-[#0B1020]">
                  Craft with Purpose
                </h3>
                <p className="mt-2 max-w-prose text-sm text-neutral-700">
                  Celebrate Moroccan artisanship. Every creation on Zaha tells
                  the story of a maker’s hands and heart.
                </p>
              </div>
            </CardWrap>
          </div>

          {/* TOP MIDDLE — Morocco map card */}
          <div className="lg:col-span-3">
            <CardWrap>
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="https://placehold.co/900x520/FFFFFF/0B1020?text=Morocco+Line+Map"
                  alt="Morocco map"
                  className="h-40 w-full rounded-2xl object-cover sm:h-48"
                />
              </div>
              <div className="px-6 pb-6 pt-4">
                <p className="max-w-[22ch] text-right text-lg font-medium leading-snug text-[#0B1020] ml-auto">
                  Join a <br /> growing community of Moroccan makers.
                </p>
              </div>
            </CardWrap>
          </div>

          {/* TOP RIGHT — “Your shop” wide card with media block */}
          <div className="lg:col-span-5">
            <CardWrap>
              <div className="grid grid-cols-1 items-center gap-6 p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-8">
                <div>
                  <h3 className="text-2xl font-semibold text-[#0B1020]">
                    Your shop
                  </h3>
                  <p className="mt-2 max-w-prose text-neutral-700">
                    Add products, track orders, and manage your shop in one
                    simple dashboard.
                  </p>
                </div>
                <div className="h-28 w-full rounded-xl bg-neutral-200 sm:h-32" />
              </div>
            </CardWrap>
          </div>

          {/* BOTTOM MIDDLE WIDE — text left, media right */}
          <div className="lg:col-span-5">
            <CardWrap>
              <div className="grid grid-cols-1 items-center gap-6 p-6 sm:grid-cols-[1.2fr_0.8fr] sm:p-8">
                <p className="text-lg font-medium leading-snug text-[#0B1020]">
                  Join a growing community of Moroccan makers.
                </p>
                <div className="h-40 w-full rounded-xl bg-neutral-200 sm:h-40" />
              </div>
            </CardWrap>
          </div>

          {/* BOTTOM RIGHT — stacked copy + small media */}
          <div className="lg:col-span-3">
            <CardWrap>
              <div className="p-6 sm:p-8">
                <p className="text-lg font-medium leading-snug text-[#0B1020]">
                  Join a growing community of Moroccan makers.
                </p>
                <div className="mt-6 h-24 w-full rounded-md bg-neutral-200" />
              </div>
            </CardWrap>
          </div>
        </div>
      </div>
    </section>
  );
}

function CardWrap({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-px rounded-3xl bg-white" />
      <div className="pointer-events-none absolute inset-px rounded-3xl shadow-sm outline outline-black/5" />
      <div className="relative overflow-hidden rounded-[calc(1.5rem+1px)]">
        {children}
      </div>
    </div>
  );
}

export default function MarketingPage() {
  // hero scroll y parallax for phone mock
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const phoneScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);

  return (
    <main className="bg-white text-[#0B1020] ">
      {/* top nav */}
      <header className="fixed w-full top-0 z-50   border-black/[0.06]  ">
        <Container className="flex h-14 items-center justify-between max-w-4xl">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-md bg-[#B9A8FF]" />
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Zaha Plan
            </Link>
            <nav className="ml-6 hidden gap-5 text-sm text-neutral-600 md:flex">
              <Link href="#features" className="hover:text-neutral-900">
                Features
              </Link>
              <Link href="#testimonials" className="hover:text-neutral-900">
                Clients
              </Link>
              <Link href="#pricing" className="hover:text-neutral-900">
                Pricing
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
            <Button size="sm" className="gap-1">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Container>
      </header>

      <main className="  bg-[#F6F3EC]">
        {/* Hero */}
        <section className="relative" ref={ref}>
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-24 pt-20 md:grid-cols-2 md:gap-8 lg:px-8 lg:pt-28">
            {/* Left copy */}
            <div className="relative z-10">
              <h1 className="text-[clamp(32px,6vw,64px)] leading-[1.02] tracking-[-0.02em] font-semibold text-[#0B1020]">
                Discover{" "}
                <span className="italic font-serif font-normal">products</span>
                <br />
                made with{" "}
                <span className="italic font-serif font-normal">soul</span>.
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-[#2C2C2C]/70">
                Connect with Morocco&apos;s most talented artisans and discover
                pieces you won&apos;t find anywhere else.
              </p>

              <div className="mt-10">
                <Link
                  href="#"
                  className="inline-flex items-center gap-3 rounded-full bg-black px-5 py-3 text-white transition hover:bg-black/90"
                >
                  {/* Apple icon */}
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M16.365 1.43c0 1.14-.476 2.23-1.208 3.047-.772.85-2.065 1.503-3.15 1.418-.12-1.08.516-2.23 1.25-2.99.796-.827 2.189-1.45 3.108-1.475zM20.75 17.2c-.601 1.39-.93 2-1.752 3.22-1.137 1.66-2.742 3.74-4.703 3.76-1.76.02-2.215-1.1-4.13-1.1-1.915 0-2.417 1.08-4.164 1.12-1.977.04-3.486-1.79-4.63-3.45C-.14 18.4-.864 14.3.987 11.53 2.142 9.81 3.98 8.8 5.69 8.77c1.887-.04 3.07 1.03 4.126 1.03 1.05 0 2.678-1.27 4.523-1.08.77.03 2.94.31 4.33 2.36-3.78 2-3.168 7.12 2.08 6.12z" />
                  </svg>
                  <span className="text-sm font-medium">
                    Download on the App Store
                  </span>
                </Link>
              </div>
            </div>

            {/* Right visual */}
            <div className="relative h-[520px] md:h-[640px]">
              {/* Star backdrop */}
              <Image
                src="/images/orange-star.png"
                alt=""
                fill
                className="pointer-events-none select-none object-contain object-center opacity-90"
                priority
              />
              {/* Subtle floor fade so the hand blends into the background */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 40%)",
                  background:
                    "linear-gradient(to bottom, rgba(246,243,236,0) 0%, rgba(246,243,236,1) 75%)",
                }}
              />
              {/* Hand + phone */}
              <div className="absolute inset-0 -right-6 top-4 mx-auto flex items-end justify-center md:right-0">
                <Image
                  src="/images/hand.png"
                  alt="Zaha app in hand"
                  width={720}
                  height={720}
                  className="drop-shadow-2xl"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Light vignette edges on very large screens */}
          <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-7xl md:block">
            <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-black/5 blur-3xl" />
            <div className="absolute -right-24 bottom-10 h-64 w-64 rounded-full bg-black/5 blur-3xl" />
          </div>

          {/* trust bar */}
          <div className="mt-14 w-full">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">
              Works with
            </p>
            <div className="mx-auto grid max-w-3xl grid-cols-3 items-center gap-6 opacity-80 sm:grid-cols-6">
              {["iCloud", "Google", "Outlook", "Slack", "Notion", "Drive"].map(
                (x) => (
                  <div
                    key={x}
                    className="h-8 rounded-md border border-black/5 bg-white/70 text-center text-xs leading-8"
                  >
                    {x}
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      </main>

      {/* HERO */}
      {/* <section
        ref={ref}
        className="relative overflow-hidden border-b border-black/[0.06] bg-[radial-gradient(60%_40%_at_10%_10%,#B9A8FF20,transparent_60%),radial-gradient(60%_40%_at_90%_20%,#D96E4320,transparent_60%),radial-gradient(60%_40%_at_50%_90%,#66785F20,transparent_60%)]"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-white/0" />
        <Container className="relative z-10">
          <div className="flex flex-col items-center py-16 sm:py-20">
            <Badge variant="secondary" className="mb-4 bg-white/80">
              New • Smart Scheduling
            </Badge>
            <h1 className="mx-auto max-w-3xl text-center text-4xl font-serif leading-tight tracking-tight sm:text-5xl">
              Reimagine the <span className="italic">way you plan.</span>
            </h1>
            <p className="mt-3 max-w-2xl text-center text-[15px] text-neutral-600">
              A calmer way to schedule your day, track tasks, and keep momentum.
              Designed to feel soft, fast, and intentional.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <Button className="gap-2">
                Try it free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline">View demo</Button>
            </div>

         
            <motion.div
              style={{ y: phoneY, scale: phoneScale }}
              className="relative mt-12 h-[520px] w-[280px] sm:h-[560px] sm:w-[300px]"
            >
              <Glass className="absolute inset-0 p-3">
                <MockPhone />
              </Glass>
            </motion.div>
 
            <div className="mt-14 w-full">
              <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-neutral-500">
                Works with
              </p>
              <div className="mx-auto grid max-w-3xl grid-cols-3 items-center gap-6 opacity-80 sm:grid-cols-6">
                {[
                  "iCloud",
                  "Google",
                  "Outlook",
                  "Slack",
                  "Notion",
                  "Drive",
                ].map((x) => (
                  <div
                    key={x}
                    className="h-8 rounded-md border border-black/5 bg-white/70 text-center text-xs leading-8"
                  >
                    {x}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section> */}

      {/* Your existing custom sections */}

      <BentoGrid />

      {/* <section className=" ">
        <div className="mx-auto max-w-xl px-6 py-20 text-center ">
          <blockquote className="mx-auto max-w-4xl text-balance text-3xl font-semibold  text-black sm:text-5xl md:text-2xl">
            <span className="align-top text-4xl sm:text-6xl md:text-4xl trac">
              “
            </span>
            <span className="leading-tight tracking-4">
              Boosted our productivity and streamlined tasks azdazda{" "}
            </span>
            <span className="align-top text-4xl sm:text-6xl md:text-4xl ">
              ”
            </span>
          </blockquote>

          <div className="mt-14 flex   text-left items-center gap-5 justify-center ">
            <div
              className="h-16 w-16 rounded-full bg-neutral-200"
              aria-hidden="true"
            />
            <div className="space-y-0">
              <div className="text-2xl font-semibold tracking-tight text-black sm:text-xl">
                Jhon Bisbik
              </div>
              <div className="text-lg text-neutral-600 sm:text-lmd">
                Project Manager
              </div>
            </div>
          </div>
        </div>
      </section> */}

      <section className="py-16">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ">
          {" "}
          <BecomeSellerCTA />
        </div>
      </section>

      {/* ---------------------- Zaha Alt Sections (requested) ---------------------- */}
      <AltSection
        id="browse"
        kicker="Marketplace"
        title="Browse the market in one go"
        desc="Step into Morocco’s creative world — discover handcrafted treasures, from silver jewelry to woven sweaters. Personalize what you love and have it made just for you."
        cta="Explore categories"
        image={
          <div className="space-y-3">
            <PlaceholderImg w={1000} h={600} text="Marketplace Grid" />
            <div className="grid grid-cols-3 gap-3">
              <PlaceholderImg w={320} h={200} text="Silver jewelry" />
              <PlaceholderImg w={320} h={200} text="Woven sweaters" />
              <PlaceholderImg w={320} h={200} text="Ceramics & more" />
            </div>
          </div>
        }
      />

      <AltSection
        reverse
        id="collections"
        kicker="Store"
        title="Product & Collections management"
        desc="Bring order to your creativity. Manage your pieces, create beautiful collections, and keep your shop organized — all in one simple, intuitive space made for makers."
        cta="See the seller tools"
        image={
          <div className="space-y-3">
            <PlaceholderImg w={1000} h={560} text="Seller Dashboard" />
            <div className="grid grid-cols-2 gap-3">
              <PlaceholderImg w={480} h={260} text="Create collection" />
              <PlaceholderImg w={480} h={260} text="Inventory list" />
            </div>
          </div>
        }
      />

      <AltSection
        id="trust"
        kicker="Community"
        title="Build trust that lasts"
        desc="Let your work speak for itself. Earn glowing reviews, connect with real buyers, and grow your reputation in a community built on craftsmanship and care."
        cta="How reviews work"
        image={
          <div className="space-y-3">
            <PlaceholderImg w={1000} h={560} text="Shop Reviews" />
            <div className="grid grid-cols-3 gap-3">
              <PlaceholderImg w={320} h={220} text="5★ from Leila" />
              <PlaceholderImg w={320} h={220} text="4.8★ average" />
              <PlaceholderImg w={320} h={220} text="Buyer photos" />
            </div>
          </div>
        }
      />

      {/* ----------------------------- Testimonials ------------------------------ */}
      {/* <section id="testimonials" className="bg-white py-24 sm:py-28">
        <Container>
          <div className="text-center">
            <h3 className="text-3xl sm:text-4xl font-semibold text-[#0B1020]">
              Trusted by hundreds of Moroccan creators
            </h3>
            <p className="mt-3 text-lg text-neutral-600">
              Rated 4.8 stars by artisans, designers, and small brands using
              Zaha every day.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Amina B.",
                role: "Ceramic Artist",
                quote:
                  "Zaha helped me reach customers across Morocco. It feels like a real home for artisans who care about craft and detail.",
              },
              {
                name: "Rachid K.",
                role: "Leather Goods Maker",
                quote:
                  "The process of managing my shop is so simple now — I can focus on creating, not just selling. Orders are smooth and organized.",
              },
              {
                name: "Siham E.",
                role: "Jewelry Designer",
                quote:
                  "I started selling my handcrafted jewelry on Zaha and quickly built a loyal audience that appreciates Moroccan artistry.",
              },
              {
                name: "Youssef T.",
                role: "Textile Weaver",
                quote:
                  "Zaha gave me visibility I never had before. It’s more than a platform — it’s a creative ecosystem for makers.",
              },
              {
                name: "Khadija L.",
                role: "Fashion Designer",
                quote:
                  "Finally, a marketplace that understands Moroccan design. I love the attention to detail in every part of the platform.",
              },
              {
                name: "Hassan D.",
                role: "Wood Craftsman",
                quote:
                  "My handmade furniture now reaches homes across the country. Zaha made it possible to grow while staying true to my craft.",
              },
            ].map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-black/10 bg-white p-8 transition"
              >
        
                <div className="flex items-center gap-1 text-[#D3A813]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-5 w-5"
                    >
                      <path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
                    </svg>
                  ))}
                  <span className="ml-2 text-sm font-medium text-neutral-700">
                    5.0
                  </span>
                </div>

      
                <p className="mt-4 text-lg leading-relaxed text-neutral-800">
                  “{t.quote}”
                </p>
 
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-neutral-200">
                    <img
                      src={`https://picsum.photos/seed/${encodeURIComponent(
                        t.name
                      )}/80/80`}
                      alt={t.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium text-[#0B1020]">{t.name}</p>
                    <p className="text-sm text-neutral-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section> */}

      <ZahaUseCases />

      <TestimonialsMasonry />

      {/* ------------------------- Founder Message + Logo ------------------------ */}
      {/* <FounderMessage /> */}

      {/* ---------------------------------- FAQ --------------------------------- */}
      <FAQSection />

      {/* ---------------------------- CTA Banner (pre-footer) -------------------- */}
      <CTABanner />

      {/* --------------------------------- Footer -------------------------------- */}
      <EnhancedFooter />
    </main>
  );
}

/* ------------------------------ Hero Mockups ------------------------------ */

function MockPhone({ tab = "today" as "today" | "calendar" }) {
  return (
    <div className="h-full w-full rounded-[28px] border border-black/10 bg-white p-3">
      <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-neutral-200" />
      <Tabs defaultValue={tab} className="mt-2">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-neutral-100">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-3">
          <div className="space-y-2">
            <GlassRow title="Daily standup" badge="9:30" />
            <GlassRow title="Design review" badge="11:00" tone="lilac" />
            <GlassRow title="Lunch & walk" badge="13:00" tone="olive" />
            <GlassRow title="Focus block" badge="14:00" tone="sand" />
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
            {Array.from({ length: 28 }).map((_, i) => (
              <div
                key={i}
                className={`aspect-square rounded-md border border-black/5 ${
                  i % 5 === 0 ? "bg-[#B9A8FF22]" : "bg-white"
                }`}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GlassRow({
  title,
  badge,
  tone = "default" as "default" | "lilac" | "olive" | "sand",
}: {
  title: string;
  badge: string;
  tone?: "default" | "lilac" | "olive" | "sand";
}) {
  const badgeBg =
    tone === "lilac"
      ? "bg-[#B9A8FF22] text-[#0B1020]"
      : tone === "olive"
        ? "bg-[#66785F22] text-[#0B1020]"
        : tone === "sand"
          ? "bg-[#F6F3EC] text-[#0B1020]"
          : "bg-neutral-100 text-neutral-700";
  return (
    <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-neutral-200" />
        <div className="text-[13px] font-medium">{title}</div>
      </div>
      <div className={`rounded-md px-2 py-0.5 text-[11px] ${badgeBg}`}>
        {badge}
      </div>
    </div>
  );
}

function MiniGlass({
  title,
  subtitle,
  children,
}: React.PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <Glass className="p-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-12 rounded-lg bg-neutral-200" />
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-neutral-500">{subtitle}</div>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </Glass>
  );
}

function DemoBlock({ n = 3 }: { n?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="aspect-[4/3] rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}

function DemoGrid() {
  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-md bg-neutral-100" />
      ))}
    </div>
  );
}

function DemoStats() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-3/5 rounded bg-neutral-100" />
      <div className="h-3 w-2/5 rounded bg-neutral-100" />
      <div className="h-24 rounded-lg bg-neutral-100" />
    </div>
  );
}

/* --------------------------- Alternating section --------------------------- */

function AltSection({
  id,
  reverse,
  kicker,
  title,
  desc,
  cta,
  image,
}: {
  id?: string;
  reverse?: boolean;
  kicker: string;
  title: string;
  desc: string;
  cta: string;
  image: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white py-16">
      <Container>
        <div
          className={`grid grid-cols-1 items-center gap-8 sm:grid-cols-2 ${
            reverse ? "sm:[&>*:first-child]:order-2 sm:place-items-center" : ""
          }`}
        >
          <div>
            <Badge className="bg-neutral-100 text-neutral-700 text-sm shadow-none rounded-full py-2 px-4 font-medium pointer-events-none">
              {kicker}
            </Badge>
            <h3 className="text-4xl font-semibold mb-6 max-w-sm mt-10">
              {title}
            </h3>
            <p className="mt-2 text-neutral-600 max-w-sm mb-8">{desc}</p>
            <Button variant="link" className="mt-2 px-0 m-0 !p-0 text-md">
              {cta} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(50%_40%_at_20%_20%,#B9A8FF15,transparent_60%),radial-gradient(50%_40%_at_80%_30%,#D96E4315,transparent_60%)]" />
            <Glass className="p-4">{image}</Glass>
          </div>
        </div>
      </Container>
    </section>
  );
}

function CardShot({ variant }: { variant: "calendar" | "workflow" | "focus" }) {
  if (variant === "workflow") {
    return (
      <div className="space-y-3">
        <GlassRow title="Template: Weekly plan" badge="Active" tone="lilac" />
        <GlassRow title="Template: Retro notes" badge="Ready" tone="sand" />
        <GlassRow title="Template: Sprint" badge="2d" />
      </div>
    );
  }
  if (variant === "focus") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <div className="text-sm font-medium">Focus mode</div>
          </div>
          <p className="mt-2 text-sm text-neutral-600">
            Hide distractions and show only the current block.
          </p>
          <Button className="mt-3">Start 25:00</Button>
        </div>
        <GlassRow title="Deep work: Design" badge="14:00" tone="olive" />
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <div className="text-sm font-medium">Calendar sync</div>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Two-way with Google, iCloud, and Outlook.
        </p>
      </div>
      <GlassRow title="1:1 with Alex" badge="10:00" tone="lilac" />
      <GlassRow title="Team planning" badge="16:00" tone="sand" />
    </div>
  );
}

/* --------------------------------- Features -------------------------------- */

const FEATURES = [
  {
    icon: Zap,
    title: "Auto-plan",
    desc: "Let the scheduler place tasks between meetings with one click.",
  },
  {
    icon: Settings,
    title: "Custom rules",
    desc: "Buffers, no-meeting zones, and preferred hours for deep work.",
  },
  {
    icon: Shield,
    title: "Private by default",
    desc: "Your data is encrypted at rest and in transit.",
  },
  {
    icon: Bell,
    title: "Gentle nudges",
    desc: "Smart reminders that never nag or overwhelm.",
  },
  {
    icon: MessageSquare,
    title: "Team updates",
    desc: "Lightweight comments and mentions on any task.",
  },
  {
    icon: Check,
    title: "Keyboard first",
    desc: "Slash commands for everything, from labels to templates.",
  },
];

/* ------------------------------- Testimonials ------------------------------ */

const TESTIMONIALS = [
  {
    name: "Sami T.",
    role: "Product Manager",
    quote:
      "The only planner that lowered my heart rate. It feels like it respects my day.",
  },
  {
    name: "Aïcha R.",
    role: "Founder",
    quote:
      "The soft UI and automations finally made me stop dreading my calendar.",
  },
  {
    name: "Youssef K.",
    role: "Designer",
    quote: "It’s like Notion’s calm cousin who actually moves tasks on time.",
  },
];

/* --------------------------------- Pricing --------------------------------- */

function PriceCard({
  title,
  price,
  unit,
  highlights,
  featured,
}: {
  title: string;
  price: string;
  unit: string;
  highlights: string[];
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 ${
        featured
          ? "border-black/10 bg-[radial-gradient(60%_40%_at_80%_10%,#B9A8FF20,transparent_60%),radial-gradient(60%_40%_at_10%_80%,#D96E4315,transparent_60%)]"
          : "border-black/10 bg-white/70"
      } backdrop-blur`}
    >
      {featured && (
        <span className="absolute -top-2 right-4 rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px]">
          Most popular
        </span>
      )}
      <div className="text-sm font-medium text-neutral-500">{title}</div>
      <div className="mt-2 flex items-end gap-1">
        <div className="text-3xl font-semibold">{price}</div>
        <div className="pb-1 text-sm text-neutral-500">{unit}</div>
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {highlights.map((h) => (
          <li key={h} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-5 w-full">Choose plan</Button>
    </div>
  );
}

/* ---------------------------- Founder Message ------------------------------ */

function FounderMessage() {
  return (
    <section className="relative overflow-hidden bg-[#F6F3EC] py-20 sm:py-24">
      <Container>
        <div className="relative mx-auto max-w-3xl text-center">
          {/* Logo floating */}
          <div className="mx-auto -mt-14 mb-6 h-16 w-16 rounded-2xl border border-black/10 bg-white shadow-sm ring-1 ring-black/5 flex items-center justify-center">
            {/* Replace with your logo Image if you want */}
            <div className="h-8 w-8 rounded-md bg-[#B9A8FF]" />
          </div>

          <div className="rounded-3xl border border-black/10 bg-white p-8 sm:p-12 shadow-[0_10px_30px_rgba(0,0,0,0.05)]">
            <p className="text-xl leading-relaxed text-[#0B1020]">
              “Zaha is for people who make real things — the kind you can feel.
              We’re building a calm, modern marketplace where Moroccan craft
              thrives and buyers meet the makers behind every piece.”
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 text-left">
              <div className="h-12 w-12 overflow-hidden rounded-full bg-neutral-200">
                <img
                  src="https://picsum.photos/seed/founder/80/80"
                  alt="Founder"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="font-semibold text-[#0B1020]">Yazid Talbi</div>
                <div className="text-sm text-neutral-600">
                  Founder, Zaha — Tetouan, Morocco
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ----------------------------- Testimonials Masonry ----------------------------- */

function TestimonialsMasonry() {
  return (
    <section id="testimonials" className="bg-[#F6F3EC] py-24 sm:py-28">
      <Container>
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="text-3xl sm:text-4xl font-semibold text-[#0B1020]">
            What creators say
          </h3>
          <p className="mt-3 text-neutral-600">
            Real words from Moroccan artisans, designers, and small brands.
          </p>
        </div>

        {/* Masonry: use CSS columns + break-inside to avoid gaps */}
        <div className="mx-auto mt-12 max-w-6xl columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
          {TESTIMONIALS_MASONRY.map((t) => (
            <article
              key={t.name + t.role}
              className="mb-6 break-inside-avoid rounded-2xl border border-black/10 bg-white p-6 sm:p-7 "
            >
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-200">
                  <img
                    src={`https://picsum.photos/seed/${encodeURIComponent(t.name)}/96/96`}
                    alt={t.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <div className="font-semibold text-[#0B1020]">{t.name}</div>
                  <div className="text-[11px] tracking-wide text-neutral-500">
                    {t.role}
                  </div>
                </div>
              </div>

              {/* Quote */}
              <p className="mt-4 text-[15px] leading-7 text-neutral-800">
                {t.quote}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}

const TESTIMONIALS_MASONRY = [
  {
    name: "Amina B.",
    role: "CERAMIC ARTIST",
    quote:
      "Zaha completely changed my reach. The interface is clean and the orders flow without stress. I can focus on crafting, not admin.",
  },
  {
    name: "Rachid K.",
    role: "LEATHER GOODS MAKER",
    quote:
      "From listings to delivery updates, everything feels designed for makers. My shop looks professional and sales are up.",
  },
  {
    name: "Emily Parker",
    role: "UX DESIGNER",
    quote:
      "The design flexibility blew me away. Customization is endless and lets me present my brand exactly how I imagined.",
  },
  {
    name: "Michael Johnson",
    role: "SALES DIRECTOR",
    quote:
      "Real-time insights helped our team make data-driven decisions. The dashboard is intuitive and fast on mobile.",
  },
  {
    name: "David Rodriguez",
    role: "SOFTWARE DEVELOPER",
    quote:
      "We finally have a marketplace that feels modern and reliable. Reviews, verified shops, and smooth checkout build trust.",
  },
  {
    name: "Lisa Martinez",
    role: "CUSTOMER SUPPORT SPECIALIST",
    quote:
      "Support has been excellent. Clear guidance during onboarding and quick help whenever we had questions.",
  },
  {
    name: "Alex Carter",
    role: "CEO — ATLAS STUDIO",
    quote:
      "Zaha aligned with our vision for excellence. It fostered a culture of collaboration with artisans we’d never have found before.",
  },
  {
    name: "Khadija L.",
    role: "FASHION DESIGNER",
    quote:
      "Finally a platform that understands Moroccan design. The attention to detail shows everywhere.",
  },
  {
    name: "Youssef T.",
    role: "TEXTILE WEAVER",
    quote:
      "Visibility I never had before. It’s a creative ecosystem where craft and community actually matter.",
  },
];

/* --------------------------------- FAQ ------------------------------------ */

/* --------------------------------- FAQ (2-col, big cards) -------------------------------- */

function FAQSection() {
  return (
    <section id="faq" className="bg-white py-24 sm:py-28">
      <Container>
        {/* Heading */}
        <div className="mx-auto max-w-4xl text-center">
          <h3 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#0B1020]">
            Frequently Asked Questions
          </h3>
          <p className="mt-3 text-base sm:text-lg text-neutral-500">
            How Zaha can benefit your business, understanding its features
          </p>
        </div>

        {/* 2-column grid */}
        <div className="mx-auto mt-12 max-w-5xl grid grid-cols-1 gap-5 md:grid-cols-2">
          {FAQ_ITEMS.map((item) => (
            <Accordion key={item.q} type="single" collapsible>
              <AccordionItem value="item" className="border-0">
                {/* Card */}
                <div className="rounded-2xl border border-black/10 bg-white  ">
                  <AccordionTrigger
                    className={[
                      "group w-full text-left px-6 sm:px-8 py-5 sm:py-6",
                      "text-[19px] sm:text-[21px] font-medium text-[#0B1020]",
                      "rounded-2xl",
                      "hover:no-underline",
                      "[&>svg]:hidden", // hide default chevron
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B9A8FF] focus-visible:ring-offset-2",
                      "flex items-center",
                    ].join(" ")}
                  >
                    <span className="pr-10">{item.q}</span>
                    {/* + turns to × */}
                    <span
                      className={[
                        "ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full",
                        "border border-black/10 text-[#0B1020] text-xl leading-none",
                        "transition-transform duration-200",
                        "group-data-[state=open]:rotate-45",
                      ].join(" ")}
                      aria-hidden
                    >
                      +
                    </span>
                  </AccordionTrigger>

                  <AccordionContent className="px-6 sm:px-8 pb-5 pt-0">
                    <p className="text-neutral-600 text-sm sm:text-[15px] leading-6">
                      {item.a}
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>
            </Accordion>
          ))}
        </div>
      </Container>
    </section>
  );
}

const FAQ_ITEMS = [
  {
    q: "How do fees work on Zaha?",
    a: "Opening a shop is free. Zaha takes a small service fee on each successful order to cover secure payments, support, and platform costs.",
  },
  {
    q: "Are sellers verified?",
    a: "Yes — verified shops display a badge after phone verification and basic checks. Buyers can also rely on reviews and photo proof from past orders.",
  },
  {
    q: "Can I request custom or personalized items?",
    a: "Absolutely. Many artisans offer personalization — add a note on the product page or message the seller to fine-tune materials, sizes, or engravings.",
  },
  {
    q: "How are orders tracked and delivered?",
    a: "Sellers choose delivery methods. You’ll see delivery windows at checkout and receive status updates from confirmed → shipped → delivered.",
  },
  {
    q: "Can I sell vintage or supplies?",
    a: "Yes — alongside handmade goods, we welcome vintage pieces and maker supplies that meet our quality guidelines.",
  },
  {
    q: "Is Zaha available on mobile?",
    a: "Zaha is built mobile-first: browse, chat, manage orders, and run your shop from any phone with an experience optimized for small screens.",
  },
];

/* ----------------------------- CTA Banner ---------------------------------- */

function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(60%_40%_at_15%_20%,#B9A8FF25,transparent_60%),radial-gradient(60%_40%_at_85%_30%,#D96E4325,transparent_60%),radial-gradient(60%_40%_at_50%_85%,#66785F25,transparent_60%)]">
      <Container className="relative z-10 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h3 className="text-3xl sm:text-4xl font-serif leading-tight text-[#0B1020]">
            Open your shop and reach buyers across Morocco
          </h3>
          <p className="mt-3 text-neutral-600">
            Create your storefront, list your first product, and start selling
            in minutes — no complex setup required.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button className="gap-2">
              Start selling <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline">Browse the marketplace</Button>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------ Enhanced Footer ---------------------------- */

function EnhancedFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-white">
      <Container className="grid grid-cols-1 gap-12 py-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        {/* Brand + newsletter */}
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-[#B9A8FF]" />
            <div className="text-sm font-semibold tracking-tight">Zaha</div>
          </div>
          <p className="mt-4 text-sm text-neutral-600">
            The Morocco-first marketplace for handmade, vintage, and creative
            goods.
          </p>

          <div className="mt-5">
            <div className="text-sm font-medium text-[#0B1020]">
              Get product updates
            </div>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-3 flex items-center gap-2"
            >
              <Input
                type="email"
                placeholder="you@example.com"
                className="bg-white"
                required
              />
              <Button type="submit">Subscribe</Button>
            </form>
            <p className="mt-2 text-xs text-neutral-500">
              We’ll never share your email. Unsubscribe anytime.
            </p>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <a
              href="#"
              aria-label="Instagram"
              className="rounded-full border border-black/10 p-2 hover:bg-neutral-50"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Twitter/X"
              className="rounded-full border border-black/10 p-2 hover:bg-neutral-50"
            >
              <Twitter className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="rounded-full border border-black/10 p-2 hover:bg-neutral-50"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Call"
              className="rounded-full border border-black/10 p-2 hover:bg-neutral-50"
            >
              <PhoneCall className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Columns */}
        <FooterCol
          title="Company"
          items={["About", "Blog", "Careers", "Press"]}
        />
        <FooterCol
          title="Product"
          items={["Features", "Pricing", "Changelog", "Status"]}
        />
        <FooterCol
          title="Resources"
          items={["Guides", "Community", "Help center", "Contact"]}
        />
      </Container>

      <div className="border-t border-black/[0.06] py-6 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} Zaha. All rights reserved.
      </div>
    </footer>
  );
}

/* --------------------------------- Footer col ------------------------------ */

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-neutral-600">
        {items.map((x) => (
          <li key={x}>
            <Link href="#" className="hover:text-neutral-900">
              {x}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
