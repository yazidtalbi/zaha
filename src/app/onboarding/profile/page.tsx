// app/onboarding/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Role = "buyer" | "seller";

const POPULAR_MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tangier",
  "Fes",
  "Agadir",
  "Tetouan",
  "Oujda",
];

export default function ProfileOnboarding() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [otherCity, setOtherCity] = useState("");
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      setLoading(true);
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.replace("/auth");
        return;
      }

      const meta = user.user_metadata || {};
      const metaRoleRaw = meta.role as string | undefined;
      const metaRole = metaRoleRaw
        ? (metaRoleRaw.toLowerCase() as Role)
        : undefined;

      // Use your actual columns: role, name, city
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role, name, city")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) {
        console.warn("profiles select error:", profErr.message);
      }

      // Prefer latest choice from auth metadata, then fall back to profile
      const effectiveRole: Role | null =
        (metaRole === "buyer" || metaRole === "seller"
          ? metaRole
          : undefined) ??
        (prof?.role === "buyer" || prof?.role === "seller"
          ? (prof.role as Role)
          : undefined) ??
        null;

      if (!effectiveRole) {
        router.replace("/onboarding/role");
        return;
      }

      setRole(effectiveRole);

      const nameFromProvider =
        prof?.name || meta.full_name || meta.name || meta.display_name || "";

      setFullName(nameFromProvider);

      if (prof?.city) {
        if (POPULAR_MOROCCAN_CITIES.includes(prof.city)) {
          setSelectedCity(prof.city);
          setOtherCity("");
        } else {
          setSelectedCity(null);
          setOtherCity(prof.city);
        }
      }

      setLoading(false);
    };

    fetchUserAndProfile();
  }, [router]);

  const handleSave = async () => {
    setError(null);

    const cityValue = (otherCity || selectedCity || "").trim();

    if (!cityValue) {
      setError("Choose your city to continue.");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Session expired. Please sign in again.");
        router.replace("/auth");
        return;
      }

      const effectiveRole = role;
      if (!effectiveRole) {
        router.replace("/onboarding/role");
        return;
      }

      // Match your profiles schema: id, role, name, city
      const payload: Record<string, any> = {
        id: user.id,
        role: effectiveRole,
        name: fullName.trim() || null,
        city: cityValue,
      };

      const { error: dbError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (dbError) {
        console.error("profiles upsert error:", dbError);
        setError(
          dbError.message || "Could not save your profile. Please try again."
        );
        return;
      }

      // ✅ Redirect:
      // - seller → onboarding/seller (shop creation)
      // - buyer → home
      const normalizedRole = effectiveRole.toLowerCase();

      if (normalizedRole === "seller") {
        router.push("/onboarding/seller");
      } else {
        router.push("/home");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0B0B0C] text-white">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Preparing your profile…</span>
        </div>
      </div>
    );
  }

  const cityValue = (otherCity || selectedCity || "").trim();
  const canSubmit = !!cityValue && !saving;

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0B0B0C] px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] px-5 py-6 shadow-lg">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
            STEP 2 · YOUR PROFILE
          </p>
          <h1 className="mt-2 text-[24px] font-semibold leading-tight">
            Let&apos;s finish your profile.
          </h1>
          <p className="mt-2 text-xs text-white/70">
            We’ll use your name for your account and your{" "}
            <span className="font-medium text-white">
              city to personalise recommendations
            </span>{" "}
            and show you products from makers near you.
          </p>
        </div>

        {/* Full name (stored as `name` in DB) */}
        <div className="space-y-1.5 mb-4">
          <Label
            htmlFor="full_name"
            className="text-xs font-medium text-white/80"
          >
            Full name
          </Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            className="h-10 rounded-full border border-white/20 bg-white/5 text-white placeholder:text-white/40 text-sm"
          />
          <p className="text-[11px] text-white/50">
            If you signed up with Google, we used the name from your account —
            you can edit it anytime.
          </p>
        </div>

        {/* City selector */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="city" className="text-xs font-medium text-white/80">
              Where are you based? <span className="text-red-300">*</span>
            </Label>
            <span className="text-[10px] text-white/60">
              Used for nearby shops & recommendations
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {POPULAR_MOROCCAN_CITIES.map((city) => {
              const isActive = selectedCity === city && !otherCity;
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setOtherCity("");
                    setSelectedCity((prev) => (prev === city ? null : city));
                  }}
                  className={[
                    "px-3 py-1.5 rounded-full border text-xs transition",
                    isActive
                      ? "border-white bg-white text-black"
                      : "border-white/25 bg-white/5 text-white/80 hover:bg-white/10",
                  ].join(" ")}
                >
                  {city}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="other_city" className="text-[11px] text-white/70">
              Or type another city
            </Label>
            <Input
              id="other_city"
              value={otherCity}
              onChange={(e) => {
                setOtherCity(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedCity(null);
                }
              }}
              placeholder="Example: Salé, Kenitra, Chefchaouen..."
              className="h-10 rounded-full border border-white/20 bg-white/5 text-white placeholder:text-white/40 text-sm"
            />
          </div>

          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>

        <Button
          onClick={handleSave}
          disabled={!canSubmit}
          className="mt-2 w-full h-11 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving your setup…
            </>
          ) : (
            "Next"
          )}
        </Button>
      </div>
    </div>
  );
}
