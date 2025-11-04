"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const slides = [
  {
    title: "Welcome to Zaha",
    subtitle: "The marketplace celebrating creativity across Morocco.",
    image: "/onboarding/1.png",
  },
  {
    title: "Shop from real Moroccan artisans",
    subtitle: "Discover handmade & vintage items near you.",
    image: "/onboarding/2.png",
  },
  {
    title: "Buy or sell safely",
    subtitle: "Trusted profiles, fair trades, real connections.",
    image: "/onboarding/3.png",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const total = slides.length;

  const progressPct = useMemo(
    () => Math.min(step, total - 1) / (total - 1 || 1),
    [step, total]
  );

  return (
    <div className="min-h-dvh flex flex-col items-center justify-between p-6 text-center">
      <div className="flex items-center justify-between w-full max-w-sm h-8">
        <div className="w-10">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="h-10 w-10 rounded-full hover:bg-neutral-100"
              aria-label="Previous"
            >
              ‹
            </button>
          )}
        </div>
        <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-black transition-all"
            style={{ width: `${progressPct * 100}%` }}
          />
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3 }}
            className="max-w-sm mx-auto"
          >
            <img
              src={slides[step].image}
              alt=""
              className="w-64 h-64 object-contain mx-auto mb-6"
            />
            <h1 className="text-2xl font-semibold mb-2">
              {slides[step].title}
            </h1>
            <p className="text-neutral-600">{slides[step].subtitle}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-sm space-y-3">
        {step < total - 1 ? (
          <>
            <Button
              className="w-full h-12 rounded-xl"
              onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            >
              Continue
            </Button>
            <button
              onClick={() => router.push("/auth")}
              className="w-full h-12 rounded-xl border text-black"
            >
              Skip to Get Started
            </button>
          </>
        ) : (
          <Button
            className="w-full h-12 rounded-xl"
            onClick={() => router.push("/auth")}
          >
            Get started
          </Button>
        )}
      </div>
    </div>
  );
}
