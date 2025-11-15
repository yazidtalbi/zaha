// components/ZahaUseCases.tsx
"use client";

import React from "react";
import Image from "next/image";
import { Plus } from "lucide-react";

type UseCase = {
  id: string;
  label: string;
  title: string;
  body: string;
  highlight: string;
  cta: string;
  image: string;
};

const USE_CASES: UseCase[] = [
  {
    id: "artisans",
    label: "Artisans & makers",
    title: "Show your handmade pieces to buyers who actually care.",
    body: "Turn your ceramics, candles, calligraphy, and one-of-a-kind items into steady orders. Zaha brings you in front of people looking specifically for handmade, not mass-produced goods.",
    highlight: "“People now discover my work from cities I’ve never visited.”",
    cta: "See how artisans sell on Zaha",
    image: "/images/use-cases/artisan.png", // TODO: replace
  },
  {
    id: "fashion",
    label: "Fashion & textiles",
    title: "Sell jellabas, kaftans, bags and accessories with ease.",
    body: "Upload your styles, set your stock and sizing, and let Zaha handle discovery. From casual pieces to made-to-order, you reach fashion lovers across Morocco.",
    highlight:
      "“I manage my jellaba orders from one dashboard instead of 10 DMs.”",
    cta: "Explore fashion use cases",
    image: "/images/use-cases/fashion.png",
  },
  {
    id: "home",
    label: "Home & décor",
    title: "Turn your décor pieces into the soul of someone’s home.",
    body: "Rugs, pottery, wall art, lighting and tableware — Zaha helps you present them beautifully, tell the story behind each piece, and ship them to new homes.",
    highlight:
      "“My handmade lamps finally have a place that matches their vibe.”",
    cta: "See home & décor on Zaha",
    image: "/images/use-cases/home.png",
  },
  {
    id: "vintage",
    label: "Vintage finders",
    title: "Give your vintage treasures a second life.",
    body: "List your curated finds — from vintage posters to retro furniture — with clear photos and stories. Zaha connects you with people who love unique, pre-loved pieces.",
    highlight:
      "“Instead of storing them, I now curate and sell my vintage finds.”",
    cta: "Browse vintage stories",
    image: "/images/use-cases/vintage.png",
  },
  {
    id: "everyone",
    label: "Everyone on Zaha",
    title: "One marketplace, many creative paths.",
    body: "Whatever you make or collect, Zaha gives you a simple way to sell, manage orders and grow a brand that feels truly yours — all in one Moroccan marketplace.",
    highlight:
      "“Zaha feels like it was built for creators here, not just translated.”",
    cta: "Discover all seller types",
    image: "/images/use-cases/everyone.png",
  },
];

export default function ZahaUseCases() {
  const [activeId, setActiveId] = React.useState<string>("artisans");
  const active = USE_CASES.find((u) => u.id === activeId) ?? USE_CASES[0];

  return (
    <section className="bg-[#ff6424] py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Kicker */}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-[#0B1020]/60">
          For sellers
        </p>

        {/* Title */}
        <h2 className="mt-3 text-center text-3xl font-medium tracking-tight text-[#0B1020] sm:text-4xl">
          For creative minds of all kinds.
        </h2>

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
          {USE_CASES.map((useCase) => {
            const isActive = useCase.id === activeId;
            return (
              <button
                key={useCase.id}
                onClick={() => setActiveId(useCase.id)}
                className={`relative rounded-full px-3 py-1.5 transition ${
                  isActive
                    ? "bg-[#0B1020] text-[#F6F3EC]"
                    : "bg-white text-[#0B1020]/70 hover:bg-[#F0E7D7]"
                }`}
              >
                {useCase.label}
                {isActive && (
                  <span className="absolute bottom-[-6px] left-1/2 block h-[3px] w-6 -translate-x-1/2 rounded-full bg-[#D96E43]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main card */}
        <div className="mt-8 rounded-3xl bg-[#D96E43] p-6 text-[#FFF4E6] shadow-lg sm:p-8 lg:p-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr,1fr] md:items-center">
            {/* Text side */}
            <div>
              {/* Optional play button, like mymind */}
              <div className="mb-5 flex items-center">
                <button className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F5C9A3]/40 backdrop-blur">
                  <span className="ml-0.5 inline-block h-0 w-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-[#FFF4E6]" />
                </button>
              </div>

              <p className="text-2xl leading-snug sm:text-3xl">
                Showcase and sell{" "}
                <span className="italic">handmade pieces</span> and{" "}
                <span className="italic">unique finds</span> that buyers
                actually search for.
              </p>

              <p className="mt-4 text-sm leading-relaxed text-[#FFE2C9] sm:text-base">
                {active.body}
              </p>
            </div>

            {/* Image side */}
            <div className="relative h-56 w-full overflow-hidden rounded-2xl bg-[#F5C9A3]/40 sm:h-64 md:h-72">
              <Image
                src={active.image}
                alt={active.label}
                fill
                className="object-cover"
              />
            </div>
          </div>

          {/* Quote strip + CTA */}
          <div className="mt-8 inline-flex max-w-full flex-col gap-3 rounded-2xl bg-[#FFEFA7] px-5 py-4 text-[#20120A] shadow-md sm:inline-flex sm:flex-row sm:items-center sm:px-6 sm:py-5">
            <p className="flex-1 text-lg italic leading-snug sm:text-xl">
              {`“${active.highlight}”`}
            </p>
            <button className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#0B1020] px-4 py-2 text-xs font-medium uppercase tracking-wide text-white sm:mt-0">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0B1020]">
                <Plus size={12} />
              </span>
              <span>{active.cta}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
