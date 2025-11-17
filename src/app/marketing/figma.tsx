"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  Star,
  MessageSquare,
  Shield,
  Store,
  ArrowLeft,
  Download,
  Globe2,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Simple container helper to keep max-width consistent
function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

// Reusable pill header: (Our Manifesto), etc.
// Just change label / accentColor when you reuse it.
function SectionLabel({
  label,
  accentColor = "#F6B78B",
}: {
  label: string;
  accentColor?: string;
}) {
  return (
    <div className="flex justify-center">
      <div
        className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-medium bg-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.02)]"
        style={{ borderColor: accentColor }}
      >
        {/* Little star icon on the left */}
        <span
          className="h-4 w-4"
          style={{
            backgroundColor: accentColor,
            clipPath:
              "polygon(50% 0%, 65% 15%, 85% 15%, 100% 35%, 100% 65%, 85% 85%, 65% 85%, 50% 100%, 35% 85%, 15% 85%, 0% 65%, 0% 35%, 15% 15%, 35% 15%)",
          }}
        />
        <span className="text-[11px] tracking-[0.08em] uppercase text-neutral-800">
          {label}
        </span>
      </div>
    </div>
  );
}

// Star-shaped frame used for the bottom images / lilac shape
function StarFrame({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative h-24 w-24 sm:h-28 sm:w-28 lg:h-32 lg:w-32 overflow-hidden ${className}`}
      style={{
        clipPath:
          "polygon(50% 0%, 65% 12%, 82% 12%, 100% 30%, 100% 50%, 100% 70%, 82% 88%, 65% 88%, 50% 100%, 35% 88%, 18% 88%, 0% 70%, 0% 50%, 0% 30%, 18% 12%, 35% 12%)",
      }}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-6 text-center text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-neutral-900">
      {children}
    </h2>
  );
}

export function ManifestoSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <Container>
        {/* Header pill */}
        <SectionLabel label="Our Manifesto" accentColor="#F6B78B" />

        {/* Main manifesto text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-10 text-center text-[#0B1020]"
        >
          <p className="mx-auto max-w-3xl text-lg sm:text-xl leading-relaxed font-normal">
            In a time when everything is mass-produced, when speed replaces
            care, when creators are hidden behind algorithms and noise, our
            craft has little space to live.
          </p>

          <p className="mx-auto mt-6 max-w-3xl text-lg sm:text-xl leading-relaxed font-normal">
            Our stories are scattered across marketplaces, stripped of meaning.
            What should have never been lost is now yours again.
          </p>

          <p className="mt-10 text-xl sm:text-2xl font-semibold text-[#B9A8FF]">
            Welcome to Zaha.
          </p>
        </motion.div>

        {/* Bottom star shapes with placeholders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
          className="mt-14 sm:mt-16 flex items-center justify-center gap-10 sm:gap-14"
        >
          {/* Left: image placeholder in star */}
          <StarFrame className="bg-neutral-200">
            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600">
              Image placeholder
            </div>
          </StarFrame>

          {/* Center: lilac solid star */}
          <StarFrame className="bg-[#B9A8FF]" />

          {/* Right: image placeholder in star */}
          <StarFrame className="bg-neutral-200">
            <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600">
              Image placeholder
            </div>
          </StarFrame>
        </motion.div>
      </Container>
    </section>
  );
}

function PhonePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-[30px] bg-[#f6f5f7]">
      <div className="h-[82%] w-[72%] rounded-[30px] bg-neutral-300/80 flex items-center justify-center text-[10px] text-neutral-600">
        Image placeholder
      </div>
    </div>
  );
}

export function ScreensSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <Container>
        {/* Top label */}
        <SectionLabel label="Product preview" accentColor="#B9A8FF" />

        {/* BIG TITLE */}
        <SectionTitle>Marketplace like never before.</SectionTitle>

        {/* 3 Screens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-14 grid gap-10 md:grid-cols-3"
        >
          {[
            {
              title: "Your favorite stores",
              desc: "Explore curated Moroccan shops tailored to your taste.",
            },
            {
              title: "Track payments easily",
              desc: "Keep everything organized with a clean breakdown.",
            },
            {
              title: "A simpler home screen",
              desc: "Search, browse brands, and shop smarter.",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center mx-auto w-full max-w-xs"
            >
              {/* Phone Card */}
              <div className="rounded-[36px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.12)] p-5 w-full">
                <div className="aspect-9/16">
                  <PhonePlaceholder />
                </div>
              </div>

              {/* Text */}
              <h3 className="mt-6 text-lg font-semibold text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-neutral-600 max-w-[250px]">
                {item.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}

function GradientCard({
  gradient,
  children,
  className = "",
}: {
  gradient: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-4xl p-8 sm:p-10 ${className}`}
      style={{ background: gradient }}
    >
      {children}
    </div>
  );
}

export function GradientShowcaseSection() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <Container>
        {/* Header above the whole block */}
        <SectionLabel label="Showcase" accentColor="#FF8EB8" />
        <SectionTitle>Marketplace like never before.</SectionTitle>

        <p className="mt-4 max-w-2xl text-center text-sm sm:text-base text-neutral-600 mx-auto">
          A quick peek at how Zaha feels to use — calm layouts, focused screens,
          and everything made to let Moroccan craft shine.
        </p>

        {/* Content rows */}
        <div className="mt-20 space-y-24">
          {/* ROW 1 — text left, pink card right */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5 }}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            {/* Text */}
            <div className="max-w-md">
              <h3 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                Browse the market in one go.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">
                Step into Morocco’s creative world — discover handcrafted
                treasures, from silver jewelry to woven sweaters. Personalize
                what you love and have it made just for you.
              </p>
              <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#0D5D4D]">
                <span>Download the app</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Card */}
            <div className="flex justify-end">
              <GradientCard
                gradient="linear-gradient(180deg, #FF8EB8 0%, #FFE3F1 100%)"
                className="w-[260px] h-[260px] sm:w-[320px] sm:h-80 lg:w-[360px] lg:h-[360px] flex items-center justify-center"
              >
                <div className="h-[55%] w-[55%] rounded-2xl bg-white flex items-center justify-center text-[10px] text-neutral-500">
                  Image placeholder
                </div>
              </GradientCard>
            </div>
          </motion.div>

          {/* ROW 2 — purple card left, text right */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            {/* Card */}
            <div className="flex justify-start order-2 lg:order-1">
              <GradientCard
                gradient="linear-gradient(180deg, #C8A5FF 0%, #E9E4FF 100%)"
                className="w-[280px] h-[280px] sm:w-[340px] sm:h-80 lg:w-[380px] lg:h-[360px] flex items-center justify-center"
              >
                <div className="w-[75%] space-y-6">
                  <div className="h-[60px] rounded-2xl bg-white" />
                  <div className="h-[130px] rounded-2xl bg-white" />
                </div>
              </GradientCard>
            </div>

            {/* Text */}
            <div className="max-w-md order-1 lg:order-2">
              <h3 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                A calm space for your shop.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">
                Manage products, photos, and orders without noise. Zaha keeps
                everything clear and simple, so you can focus on making, not
                fighting with tabs and dashboards.
              </p>
              <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#0D5D4D]">
                <span>Open your shop</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>

          {/* ROW 3 — text left, grey card right */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid items-center gap-10 lg:grid-cols-2"
          >
            {/* Text */}
            <div className="max-w-md">
              <h3 className="text-2xl sm:text-3xl font-semibold text-neutral-900">
                See every order at a glance.
              </h3>
              <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">
                Follow each order from request to delivery in one clear view.
                Both you and your buyers always know what&apos;s next — no lost
                messages, no guessing.
              </p>
              <button className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#0D5D4D]">
                <span>See how it works</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Card */}
            <div className="flex justify-end">
              <GradientCard
                gradient="linear-gradient(180deg, #ECEBF0 0%, #F4F3F7 100%)"
                className="w-[280px] h-[260px] sm:w-[340px] sm:h-[300px] lg:w-[380px] lg:h-[340px] flex items-center justify-center"
              >
                <div className="h-[70%] w-[75%] rounded-2xl bg-[#E3E1EA] flex items-center justify-center text-[11px] text-neutral-600">
                  screens from app
                </div>
              </GradientCard>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

export function BecomeSellerCTA() {
  return (
    <section className="bg-[#F3ECFF] py-20 rounded-[40px] sm:rounded-[50px]">
      <Container>
        <div className="grid items-center gap-12 sm:gap-16 lg:grid-cols-2">
          {/* LEFT — Star image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center lg:justify-start"
          >
            <StarFrame>
              <div className="h-full w-full bg-[#D9CCFF] flex items-center justify-center text-[11px] text-neutral-600">
                Image placeholder
              </div>
            </StarFrame>
          </motion.div>

          {/* RIGHT — Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-center lg:text-left"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1A0B32]">
              Become a seller
            </h2>

            <p className="mt-4 max-w-md text-sm sm:text-base leading-relaxed text-[#453B68] mx-auto lg:mx-0">
              Turn your craft into income. Create your shop, add your products,
              and start selling to buyers across Morocco.
            </p>

            <button className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1A0B32] px-6 py-3 text-sm font-medium text-white hover:bg-[#120825] transition">
              Become a seller now
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}

const USE_CASES = [
  {
    id: "artisans",
    label: "Artisans",
    title: "Give your craft a real home.",
    body: "Open a shop that reflects your style, not a generic grid. Share your story, your techniques, and the pieces you’re proud of.",
  },
  {
    id: "vintage",
    label: "Vintage Collectors",
    title: "Curate the finds you love.",
    body: "Turn your eye for rare, beautiful pieces into a shop. List one-of-a-kind items and connect with people who truly appreciate them.",
  },
  {
    id: "artists",
    label: "Artists",
    title: "Sell originals and prints with ease.",
    body: "From canvases to digital prints, Zaha lets you present your work cleanly, take custom requests, and keep control of your brand.",
  },
  {
    id: "makers",
    label: "Makers",
    title: "From idea to made-to-order.",
    body: "Offer made-to-order products, personalize details, and keep track of every order in one calm, focused dashboard.",
  },
  {
    id: "small-business",
    label: "Small Business Owners",
    title: "A storefront without the rent.",
    body: "Bring your existing business online, reach buyers across Morocco, and keep your shop open 24/7 without extra overhead.",
  },
  {
    id: "everyone",
    label: "Everyone",
    title: "Built for people who care about craft.",
    body: "Whether you’re just starting or already established, Zaha gives you the tools to sell things with soul, not just products.",
  },
];

const starClip =
  "polygon(50% 0%, 65% 15%, 85% 15%, 100% 35%, 100% 65%, 85% 85%, 65% 85%, 50% 100%, 35% 85%, 15% 85%, 0% 65%, 0% 35%, 15% 15%, 35% 15%)";

export function UseCasesSection() {
  const [activeId, setActiveId] = React.useState("artisans");
  const active = USE_CASES.find((c) => c.id === activeId)!;

  return (
    <section className="py-20 sm:py-24">
      <Container>
        <div className="rounded-[40px] bg-[#F9EEDB] px-4 py-12 sm:px-10 sm:py-16 lg:px-14 lg:py-18 shadow-sm">
          {/* Top pill */}
          <SectionLabel label="Use Cases" accentColor="#F6B78B" />

          {/* Title */}
          <h2 className="mt-6 text-center text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            For creative spirits of all kinds.
          </h2>

          {/* Tabs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm sm:text-base">
            {USE_CASES.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveId(item.id)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 transition",
                    isActive
                      ? "bg-[#5E3417] text-white shadow-sm"
                      : "text-[#7B4A23] hover:text-[#5E3417]",
                  ].join(" ")}
                >
                  {isActive && (
                    <span
                      className="h-4 w-4"
                      style={{
                        backgroundColor: "#F6B78B",
                        clipPath: starClip,
                      }}
                    />
                  )}
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content panel */}
          <div className="mt-10 sm:mt-12 rounded-4xl bg-white px-5 py-6 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-stretch">
              {/* Text side */}
              <div className="flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-3 sm:space-y-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#C28A55]">
                      {active.label}
                    </p>
                    <h3 className="text-xl sm:text-2xl font-semibold text-neutral-900">
                      {active.title}
                    </h3>
                    <p className="text-sm sm:text-base leading-relaxed text-neutral-700 max-w-md">
                      {active.body}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Visual placeholder side */}
              <div className="flex items-center pt-4 lg:pt-0">
                <div className="h-52 w-full rounded-3xl bg-[#FDF8F0] border border-[#F4E2C9] flex items-center justify-center text-xs sm:text-sm text-neutral-400">
                  {/* replace this whole div with your real image/layout later */}
                  {`Placeholder for "${active.label}" image / screen`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

const TESTIMONIALS = [
  {
    id: 1,
    quote:
      "« J'aime trop. pas de stresse , on a l'option de prolonger la date de paiement , on a pas beaucoup de notifications dérangeantes , ça aide vraiment pour les grandes achats , vu qu'on paie en 3 fet ois , ça passe vite. »",
    name: "Jhon Bisbik",
    role: "Project Manager",
  },
  {
    id: 2,
    quote:
      "« accord immediat pour le 3 x sans frais, report de plusieurs jours en cas de difficulte pour une echeance. Bons services, j'en suis tres satisfait, je recommande, surtout pour les professionnels qui ne proposent pas encore ce service ; cela doperaient leurs ventes. »",
    name: "Jhon Bisbik",
    role: "Project Manager",
  },
  {
    id: 3,
    quote:
      "« Service clair et simple à utiliser, tout est bien expliqué dès le début. On se sent accompagné, pas perdu dans les conditions. »",
    name: "Sara L.",
    role: "Entrepreneuse",
  },
  {
    id: 4,
    quote:
      "« Une vraie bouffée d’air pour gérer les gros achats sans casser la trésorerie. Je l’utilise dès que c’est possible. »",
    name: "Yassine M.",
    role: "Designer",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)] items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            {/* Pill: Testimonials */}
            <div className="flex justify-start">
              <SectionLabel label="Testimonials" accentColor="#B9A8FF" />
            </div>

            {/* Avatar + heading + text */}
            <div className="space-y-8">
              {/* Avatar in star */}
              <div className="relative inline-flex items-center">
                <div
                  className="h-24 w-24 sm:h-28 sm:w-28 bg-[#B9A8FF]"
                  style={{ clipPath: starClip }}
                />
                <div className="absolute left-1/2 top-1/2 h-[84%] w-[84%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FBEFE5] flex items-center justify-center text-[11px] text-[#4A2F6E]">
                  Avatar
                </div>
              </div>

              {/* Text block */}
              <div>
                <h2 className="text-[28px] sm:text-[32px] lg:text-[34px] leading-tight font-semibold text-[#050014]">
                  Stories from
                  <br />
                  Community
                </h2>
                <p className="mt-3 max-w-xs text-[13px] sm:text-[14px] leading-relaxed text-[#4F455F]">
                  30 milles personnes adorent faire leurs achats et payer avec
                  Zaha partout.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN – carousel with two cards */}
          <div className="relative">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              {/* Arrows (top-right like in the design) */}
              <CarouselPrevious className="absolute -top-8 right-9 left-auto h-8 w-8 border-none bg-transparent shadow-none text-[#301A52] hover:bg-transparent hover:text-[#150424] focus-visible:ring-0">
                <ArrowLeft className="h-4 w-4" />
              </CarouselPrevious>
              <CarouselNext className="absolute -top-8 right-0 h-8 w-8 border-none bg-transparent shadow-none text-[#301A52] hover:bg-transparent hover:text-[#150424] focus-visible:ring-0">
                <ArrowRight className="h-4 w-4" />
              </CarouselNext>

              <CarouselContent className="-ml-4">
                {TESTIMONIALS.map((t) => (
                  <CarouselItem key={t.id} className="pl-4 md:basis-1/2">
                    <div className="flex h-full flex-col justify-between rounded-4xl bg-[#F5ECFF] px-8 py-10 sm:px-10 sm:py-12 min-h-[340px]">
                      <p className="text-[17px] sm:text-[18px] leading-relaxed font-medium text-[#150424]">
                        {t.quote}
                      </p>

                      <div className="mt-10 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-[#4D3B7C]" />

                        <div>
                          <p className="text-[15px] sm:text-[16px] font-semibold text-[#150424]">
                            {t.name}
                          </p>
                          <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#6E5C97]">
                            {t.role}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </Container>
    </section>
  );
}

// Little pill exactly like your green header
function FAQLabel() {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#A5FF5F] px-5 py-1.5 text-xs font-medium bg-black/80 backdrop-blur">
        <span
          className="h-4 w-4"
          style={{
            backgroundColor: "#A5FF5F",
            clipPath: starClip,
          }}
        />
        <span className="text-[11px] uppercase tracking-[0.16em] text-[#E7FFE0]">
          FAQ
        </span>
      </div>
    </div>
  );
}

const LEFT_FAQ = [
  {
    q: "Comment Zaha protège-t-elle les acheteurs ?",
    a: "Chaque boutique est vérifiée avant la mise en ligne. Nous examinons l’identité du vendeur, ses produits et ses informations de contact afin de réduire au maximum les mauvaises surprises.",
  },
  {
    q: "Est-ce que Zaha est réservé aux créateurs marocains ?",
    a: "Zaha est pensée d’abord pour les créateurs et boutiques basés au Maroc. Vous pouvez vendre tant que vos produits sont expédiés depuis le pays.",
  },
  {
    q: "Dois-je avoir déjà une entreprise pour vendre ?",
    a: "Non. Vous pouvez commencer en tant que créateur indépendant. Nous vous recommandons néanmoins de vous renseigner sur les obligations légales et fiscales de votre situation.",
  },
];

const RIGHT_FAQ = [
  {
    q: "Quels moyens de paiement sont disponibles ?",
    a: "Nous mettons en avant les solutions adaptées au marché marocain, comme le paiement à la livraison et les méthodes locales. D’autres options arriveront progressivement.",
  },
  {
    q: "Combien de temps faut-il pour ouvrir une boutique ?",
    a: "En quelques minutes seulement : créez votre boutique, ajoutez vos premiers produits et vous pouvez déjà commencer à recevoir des commandes.",
  },
  {
    q: "Y a-t-il des frais cachés ?",
    a: "Non. Les frais appliqués sont clairement indiqués avant la mise en ligne de vos produits. Pas de surprises en fin de mois.",
  },
];

export function FAQSection() {
  return (
    <section className="bg-black py-20 sm:py-24 text-white">
      <Container>
        {/* Green pill */}
        <FAQLabel />

        {/* Title + intro */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mt-8 text-center"
        >
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Questions fréquentes.
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Tout ce que les créateurs et acheteurs demandent le plus à propos de
            Zaha, regroupé au même endroit.
          </p>
        </motion.div>

        {/* FAQ grid */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
          className="mt-12 grid gap-8 md:grid-cols-2"
        >
          {/* Left column */}
          <Accordion type="single" collapsible className="space-y-3">
            {LEFT_FAQ.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`left-${idx}`}
                className="border-none bg-[#050508] rounded-2xl px-5 py-3"
              >
                <AccordionTrigger className="text-sm sm:text-[15px] font-medium text-white hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pt-1 text-sm text-neutral-400 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Right column */}
          <Accordion type="single" collapsible className="space-y-3">
            {RIGHT_FAQ.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`right-${idx}`}
                className="border-none bg-[#050508] rounded-2xl px-5 py-3"
              >
                <AccordionTrigger className="text-sm sm:text-[15px] font-medium text-white hover:no-underline">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pt-1 text-sm text-neutral-400 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </Container>
    </section>
  );
}

export function FinalCTABanner() {
  return (
    <section
      className="py-16 sm:py-20"
      style={{
        background:
          "linear-gradient(180deg, #B9A8FF 0%, #F3E6FF 45%, #F6ECFF 100%)",
      }}
    >
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-[40px] bg-[#1A082B] px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-14 text-white shadow-[0_26px_80px_rgba(12,1,32,0.6)]"
        >
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* LEFT: text */}
            <div className="space-y-6">
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] leading-tight font-semibold">
                Dive into the world
                <br />
                of shopping
              </h2>

              <p className="max-w-md text-sm sm:text-base leading-relaxed text-[#E3D4FF]">
                Turn your craft into income. Create your shop, add your
                products, and start selling to buyers across Morocco.
              </p>

              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#C6A6FF] px-5 py-3 text-sm sm:text-[15px] font-semibold text-[#1A082B] hover:bg-[#D2B8FF] transition">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1A082B] text-white">
                  <Download className="h-3 w-3" />
                </span>
                <span>Download on the App Store now</span>
              </button>
            </div>

            {/* RIGHT: phone + star outline */}
            <div className="relative flex justify-center lg:justify-end">
              {/* star outline */}
              <div
                className="absolute inset-y-6 right-10 hidden lg:block border border-[#D9C5FF] opacity-70"
                style={{ clipPath: starClip }}
              />

              {/* phone placeholder */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: 8 }}
                whileInView={{ opacity: 1, y: 0, rotate: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
                className="relative z-10"
              >
                <div className="h-[260px] w-[150px] sm:h-[290px] sm:w-[170px] rounded-[34px] border border-[#F4D89B] bg-[#13051F] overflow-hidden shadow-[0_26px_60px_rgba(0,0,0,0.7)]">
                  {/* Replace this whole inner block with your <Image /> later */}
                  <div className="flex h-full w-full flex-col justify-between">
                    <div className="p-4">
                      <div className="h-2 w-16 rounded-full bg-[#3A284F]" />
                      <div className="mt-4 text-[26px] font-semibold text-[#F8F3FF]">
                        34,60 €
                      </div>
                      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#9C8BC7]">
                        Total cashback gagné
                      </div>
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between text-[11px] text-[#F3EBFF]">
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-[#F5B200]" />
                          <span>Enatterie</span>
                        </span>
                        <span className="text-[#45E191]">+5,50 €</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#F3EBFF] opacity-80">
                        <span className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-[#FF5B5B]" />
                          <span>Marché local</span>
                        </span>
                        <span className="text-[#45E191]">+2,30 €</span>
                      </div>
                      <div className="mt-4 h-8 rounded-2xl bg-[#F5B200]/10 text-[10px] text-center leading-8 text-[#F8F3FF]">
                        Screens from app – placeholder
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

export function ZahaFooter() {
  return (
    <footer className="bg-[#050014] text-white pt-16 pb-10 mt-24">
      <Container>
        {/* TOP GRID */}
        <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-5">
          {/* Market */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
              Market
            </h3>
            <button className="inline-flex items-center justify-between gap-3 rounded-2xl bg-[#131029] px-4 py-3 text-sm text-white/90 border border-white/10 min-w-[180px]">
              <span className="inline-flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-white/70" />
                <span>Morocco</span>
              </span>
              <ArrowRight className="h-4 w-4 text-white/60" />
            </button>
          </div>

          {/* Zaha */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
              Zaha
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  About us
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Press &amp; news
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Help center
                </Link>
              </li>
            </ul>
          </div>

          {/* For buyers */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
              For buyers
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  How Zaha works
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Discover shops
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Safe shopping
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Support for orders
                </Link>
              </li>
            </ul>
          </div>

          {/* For sellers */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
              For sellers
            </h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Open a shop
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Pricing &amp; fees
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Seller resources
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white transition-colors">
                  Seller login
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-white">
              Follow
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </Link>
              <Link
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-white/40 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* BIG WORDMARK */}
        <div className="relative mt-16 overflow-hidden">
          <p className="text-[76px] sm:text-[120px] lg:text-[180px] font-semibold tracking-tight text-white/4 leading-none select-none">
            ZAHA
          </p>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-6 border-t border-white/10 pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-[13px] text-white/50">
          <div className="space-y-1">
            <p>© zaha, inc. 2025</p>
            <p>
              Made with love <span className="text-[#FF9EBB]">♡</span> from
              Morocco
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="#" className="hover:text-white transition-colors">
              Terms &amp; Conditions
            </Link>
            <span className="hidden sm:inline text-white/30">∙</span>
            <Link href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="hidden sm:inline text-white/30">∙</span>
            <Link href="#faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}

// Generic placeholder box for images
function ImagePlaceholder({
  label = "Image placeholder",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={
        "flex items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-100 text-xs text-neutral-500 " +
        className
      }
    >
      {label}
    </div>
  );
}

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-[#F6F3EC] text-[#0B1020]">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-white pt-16 pb-20">
        <Container>
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            {/* Left: copy */}
            <div className="space-y-6">
              <Badge className="bg-neutral-100 text-neutral-700 shadow-none rounded-full px-4 py-2 text-xs font-medium tracking-tight">
                For lovers of things with soul
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
                The home for{" "}
                <span className="text-[#D96E43]">Moroccan creators</span> and
                handmade goods.
              </h1>

              <p className="max-w-xl text-base sm:text-lg text-neutral-600 leading-relaxed">
                Discover shops run by real artisans, not factories. Buy pieces
                with a story, support local makers, and keep Moroccan craft
                alive.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="rounded-full px-6 text-sm font-medium"
                >
                  Start exploring
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="ghost"
                  className="rounded-full text-sm font-medium text-neutral-800 hover:bg-neutral-100"
                >
                  Become a seller
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs sm:text-sm text-neutral-500">
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-[#D96E43] text-[#D96E43]" />
                  <span>Trusted Moroccan shops</span>
                </div>
                <div className="h-4 w-px bg-neutral-300 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#0D5D4D]" />
                  <span>Verified sellers only</span>
                </div>
              </div>
            </div>

            {/* Right: hero visual placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              <ImagePlaceholder
                label="Hero image / phone mockups"
                className="aspect-4/5 w-full"
              />
            </motion.div>
          </div>
        </Container>
      </section>

      <ManifestoSection />
      <ScreensSection />
      <GradientShowcaseSection />
      <BecomeSellerCTA />
      <UseCasesSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTABanner />
      <ZahaFooter />

      {/* Section: “For all kinds of creators” (example) */}
      <section className="bg-[#F6F3EC] py-16 sm:py-20">
        <Container>
          <div className="flex flex-col gap-8 sm:gap-10">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                For all kinds of creators.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-neutral-600 leading-relaxed">
                From tailors and ceramic artists to woodworkers and jewelry
                makers, Zaha gives every creator the tools to open a shop, get
                discovered, and sell without losing their identity.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              {[
                "Tailors & fashion makers",
                "Jewelry & accessories",
                "Wood, pottery & decor",
              ].map((title) => (
                <Card
                  key={title}
                  className="border-0 bg-white shadow-sm rounded-2xl"
                >
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    <ImagePlaceholder
                      label="Creator image"
                      className="mb-3 aspect-4/3 w-full"
                    />
                    <h3 className="text-sm sm:text-base font-semibold">
                      {title}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                      Describe how this type of creator uses Zaha. We’ll keep
                      the copy short and focused so it’s easy to scan.
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Section: “Your shop dashboard” */}
      <section className="bg-white py-16 sm:py-20 border-y border-neutral-200">
        <Container>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 items-center">
            <div className="space-y-4 sm:space-y-6">
              <Badge className="bg-neutral-100 text-neutral-700 shadow-none rounded-full px-4 py-2 text-xs font-medium">
                Your shop
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight max-w-md">
                Add products, track orders, and manage your shop in one simple
                dashboard.
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed max-w-lg">
                A clean, focused dashboard designed for real artisans, not
                growth hackers. See new orders, update stock, and respond to
                buyers without getting lost.
              </p>

              <ul className="mt-4 space-y-2 text-sm sm:text-base text-neutral-700">
                {[
                  "Get notified instantly when a new order arrives.",
                  "Edit products, prices, and photos without breaking anything.",
                  "See what’s selling best so you can focus your craft.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0D5D4D]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <ImagePlaceholder
                label="Dashboard UI mockup"
                className="aspect-4/3 w-full"
              />
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Testimonials */}
      <section className="bg-[#0B1020] py-16 sm:py-20 text-white">
        <Container>
          <div className="flex flex-col gap-8">
            <div className="space-y-3 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-400">
                Testimonials
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                What Moroccan sellers say about Zaha.
              </h2>
              <p className="mx-auto max-w-2xl text-sm sm:text-base text-neutral-300">
                Real stories from artisans who turned their craft into a shop
                people can find, trust, and come back to.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card
                  key={i}
                  className="border-0 bg-[#111629] text-white/90 rounded-2xl"
                >
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-700">
                      <ImagePlaceholder
                        label="Avatar"
                        className="h-full w-full"
                      />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        Seller name
                      </CardTitle>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">
                        Creator type · City
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className="h-3.5 w-3.5 fill-[#D96E43] text-[#D96E43]"
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-neutral-200">
                      “Short quote about how Zaha helped them sell, keep control
                      of their brand, and reach people who care about handmade
                      work.”
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
            <div className="space-y-4 sm:space-y-5">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                FAQ
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
                Answers for curious buyers and sellers.
              </h2>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Everything you need to know about opening a shop, ordering from
                local makers, and how Zaha protects both sides.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-sm sm:text-base font-medium">
                  How does Zaha verify shops?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed">
                  We review each seller before they go live, checking their
                  identity, product photos, and shop details. Verified shops
                  receive a badge so buyers know they’re dealing with a real
                  artisan.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-sm sm:text-base font-medium">
                  Is Zaha only for Moroccan creators?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed">
                  Zaha is built first for Moroccan makers and shops rooted in
                  Moroccan craft. Over time, we may open to other regions, but
                  the heart of the platform stays here.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-sm sm:text-base font-medium">
                  How do payments and delivery work?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-neutral-600 leading-relaxed">
                  You choose the delivery and payment options supported in your
                  area (like cash on delivery). Zaha helps keep everything
                  organized between buyers and sellers.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Container>
      </section>

      {/* Become a seller CTA */}
      <section className="bg-[#0D5D4D] py-14 sm:py-16 text-white">
        <Container>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3 sm:space-y-4 max-w-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-[#B9E6D3]">
                Become a seller
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Turn your craft into a shop people can find.
              </h2>
              <p className="text-sm sm:text-base text-[#E4F3EC] leading-relaxed">
                Open your shop in a few simple steps, upload photos of your
                products, and start selling to people who actually care about
                handmade work.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Button
                size="lg"
                className="rounded-full bg-white text-[#0D5D4D] hover:bg-neutral-100 text-sm font-medium"
              >
                Open your shop
                <Store className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-[#C7E7D7]">
                No monthly fee for early creators.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Footer (simple placeholder) */}
      <footer className="bg-[#0B1020] py-10 text-sm text-neutral-400">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p>Zaha · Built for Moroccan creators.</p>
            <div className="flex items-center gap-4">
              <Link href="#" className="hover:text-neutral-200">
                Privacy
              </Link>
              <Link href="#" className="hover:text-neutral-200">
                Terms
              </Link>
              <Link href="#" className="hover:text-neutral-200">
                Contact
              </Link>
            </div>
          </div>
        </Container>
      </footer>
    </main>
  );
}
