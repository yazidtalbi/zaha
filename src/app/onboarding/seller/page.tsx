// app/onboarding/seller/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft, X } from "lucide-react";

type Step = 0 | 1 | 2; // 0=Name, 1=City, 2=About

const STEPS = ["Shop name", "Location", "About"];

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

const COUNTRY = "Morocco";

const CITY_OPTIONS = [
  { value: "Casablanca", label: "Casablanca", emoji: "🌊" },
  { value: "Rabat", label: "Rabat", emoji: "🏛️" },
  { value: "Tanger", label: "Tangier", emoji: "⚓️" },
  { value: "Tétouan", label: "Tétouan", emoji: "🏔️" },
  { value: "Marrakech", label: "Marrakech", emoji: "🌴" },
  { value: "Fès", label: "Fès", emoji: "🕌" },
  { value: "Agadir", label: "Agadir", emoji: "🏖️" },
  { value: "Oujda", label: "Oujda", emoji: "🌅" },
  { value: "Meknès", label: "Meknès", emoji: "🏰" },
  { value: "Kénitra", label: "Kénitra", emoji: "🚆" },
  { value: "Safi", label: "Safi", emoji: "⚓️" },
  { value: "Nador", label: "Nador", emoji: "🌊" },
  { value: "Laayoune", label: "Laayoune", emoji: "🏜️" },
];

const NAME_SUGGESTIONS = ["Maison Amina", "Studio Nour", "Atelier Rif"];

export default function OnboardingSeller() {
  const router = useRouter();

  // stepper
  const [step, setStep] = useState<Step>(0);
  const isLast = step === STEPS.length - 1;

  // basics
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");

  // about
  const [description, setDescription] = useState("");
  const [selling, setSelling] = useState<string[]>([]);

  // UI
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // completion overlay
  const [done, setDone] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);

  const canProceed = useMemo(() => {
    if (step === 0) return shopName.trim() !== "";
    if (step === 1) return city.trim() !== "";
    return true;
  }, [step, shopName, city]);

  function toggleSelling(tag: string) {
    setSelling((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const variants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.22 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.16 } },
  };

  async function createOrUpdateShop() {
    setError(null);
    setSaving(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error("You must be signed in.");

      // Look up existing shop
      const { data: existing, error: selErr } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user.id)
        .maybeSingle();
      if (selErr) throw selErr;

      const payload = {
        owner: user.id,
        title: shopName.trim(),
        bio: description.trim() || null,
        city: city.trim() || null,
        verified: false,
        is_verified: false,
      } as const;

      let id: string | null = existing?.id ?? null;

      if (existing?.id) {
        const { error: updErr } = await supabase
          .from("shops")
          .update({
            title: payload.title,
            bio: payload.bio,
            city: payload.city,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updErr) throw updErr;
      } else {
        const { data: inserted, error: insErr } = await supabase
          .from("shops")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        id = inserted.id;
      }

      setShopId(id);
      setDone(true); // show completion overlay immediately
    } catch (e: any) {
      setError(e?.message ?? "Could not save your shop.");
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (isLast) {
      createOrUpdateShop();
      return;
    }
    if (!canProceed) return;
    setStep((s) => (s + 1) as Step);
    const pane = document.getElementById("onboarding-seller-pane");
    pane?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (step === 0) {
      router.push("/onboarding/role");
    } else {
      setStep((s) => (s - 1) as Step);
      const pane = document.getElementById("onboarding-seller-pane");
      pane?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Safe navigation: clear overlay state before routing
  function goAddFirstProduct() {
    flushSync(() => {
      setDone(false);
      setClosing(false);
    });
    router.replace("/seller/sell");
  }

  function goDashboard() {
    flushSync(() => {
      setDone(false);
      setClosing(false);
    });
    router.replace("/seller");
    router.refresh(); // optional: ensure fresh tree/data
  }

  return (
    <main
      className="min-h-[100dvh] flex flex-col bg-white text-ink overflow-hidden
                 [--h-header:56px] [--h-footer:72px]"
    >
      {/* Sticky header (same spirit as SellPage) */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white h-[var(--h-header)]">
        <div className="mx-auto max-w-lg flex items-center justify-between px-2 py-3">
          {/* Back */}
          <button
            onClick={goBack}
            className="p-2 rounded-full hover:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          {/* Segmented progress */}
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-10 sm:w-16 rounded-full ${
                  i <= step ? "bg-ink" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>

          {/* Close */}
          <button
            onClick={() => setClosing(true)}
            className="p-2 rounded-full hover:bg-neutral-100"
            aria-label="Close"
          >
            <X size={22} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Scrollable content pane */}
      <div
        id="onboarding-seller-pane"
        className="min-h-0 flex-1 overflow-y-auto pt-[var(--h-header)]
                   pb-[calc(var(--h-footer)+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-lg px-6 pb-6">
          {/* Step label */}
          {/* <div className="flex items-center justify-between mb-3 mt-4">
            <div className="text-sm font-medium">Seller onboarding</div>
            <div className="text-sm text-neutral-500">
              Step {step + 1} of {STEPS.length}
            </div>
          </div> */}

          {/* Title + subtitle (subtitle hidden on step 2) */}
          <div>
            <h1 className="text-2xl font-semibold mt-4">
              {step === 0
                ? "Name your shop"
                : step === 1
                  ? "Where are you based?"
                  : "Tell us about your shop"}
            </h1>
            {step !== 1 && (
              <p className="text-neutral-600 mt-1">
                {step === 0
                  ? "A beautiful name helps buyers remember you."
                  : "A short description helps buyers connect with your craft."}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 relative mt-5">
            <AnimatePresence mode="wait">
              {/* STEP 0 – NAME */}
              {step === 0 && (
                <motion.div
                  key="step-1-name"
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center text-center mb-2">
                    <div className="h-10 w-10 rounded-full border border-neutral-300 grid place-items-center mb-3">
                      <span className="text-lg">★</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Shop name</label>
                    <Input
                      className="mt-2 h-11"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="Shop name"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-neutral-500">
                      Suggestions based on Moroccan shops
                    </p>
                    <ul className="space-y-1 text-sm">
                      {NAME_SUGGESTIONS.map((name) => (
                        <li key={name}>
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left hover:text-black text-neutral-700"
                            onClick={() => setShopName(name)}
                          >
                            <span className="text-xs">•</span>
                            <span className="font-medium">{name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* STEP 1 – CITY */}
              {step === 1 && (
                <motion.div
                  key="step-2-city"
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="h-full flex flex-col space-y-4"
                >
                  {/* No extra labels/copy above grid per request */}

                  {/* Big grid */}
                  <div className="flex-1">
                    <div className="grid grid-cols-3 gap-3 h-full">
                      {CITY_OPTIONS.map((option) => {
                        const active = city === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCity(option.value)}
                            className={[
                              "flex flex-col items-start justify-between rounded-2xl border p-3 text-left transition h-full",
                              active
                                ? "bg-black text-white border-black"
                                : "bg-white text-black border-neutral-200 hover:border-neutral-400",
                            ].join(" ")}
                            aria-pressed={active}
                          >
                            <div className="text-2xl mb-2">{option.emoji}</div>
                            <div className="text-[13px] font-medium leading-snug">
                              {option.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Manual input */}
                  <div className="pt-1">
                    <Input
                      className="mt-1 h-10"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Or type another city"
                    />
                    <p className="text-xs text-neutral-500 mt-1">
                      Shown to buyers as{" "}
                      {city
                        ? `"Based in ${city}, ${COUNTRY}".`
                        : `"Based in ${COUNTRY}".`}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 – ABOUT */}
              {step === 2 && (
                <motion.div
                  key="step-3-about"
                  variants={variants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
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

                  <div>
                    <div className="text-sm font-medium mb-2">
                      What do you usually sell?{" "}
                      <span className="text-xs text-neutral-500">
                        (optional)
                      </span>
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

                  {/* Preview removed as requested */}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error inline above footer spacing */}
          {error && (
            <div className="mt-4 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Bottom sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t h-[var(--h-footer)]">
        <div className="mx-auto max-w-lg px-6 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <Button
            className="w-full rounded-full h-11 font-medium"
            onClick={goNext}
            disabled={saving || (!isLast && !canProceed)}
          >
            {isLast ? (
              saving ? (
                "Saving…"
              ) : (
                "Finish"
              )
            ) : (
              <>
                <span className="opacity-60 mr-1">Next:</span> {STEPS[step + 1]}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Exit confirmation drawer */}
      {closing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center z-100"
          onClick={() => setClosing(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl p-6 space-y-4 "
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-medium">Leave onboarding?</h2>
            <p className="text-sm text-neutral-600">
              Your changes will not be saved.
            </p>
            <Button
              className="w-full h-11 rounded-xl"
              onClick={() => router.replace("/home")}
            >
              Leave
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 rounded-xl"
              onClick={() => setClosing(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Completion overlay */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="w-full max-w-sm text-center"
            >
              <div className="text-4xl mb-3">✨</div>

              <h2 className="text-2xl font-semibold">
                Your shop is live on Zaha
              </h2>

              <p className="mt-2 text-sm text-neutral-600">
                {shopName || "Your shop"} was created successfully. Buyers can
                now discover your brand on Zaha. Add your first product to start
                showing up in searches and collections.
              </p>

              <div className="mt-6 space-y-2">
                <Button
                  className="w-full h-11 rounded-xl"
                  onClick={goAddFirstProduct}
                >
                  Add your first product
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={goDashboard}
                >
                  Go to dashboard
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
