"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Info, ShieldCheck, Check, ArrowRight } from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.45, ease: "easeOut" },
};

function Glass({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <motion.div
      {...fade}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      className={`rounded-[28px] border border-black/10 bg-white/80 p-5 shadow-[0_12px_30px_rgba(10,10,15,.06)] backdrop-blur ${className}`}
    >
      {children}
    </motion.div>
  );
}

function Pill({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm shadow-sm hover:bg-white ${className}`}
    >
      {children}
    </button>
  );
}

export default function BentoGrid() {
  return (
    <section className=" ">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">
        {/* Bento grid: 3 columns / 2 rows at md+ (left tile spans 2 rows) */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-[220px]">
          {/* A — Smart Scheduling (row-span-2) */}
          <Glass className="md:row-span-2 h-full flex flex-col">
            <div className="overflow-hidden rounded-2xl">
              <img
                src="https://cdn.prod.website-files.com/681cdd34f7d89eea4c341e6c/681cdf753f6b1a7c14513875_Blured.jpg"
                alt=""
                className="h-64 w-full rounded-2xl object-cover md:h-72"
              />
              {/* fade mask like Webflow .fade-image */}
              <div className="pointer-events-none -mt-16 h-16 w-full rounded-b-2xl bg-gradient-to-b from-transparent to-white/85" />
            </div>

            <div className="mt-4">
              <Pill>
                <Info className="h-4 w-4" />
                Discover the bold world.
              </Pill>

              <h3 className="mt-5 font-serif text-[34px] leading-tight">
                Smart Scheduling
              </h3>
              <p className="mt-2 text-sm text-neutral-600">
                Easily manage your day with our intuitive calendar. Drag, drop,
                and customize tasks.
              </p>
            </div>
          </Glass>

          {/* B — Bars + paragraph */}
          <Glass className="h-full">
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex h-[140px] items-end justify-center rounded-2xl bg-neutral-50"
                >
                  <div
                    className="w-16 rounded-2xl bg-gradient-to-t from-[#8EA0FF] to-white"
                    style={{ height: i === 1 ? "80%" : "45%" }}
                  />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[15px] text-neutral-700">
              Fastest to simplify their daily planning and boost your work
            </p>
          </Glass>

          {/* C — Teamwork (title + right-side illustration) */}
          <Glass className="h-full">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <h3 className="font-serif text-[34px] leading-tight">
                  Teamwork
                </h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Invite friends or colleagues to work together assign tasks
                </p>
              </div>
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src="https://cdn.prod.website-files.com/681cdd34f7d89eea4c341e6c/681ce9aeae141b497270a016_Illustations%202.png"
                  alt=""
                  className="h-[160px] w-full rounded-2xl object-cover md:h-full"
                />
                {/* subtle background dots */}
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span
                      key={i}
                      className="absolute h-2 w-2 rounded-full bg-neutral-200/70"
                      style={{
                        left: `${(i * 73) % 240}px`,
                        top: `${(i * 41) % 140}px`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Glass>

          {/* D — Integrations (logos marquee look) */}
          <Glass className="h-full">
            <div className="relative overflow-hidden rounded-2xl bg-white">
              <div className="flex gap-3 p-3">
                {Array.from({ length: 14 }).map((_, i) => (
                  <div
                    key={i}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white shadow"
                  >
                    <div className="h-5 w-5 rounded-full bg-[#111827]" />
                  </div>
                ))}
              </div>
            </div>

            <h3 className="mt-5 font-serif text-[34px] leading-tight">
              Integrations
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Connect with your favorite tools in seconds.
            </p>
          </Glass>

          {/* E — 100% Safe (gradient bg + shield) */}
          <Glass className="h-full">
            <div className="relative overflow-hidden rounded-2xl p-6">
              <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_20%_20%,#B9A8FF33,transparent_60%),radial-gradient(60%_40%_at_80%_40%,#D96E4333,transparent_60%)]" />
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/70 shadow">
                <ShieldCheck className="h-9 w-9 text-[#6B7AFF]" />
              </div>
            </div>

            <h4 className="mt-2 font-serif text-[28px] leading-tight">
              100% Safe
            </h4>
            <p className="text-sm text-neutral-600">Your data is encrypted</p>
            <ul className="mt-2 grid grid-cols-1 gap-1 text-sm text-neutral-700">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" /> AES-256 at rest
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" /> TLS 1.3 in transit
              </li>
            </ul>
          </Glass>
        </div>
      </div>
    </section>
  );
}
