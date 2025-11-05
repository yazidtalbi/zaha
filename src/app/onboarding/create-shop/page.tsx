// app/onboarding/create-shop/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function slugify(x: string) {
  return x
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

// Adjust to your schema as needed
type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type NewShop = {
  title: string;
  tagline: string;
  city: string;
  slug: string;
};

const CITIES = [
  "Casablanca",
  "Rabat",
  "Fès",
  "Marrakech",
  "Tangier",
  "Tetouan",
  "Agadir",
  "Oujda",
  "Meknes",
  "Kenitra",
];

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function CreateShopPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<NewShop>({
    title: "",
    tagline: "",
    city: "",
    slug: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof NewShop, string>>>(
    {}
  );

  // On mount: session/profile + ensure no existing shop
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      setUid(userId);

      if (!userId) {
        router.push("/login?next=/onboarding/create-shop");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .eq("id", userId)
        .maybeSingle();
      if (prof) setProfile(prof);

      const { data: existingShop, error: shopErr } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (shopErr) console.warn(shopErr);
      if (existingShop) {
        router.replace("/seller");
        return;
      }

      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill suggestion for shop name/slug
  useEffect(() => {
    if (!profile) return;
    if (!form.title) {
      const base = profile.username || profile.full_name || "My Shop";
      const suggestion = base ? `Atelier ${base}` : "Atelier";
      setForm((f) => ({ ...f, title: suggestion, slug: slugify(suggestion) }));
    }
  }, [profile, form.title]);

  // Validation
  const validate = (s: 1 | 2 | 3 | 4): boolean => {
    const e: Partial<Record<keyof NewShop, string>> = {};
    if (s === 1) {
      if (!form.title?.trim()) e.title = "Please enter a shop name.";
      if (!form.slug?.trim()) e.slug = "Slug is required.";
    }
    if (s === 2) {
      if (!form.tagline?.trim()) e.tagline = "A short tagline helps customers.";
    }
    if (s === 3) {
      if (!form.city?.trim()) e.city = "Select your city.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = async () => {
    const ok = validate(step);
    if (!ok) return;
    if (step < 4) setStep((s) => (s + 1) as typeof step);
    else await submit();
  };

  const goBack = () => setStep((s) => (s > 1 ? ((s - 1) as typeof step) : s));

  // Submit → create shop
  const submit = async () => {
    if (!uid) return;
    setBusy(true);
    try {
      let finalSlug = form.slug || slugify(form.title) || "shop";
      const { data: exists } = await supabase
        .from("shops")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (exists) {
        finalSlug = `${finalSlug}-${Math.floor(Math.random() * 999)}`;
      }

      const payload = {
        owner_id: uid,
        title: form.title.trim(),
        tagline: form.tagline.trim(),
        city: form.city.trim(),
        slug: finalSlug,
      } as any;

      const { error } = await supabase
        .from("shops")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      toast.success("Your shop is created! ✨");
      router.replace("/seller");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not create the shop.");
      setStep(4);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-[#faf7f2] flex items-center justify-center">
        <div className="animate-pulse text-sm text-ink/60">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-[#faf7f2] flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#faf7f2]/80 backdrop-blur supports-[backdrop-filter]:bg-[#faf7f2]/70 border-b border-black/5">
        <div className="max-w-screen-sm mx-auto px-4 h-12 flex items-center gap-2">
          <button
            onClick={() => history.back()}
            aria-label="Back"
            className="p-1 -ml-1 rounded-full hover:bg-black/5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium">Create your shop</div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-screen-sm mx-auto w-full px-4 pb-28 pt-6">
        {/* Hero */}
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-200/70 border border-amber-900/10 flex items-center justify-center shadow-sm">
            <span className="text-2xl">🧵</span>
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight">
            Bring your creations to life
          </h1>
          <p className="text-sm text-ink/70 mt-1">
            Open your Zaha shop in a few simple steps.
          </p>
        </motion.div>

        <ProgressDots step={step} />

        <div className="mt-6">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <StepCard
                key="s1"
                title="Shop basics"
                subtitle="Name your shop and its web address."
              >
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Shop name</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm((f) => ({
                          ...f,
                          title: v,
                          slug: f.slug ? f.slug : slugify(v),
                        }));
                      }}
                      placeholder="e.g., Atelier Najlaa"
                    />
                    {errors.title && (
                      <p className="text-xs text-red-600">{errors.title}</p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="slug">Shop URL</Label>
                    <Input
                      id="slug"
                      value={form.slug}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          slug: slugify(e.target.value),
                        }))
                      }
                      placeholder="atelier-najlaa"
                    />
                    <p className="text-[11px] text-ink/60">
                      Your shop link will be{" "}
                      <span className="font-medium">zaha.ma/s/</span>
                      {form.slug || "your-shop"}
                    </p>
                    {errors.slug && (
                      <p className="text-xs text-red-600">{errors.slug}</p>
                    )}
                  </div>
                </div>
              </StepCard>
            )}

            {step === 2 && (
              <StepCard
                key="s2"
                title="Branding"
                subtitle="A short tagline for your shop."
              >
                <div className="grid gap-2">
                  <Label htmlFor="tag">Tagline</Label>
                  <Textarea
                    id="tag"
                    value={form.tagline}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tagline: e.target.value }))
                    }
                    placeholder="Handmade ceramics from Marrakech"
                    rows={3}
                  />
                  {errors.tagline && (
                    <p className="text-xs text-red-600">{errors.tagline}</p>
                  )}
                  <p className="text-[11px] text-ink/60">
                    You can add logo & cover later in Settings.
                  </p>
                </div>
              </StepCard>
            )}

            {step === 3 && (
              <StepCard
                key="s3"
                title="Location"
                subtitle="Where is your shop based?"
              >
                <div className="grid gap-2">
                  <Label htmlFor="city">City</Label>
                  <select
                    id="city"
                    className="h-10 rounded-md border border-black/10 bg-white px-3 text-sm"
                    value={form.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, city: e.target.value }))
                    }
                  >
                    <option value="">Select a city…</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  {errors.city && (
                    <p className="text-xs text-red-600">{errors.city}</p>
                  )}
                  <p className="text-[11px] text-ink/60">
                    Used to estimate shipping & delivery options.
                  </p>
                </div>
              </StepCard>
            )}

            {step === 4 && (
              <StepCard
                key="s4"
                title="Review"
                subtitle="Confirm your details and create your shop."
              >
                <div className="rounded-xl border border-black/10 bg-white p-4 space-y-3">
                  <Row label="Shop name" value={form.title || "—"} />
                  <Separator className="my-1" />
                  <Row label="URL" value={`zaha.ma/s/${form.slug || "—"}`} />
                  <Separator className="my-1" />
                  <Row label="Tagline" value={form.tagline || "—"} />
                  <Separator className="my-1" />
                  <Row label="City" value={form.city || "—"} />
                </div>
                <div className="text-[11px] text-ink/60 mt-2">
                  You can change everything later from Shop Settings.
                </div>
              </StepCard>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom action bar */}
      <motion.div
        className="fixed bottom-0 inset-x-0 z-20"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
      >
        <div className="max-w-screen-sm mx-auto px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="mb-3 rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="p-3 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                className="rounded-full"
                onClick={goBack}
                disabled={step === 1 || busy}
              >
                Back
              </Button>
              <Button
                className="rounded-full px-5"
                onClick={goNext}
                disabled={busy}
              >
                {step < 4 ? "Continue" : busy ? "Creating…" : "Create my shop"}
              </Button>
            </div>
          </div>
          <button
            className="mx-auto mb-4 block text-[12px] text-ink/60 underline underline-offset-4"
            onClick={() => router.push("/home")}
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// UI bits
// ─────────────────────────────────────────────────────────────
function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      layout
    >
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-ink/70">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </motion.div>
  );
}

function ProgressDots({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3, 4].map((s) => (
        <motion.span
          key={s}
          className="h-2.5 w-2.5 rounded-full"
          animate={{
            backgroundColor: s <= step ? "#111111" : "#11111133",
            scale: s === step ? 1.1 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          layout
        />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
