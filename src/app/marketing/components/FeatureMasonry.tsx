"use client";

import * as React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { ShieldCheck, Info, Users, Check, ArrowRight } from "lucide-react";

// optional: replace with shadcn/ui Button if you prefer
function PillButton({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <button
      className={
        "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm shadow-sm hover:bg-white " +
        className
      }
    >
      {children}
    </button>
  );
}

function Glass({
  className = "",
  children,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <motion.div
      initial={{ y: 8, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      whileHover={{ translateY: -3 }}
      className={
        "rounded-3xl border border-black/10 bg-white/80 p-5 shadow-[0_12px_30px_rgba(10,10,15,0.06)] backdrop-blur " +
        className
      }
    >
      {children}
    </motion.div>
  );
}

export default function FeatureMasonry({
  photoUrl,
}: {
  /** Optional external/remote URL; if you don’t pass one we show a gradient block. */
  photoUrl?: string;
}) {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-4 sm:px-6 md:grid-cols-3">
        {/* A — Big photo + CTA + copy */}
        <Glass className="col-span-1 md:row-span-2 md:[&>*]:last:mt-auto">
          <div className="overflow-hidden rounded-2xl">
            {photoUrl ? (
              // Using unoptimized to avoid next/image domain config friction
              <Image
                unoptimized
                src={photoUrl}
                alt="Smart scheduling"
                width={1200}
                height={900}
                className="h-64 w-full rounded-2xl object-cover md:h-72"
              />
            ) : (
              <div className="h-64 w-full rounded-2xl bg-[radial-gradient(60%_60%_at_20%_20%,#11182705,transparent_60%),radial-gradient(60%_60%_at_80%_30%,#B9A8FF33,transparent_60%),radial-gradient(70%_70%_at_40%_90%,#D96E4333,transparent_60%)] md:h-72" />
            )}
          </div>

          <div className="mt-4">
            <PillButton>
              <Info className="h-4 w-4" />
              Discover the bold world.
            </PillButton>

            <h3 className="mt-5 font-serif text-3xl leading-tight">
              Smart Scheduling
            </h3>
            <p className="mt-2 text-sm text-neutral-600">
              Easily manage your day with our intuitive calendar. Drag, drop,
              and customize tasks.
            </p>
          </div>
        </Glass>

        {/* B — Bars + avatars + blurb */}
        <Glass>
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex h-40 items-end justify-center rounded-2xl bg-neutral-50"
              >
                <div
                  className="w-16 rounded-2xl bg-gradient-to-t from-[#8EA0FF] to-white"
                  style={{ height: i === 1 ? "80%" : "45%" }}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-[15px] text-neutral-700">
            Fastest to simplify their daily planning and boost your work
          </p>
        </Glass>

        {/* C — Teamwork network */}
        <Glass className="md:col-span-1">
          <h3 className="font-serif text-3xl">Teamwork</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Invite friends or colleagues to work together; assign tasks.
          </p>

          <div className="relative mt-4 h-48 overflow-hidden rounded-2xl bg-neutral-50">
            {/* soft dots */}
            <div className="pointer-events-none absolute inset-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-2 w-2 rounded-full bg-neutral-200/60"
                  style={{
                    left: `${(i * 73) % 280}px`,
                    top: `${(i * 41) % 160}px`,
                  }}
                />
              ))}
            </div>
            {/* arcs */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 400 220"
            >
              <path
                d="M30 170 C140 50, 260 50, 370 170"
                className="stroke-neutral-300"
                strokeWidth={2}
                fill="none"
              />
              <path
                d="M80 150 C170 90, 230 90, 320 150"
                className="stroke-neutral-300"
                strokeWidth={2}
                fill="none"
              />
            </svg>
            {/* avatars */}
            <AvatarDot x="60%" y="54%" />
            <AvatarDot x="25%" y="60%" />
            <AvatarDot x="40%" y="35%" />
            <AvatarDot x="75%" y="65%" />
            {/* callout */}
            <div className="absolute right-4 top-6 rounded-full bg-white p-1.5 shadow-lg">
              <div className="h-14 w-14 rounded-full bg-[radial-gradient(60%_60%_at_30%_30%,#B9A8FF55,transparent_60%)] ring-4 ring-[#B9A8FF22]" />
            </div>
          </div>
        </Glass>

        {/* D — Integrations long card */}
        <Glass className="md:col-span-2">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-white shadow"
              >
                <div className="h-5 w-5 rounded-full bg-[#111827]" />
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-serif text-3xl">Integrations</h3>
              <p className="mt-2 text-sm text-neutral-600">
                Connect with your favorite tools in seconds.
              </p>
            </div>
            <PillButton className="mt-2 sm:mt-0">
              Browse all <ArrowRight className="h-4 w-4" />
            </PillButton>
          </div>
        </Glass>

        {/* E — 100% Safe */}
        <Glass className="md:col-span-1">
          <div className="relative overflow-hidden rounded-2xl p-6">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_20%_20%,#B9A8FF33,transparent_60%),radial-gradient(60%_40%_at_80%_40%,#D96E4333,transparent_60%)]" />
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white/70 shadow">
              <ShieldCheck className="h-10 w-10 text-[#6B7AFF]" />
            </div>
          </div>

          <h3 className="mt-3 font-serif text-3xl leading-tight">100% Safe</h3>
          <p className="mt-1 text-sm text-neutral-600">
            Your data is encrypted
          </p>

          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              AES-256 at rest
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              TLS 1.3 in transit
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              SOC2-ready practices
            </li>
          </ul>
        </Glass>
      </div>
    </section>
  );
}

/* ----------------------------- helpers ----------------------------- */

function AvatarDot({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-neutral-300 shadow-md"
      style={{ left: x, top: y }}
    />
  );
}
