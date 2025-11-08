// app/onboarding/seller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Step = 0 | 1; // 0=Basics, 1=About

const SELL_TYPES = [
  "Jewelry",
  "Ceramics",
  "Home & Living",
  "Clothing",
  "Art & Prints",
  "Leather",
  "Woodwork",
  "Accessories",
  "Vintage",
  "Personalized",
];

export default function OnboardingSeller() {
  const router = useRouter();

  // stepper
  const [step, setStep] = useState<Step>(0);

  // step 1 — basics
  const [shopName, setShopName] = useState("");
  const [handle, setHandle] = useState("");
  const [country, setCountry] = useState("Morocco");
  const [city, setCity] = useState("");

  // step 2 — about
  const [description, setDescription] = useState("");
  const [selling, setSelling] = useState<string[]>([]);

  const canNext = useMemo(() => {
    if (step === 0) return shopName.trim() !== "" && handle.trim() !== "";
    if (step === 1) return true; // description/selling optional for now
    return false;
  }, [step, shopName, handle]);

  function formatHandle(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }

  function toggleSelling(tag: string) {
    setSelling((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function onNext() {
    if (!canNext) return;
    if (step === 0) setStep(1);
    else router.push("/home");
  }

  function onBack() {
    if (step === 0) router.push("/onboarding/role");
    else setStep((s) => (s - 1) as Step);
  }

  // simple page transition variants
  const variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.16 } },
  };

  // progress %
  const progress = step === 0 ? 50 : 100;

  return (
    <div className="min-h-dvh mx-auto max-w-lg p-6 flex flex-col">
      {/* TOP: stepper header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium">Seller onboarding</div>
          <div className="text-sm text-neutral-500">
            {step === 0 ? "Step 1 of 2" : "Step 2 of 2"}
          </div>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
          <motion.div
            className="h-full bg-black"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 110, damping: 18 }}
          />
        </div>

        {/* step dots */}
        <div className="mt-3 flex items-center gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className={[
                "h-2 w-2 rounded-full transition",
                step >= i ? "bg-black" : "bg-neutral-300",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {/* TITLE */}
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">
          {step === 0 ? "Create your shop" : "Tell us about your shop"}
        </h1>
        <p className="text-neutral-600">
          {step === 0
            ? "Start with the basics — you can edit these anytime."
            : "A short description helps buyers connect with your craft."}
        </p>
      </div>

      {/* CONTENT */}
      <div className="flex-1 relative mt-4">
        <AnimatePresence mode="wait">
          {step === 0 ? (
            <motion.div
              key="step-1"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* Shop name */}
              <div>
                <label className="text-sm font-medium">Shop name</label>
                <Input
                  className="mt-2 h-11"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ex: Maison Amina"
                />
              </div>

              {/* Shop handle */}
              <div>
                <label className="text-sm font-medium">Shop handle</label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-neutral-500">
                    zaha.ma/shop/
                  </span>
                  <Input
                    className="h-11"
                    value={handle}
                    onChange={(e) => setHandle(formatHandle(e.target.value))}
                    placeholder="maison-amina"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Letters, numbers & hyphens only.
                </p>
              </div>

              {/* Country & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Input
                    className="mt-2 h-11"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Input
                    className="mt-2 h-11"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Casablanca"
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* Description */}
              <div>
                <label className="text-sm font-medium">
                  Description (what makes your work unique?)
                </label>
                <textarea
                  className="mt-2 w-full h-28 rounded-xl border border-neutral-300 bg-white p-3 outline-none focus:ring-2 focus:ring-black/10"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Hand-thrown ceramics inspired by Rif mountains, using local clay and lead-free glazes."
                />
                <div className="mt-1 text-xs text-neutral-500">
                  A short paragraph is enough.
                </div>
              </div>

              {/* What are you selling */}
              <div>
                <div className="text-sm font-medium mb-2">
                  What are you selling?
                </div>
                <div className="flex flex-wrap gap-2">
                  {SELL_TYPES.map((t) => {
                    const active = selling.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleSelling(t)}
                        className={[
                          "px-3 h-9 rounded-full text-sm border transition",
                          active
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-neutral-300 hover:border-neutral-400",
                        ].join(" ")}
                        aria-pressed={active}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {selling.length > 0 && (
                  <div className="mt-2 text-xs text-neutral-500">
                    Selected: {selling.join(", ")}
                  </div>
                )}
              </div>

              {/* Mini preview */}
              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="text-sm font-medium mb-1">Preview</div>
                <div className="text-base font-semibold">
                  {shopName || "Your shop"}
                </div>
                <div className="text-sm text-neutral-500">
                  zaha.ma/shop/{handle || "handle"}
                </div>
                {(description || selling.length > 0 || city) && (
                  <div className="mt-3 text-sm text-neutral-700 space-y-1">
                    {description && <p>{description}</p>}
                    {selling.length > 0 && (
                      <p>
                        <span className="text-neutral-500">Selling:</span>{" "}
                        {selling.join(", ")}
                      </p>
                    )}
                    {city && (
                      <p>
                        <span className="text-neutral-500">Based in:</span>{" "}
                        {city}, {country}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FOOTER CTAs */}
      <div className="mt-8 flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          className="h-11 rounded-xl px-5 flex-1"
          onClick={onNext}
          disabled={!canNext}
        >
          {step === 0 ? "Next" : "Finish"}
        </Button>
      </div>

      {/* Skip for now */}
      <button
        onClick={() => router.push("/home")}
        className="mt-3 w-full text-sm text-neutral-500 hover:text-neutral-700 transition"
      >
        Skip for now
      </button>
    </div>
  );
}
