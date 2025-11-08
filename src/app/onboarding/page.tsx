// app/onboarding/page.tsx
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/* ---------------- slides (copy + colors) ---------------- */
const slides = [
  {
    title: ["Discover handmade", "crafts & goods."],
    subtitle: "Shop from Moroccan artisans near you.",
    bgClass: "bg-[#28594F]", // deep green
    shapeFill: "#F7A340", // warm orange
  },
  {
    title: ["Buy pieces", "that tell a story."],
    subtitle: "Made with time, care, and culture.",
    bgClass: "bg-[#D16549]", // terracotta
    shapeFill: "#F2EFE7", // cream
  },
  {
    title: ["Sell what you create.", "Your way."],
    subtitle: "Open your shop & grow your craft.",
    bgClass: "bg-[#C99337]", // mustard
    shapeFill: "#E9DDF8", // soft lavender
  },
] as const;

/* ---------------- simple 8-point star placeholder ---------------- */
function StarPlaceholder({ fill }: { fill: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className="w-56 h-56 mx-auto mb-8"
      role="img"
    >
      <polygon
        fill={fill}
        points="
          100,10 125,35 165,35 165,75 190,100 165,125
          165,165 125,165 100,190 75,165 35,165 35,125
          10,100 35,75 35,35 75,35
        "
      />
    </svg>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const total = slides.length;

  const progressPct = useMemo(
    () => Math.min(step, total - 1) / (total - 1 || 1),
    [step, total]
  );

  const onContinue = () => {
    if (step < total - 1) setStep((s) => s + 1);
    else router.push("/auth"); // final slide → auth
  };

  return (
    <div
      className={`min-h-dvh flex flex-col items-center justify-between px-6 pt-6 pb-8 text-center text-white transition-colors ${slides[step].bgClass}`}
    >
      {/* Top progress bars */}
      <div className="h-8 w-full max-w-sm flex items-center justify-center">
        <div className="flex items-center gap-3">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] w-10 rounded-full ${
                i === step ? "bg-white" : "bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.28 }}
            className="max-w-sm mx-auto"
          >
            {/* Placeholder shape (replace with images later if you want) */}
            <StarPlaceholder fill={slides[step].shapeFill} />

            <h1 className="text-[28px] leading-tight font-semibold mb-3">
              {slides[step].title[0]} <br />
              {slides[step].title[1]}
            </h1>
            <p className="text-white/80 text-base">{slides[step].subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm space-y-3">
        <Button
          onClick={onContinue}
          className="w-full h-12 rounded-full bg-white text-black hover:bg-white/90"
        >
          Continue
        </Button>

        <button
          onClick={() => router.push("/auth")}
          className="w-full h-12 rounded-full border border-white/70 text-white hover:bg-white/10 transition"
        >
          Skip to get Started
        </button>

        {/* (Optional) tiny linear progress bar under the bars if you still want it */}
        <div className="sr-only">
          <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${progressPct * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
