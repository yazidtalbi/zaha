// app/onboarding/buyer/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Profile = { id: string; role?: "buyer" | "seller" | null };

const CATEGORIES = [
  "Jewelry",
  "Ceramics",
  "Home & Living",
  "Clothing",
  "Art & Prints",
  "Leather",
  "Woodwork",
  "Accessories",
];

export default function OnboardingBuyer() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [priceCap, setPriceCap] = useState<number | "">("");
  const [style, setStyle] = useState("Minimal");

  // Guard: must be signed in & have role = buyer
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) return router.replace("/auth");
      const uid = data.user.id;

      const { data: prof, error: perr } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", uid)
        .maybeSingle();

      if (perr || !prof) return router.replace("/onboarding/role");
      if (prof.role !== "buyer") return router.replace("/onboarding/role");

      // Prefill if exists
      const { data: pref } = await supabase
        .from("buyer_preferences")
        .select("favorite_categories, price_cap_mad, style_vibe")
        .eq("user_id", uid)
        .maybeSingle();

      if (pref) {
        setSelected(pref.favorite_categories ?? []);
        setPriceCap(pref.price_cap_mad ?? "");
        setStyle(pref.style_vibe ?? "Minimal");
      }

      setLoading(false);
    })();
  }, [router]);

  const toggle = (c: string) =>
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const submit = useCallback(async () => {
    setSaving(true);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      toast.error("Please sign in again.");
      router.replace("/auth");
      return;
    }
    const uid = data.user.id;

    const payload = {
      user_id: uid,
      favorite_categories: selected,
      price_cap_mad: priceCap === "" ? null : Number(priceCap),
      style_vibe: style,
      updated_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("buyer_preferences")
      .upsert(payload, { onConflict: "user_id" });

    if (upErr) {
      toast.error("Couldn’t save preferences. Try again.");
      setSaving(false);
      return;
    }

    toast.success("Preferences saved!");
    router.push("/home");
  }, [selected, priceCap, style, router]);

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh mx-auto max-w-lg p-6">
      <h1 className="text-2xl font-semibold mb-2">What do you like?</h1>
      <p className="text-neutral-600 mb-6">
        Tell us your vibe. We’ll personalize your Home feed.
      </p>

      <div className="space-y-6">
        {/* Categories */}
        <div>
          <div className="text-sm font-medium mb-2">Favorite categories</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = selected.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  className={[
                    "px-3 h-9 rounded-full text-sm border transition",
                    active
                      ? "bg-black text-white border-black"
                      : "bg-white text-black border-neutral-300 hover:border-neutral-400",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Cap */}
        <div>
          <label className="text-sm font-medium">Typical price cap (MAD)</label>
          <Input
            className="mt-2 h-11"
            inputMode="numeric"
            pattern="[0-9]*"
            value={priceCap}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d]/g, "");
              setPriceCap(v === "" ? "" : Number(v));
            }}
            placeholder="e.g., 300"
          />
        </div>

        {/* Style */}
        <div>
          <label className="text-sm font-medium">Style vibe</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Minimal", "Boho", "Rustic", "Colorful", "Vintage"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={[
                  "px-3 h-9 rounded-full text-sm border transition",
                  style === s
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-neutral-300 hover:border-neutral-400",
                ].join(" ")}
                aria-pressed={style === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-12 rounded-xl"
          onClick={submit}
          disabled={saving}
        >
          {saving ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
