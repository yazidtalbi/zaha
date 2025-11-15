// app/onboarding/seller/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabaseClient";

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
  const totalSteps = 2;

  // basics
  const [shopName, setShopName] = useState("");
  const [handle, setHandle] = useState(""); // preview-only unless you persist it
  const [country, setCountry] = useState("Morocco");
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

  const canNext = useMemo(() => {
    if (step === 0) return shopName.trim() !== "" && handle.trim() !== "";
    return true;
  }, [step, shopName, handle]);

  function formatHandle(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  }
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

  const progressPct = ((step + 1) / totalSteps) * 100;

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

  function onNext() {
    if (!canNext) return;
    if (step === 0) setStep(1);
    else createOrUpdateShop();
  }

  function onBack() {
    if (step === 0) router.push("/onboarding/role");
    else setStep((s) => (s - 1) as Step);
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
    <div className="min-h-dvh mx-auto max-w-lg p-6 flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-neutral-100"
          aria-label="Back"
        >
          <span className="text-xl">‹</span>
        </button>

        <div className="flex-1 mx-2">
          <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
            <motion.div
              className="h-full bg-black"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ type: "tween", duration: 0.25 }}
            />
          </div>
        </div>

        <button
          onClick={() => setClosing(true)}
          className="h-10 w-10 grid place-items-center rounded-full hover:bg-neutral-100"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Step label */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium">Seller onboarding</div>
        <div className="text-sm text-neutral-500">
          {step === 0 ? "Step 1 of 2" : "Step 2 of 2"}
        </div>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold">
          {step === 0 ? "Create your shop" : "Tell us about your shop"}
        </h1>
        <p className="text-neutral-600 mt-1">
          {step === 0
            ? "Start with the basics — you can edit these anytime."
            : "A short description helps buyers connect with your craft."}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 relative mt-5">
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
              <div>
                <label className="text-sm font-medium">Shop name</label>
                <Input
                  className="mt-2 h-11"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ex: Maison Amina"
                />
              </div>

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

      {/* Footer actions */}
      {error && (
        <div className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}
      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl px-5"
          onClick={onBack}
          disabled={saving}
        >
          Back
        </Button>
        <Button
          className="h-11 rounded-xl px-5 flex-1"
          onClick={onNext}
          disabled={!canNext || saving}
        >
          {step === 0 ? "Next" : saving ? "Saving…" : "Finish"}
        </Button>
      </div>

      <button
        onClick={() => router.push("/home")}
        className="mt-3 w-full text-sm text-neutral-500 hover:text-neutral-700 transition"
        disabled={saving}
      >
        Skip for now
      </button>

      {/* Exit confirmation drawer */}
      {closing && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end justify-center"
          onClick={() => setClosing(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl p-6 space-y-4"
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
            className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <div className="text-2xl font-semibold">
                Your shop is ready ✨
              </div>
              <p className="mt-1 text-neutral-600">
                {shopName || "Your shop"} has been{" "}
                {shopId ? "saved" : "created"}. Add your first product now or go
                to your dashboard.
              </p>

              <div className="mt-5 space-y-2">
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

              <button
                className="mt-3 w-full text-sm text-neutral-500 hover:text-neutral-700"
                onClick={() => setDone(false)}
                aria-label="Close"
              >
                Stay here
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
