// app/onboarding/role/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Role = "buyer" | "seller";

export default function RolePicker() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Must be signed in, and fetch existing role if present
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error);
        router.replace("/auth");
        return;
      }
      const user = data.user;
      if (!user) {
        router.replace("/auth");
        return;
      }

      // Prefill role from profile if it exists
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profErr) console.warn(profErr.message);
      if (prof?.role === "buyer" || prof?.role === "seller") {
        setRole(prof.role);
      }
      setLoading(false);
    })();
  }, [router]);

  // const finish = useCallback(async () => {
  //   if (!role || saving) return;
  //   setSaving(true);

  //   const { data, error } = await supabase.auth.getUser();
  //   if (error || !data.user) {
  //     toast.error("Please sign in again.");
  //     router.replace("/auth");
  //     return;
  //   }
  //   const uid = data.user.id;

  //   const { error: upsertErr } = await supabase
  //     .from("profiles")
  //     .upsert(
  //       { id: uid, role, updated_at: new Date().toISOString() },
  //       { onConflict: "id" }
  //     )
  //     .select("id")
  //     .maybeSingle();

  //   if (upsertErr) {
  //     console.error(upsertErr);
  //     toast.error("Couldn’t save your choice. Try again.");
  //     setSaving(false);
  //     return;
  //   }

  //   // Optional: also mirror to auth metadata (handy for Edge Functions / RLS filters)
  //   await supabase.auth.updateUser({ data: { role } }).catch(() => {});

  //   // Route next
  //   router.push(role === "seller" ? "/onboarding/seller" : "/home");
  // }, [role, saving, router]);

  async function finish() {
    if (!role) return;

    // Just navigate — no DB yet
    if (role === "seller") {
      router.push("/onboarding/seller");
    } else {
      router.push("/onboarding/buyer");
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/10 border-t-black" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">How will you use Zaha?</h1>
      <p className="text-neutral-600 mb-6">
        Pick a starting mode. You can switch anytime.
      </p>

      <div
        className="w-full max-w-md space-y-4"
        role="radiogroup"
        aria-label="Choose your role"
      >
        <RoleCard
          label="I’m a Buyer"
          hint="Discover unique items"
          emoji="🧿"
          active={role === "buyer"}
          onClick={() => setRole("buyer")}
        />
        <RoleCard
          label="I’m a Seller"
          hint="Open your shop & sell"
          emoji="🪡"
          active={role === "seller"}
          onClick={() => setRole("seller")}
        />

        <Button
          className="w-full h-12 rounded-xl mt-2"
          disabled={!role || saving}
          onClick={finish}
        >
          {saving ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function RoleCard({
  label,
  hint,
  emoji,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="radio"
      aria-checked={active}
      className={[
        "w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-4 outline-none",
        active
          ? "border-black bg-black text-white shadow-md"
          : "border-neutral-200 hover:border-neutral-300 focus:ring-2 focus:ring-black/10",
      ].join(" ")}
    >
      <div
        className={[
          "h-12 w-12 rounded-xl text-2xl flex items-center justify-center",
          active ? "bg-white/10" : "bg-neutral-100",
        ].join(" ")}
      >
        {emoji}
      </div>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div
          className={
            active ? "text-neutral-200 text-sm" : "text-neutral-600 text-sm"
          }
        >
          {hint}
        </div>
      </div>
      <div
        aria-hidden
        className={[
          "h-5 w-5 rounded-full border flex items-center justify-center shrink-0",
          active ? "bg-white text-black border-white" : "border-neutral-300",
        ].join(" ")}
      >
        {active && <div className="h-2.5 w-2.5 rounded-full bg-black" />}
      </div>
    </button>
  );
}
