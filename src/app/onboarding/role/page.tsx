"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Role = "buyer" | "seller";

export default function RolePicker() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  // Must be signed in (they just signed up)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.replace("/auth");
    })();
  }, [router]);

  async function finish() {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id;
    if (!uid || !role) return;

    await supabase
      .from("profiles")
      .upsert({ id: uid, role }, { onConflict: "id" });
    router.push("/home");
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold mb-2">How will you use Zaha?</h1>
      <p className="text-neutral-600 mb-6">
        Pick a starting mode. You can switch anytime.
      </p>

      <div className="w-full max-w-md space-y-4">
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
          disabled={!role}
          onClick={finish}
        >
          Continue
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
      onClick={onClick}
      className={[
        "w-full text-left rounded-2xl border p-4 transition-all flex items-center gap-4",
        active
          ? "border-black bg-black text-white shadow-md"
          : "border-neutral-200 hover:border-neutral-300",
      ].join(" ")}
      aria-pressed={active}
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
        className={[
          "h-5 w-5 rounded-full border flex items-center justify-center",
          active ? "bg-white text-black border-white" : "border-neutral-300",
        ].join(" ")}
      >
        {active && <div className="h-2.5 w-2.5 rounded-full bg-black" />}
      </div>
    </button>
  );
}
