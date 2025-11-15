"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const tabs = [
  {
    label: "Artisans",
    eyebrow: "MADE FOR SHOPPERS",
    title: "Shop without distractions",
    description:
      "Secondary text placeholder ×Secondary text placeholder ×Secondary text placeholder.",
    cta: "Placeholder cta",
    image: "/images/example-1.jpg",
  },
  {
    label: "Vintage",
    eyebrow: "CURATED FOR YOU",
    title: "Each piece has a story",
    description:
      "Discover unique finds selected from timeless collections and local curators.",
    cta: "Explore vintage",
    image: "/images/example-2.jpg",
  },
  {
    label: "Local",
    eyebrow: "SUPPORT CREATORS",
    title: "Made close to home",
    description:
      "Support Moroccan artisans and independent makers bringing culture to life.",
    cta: "Discover artisans",
    image: "/images/example-3.jpg",
  },
];

export default function SoulSection() {
  const [active, setActive] = useState(0);
  const item = tabs[active];

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        {/* TABS */}
        <div className="flex flex-wrap justify-center gap-3 text-sm">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className={`rounded-full px-4 py-2 border transition-all ${
                active === i
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-neutral-300 hover:bg-neutral-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* CONTENT CONTAINER */}
        <div className="mt-12 rounded-[32px] bg-[#F6F3EC] p-10 md:p-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* TEXT AREA */}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col"
              >
                <span className="text-sm tracking-widest text-neutral-500 uppercase">
                  {item.eyebrow}
                </span>

                <h2 className="mt-2 text-3xl md:text-4xl font-semibold text-[#0B1020] leading-tight">
                  {item.title}
                </h2>

                <p className="mt-4 text-neutral-600 text-[17px] leading-relaxed max-w-md">
                  {item.description}
                </p>

                <button className="mt-6 inline-block rounded-full bg-black text-white px-6 py-2.5 text-sm font-medium">
                  {item.cta}
                </button>
              </motion.div>
            </AnimatePresence>

            {/* IMAGE AREA */}
            <AnimatePresence mode="wait">
              <motion.div
                key={item.image}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.35 }}
              >
                <div className="rounded-[32px] overflow-hidden border border-black/10 bg-white shadow-sm">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={800}
                    height={500}
                    className="object-cover w-full h-full"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
