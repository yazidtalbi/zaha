// app/become-seller/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { CheckCircle2, Store, Shield, Truck, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BecomeSellerPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [accept, setAccept] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!mounted) return;

      if (!user) {
        router.replace("/login?next=%2Fbecome-seller");
        return;
      }
      setUid(user.id);

      // If the user already has a shop, send them to /seller
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user.id)
        .maybeSingle();

      if (shop?.id) {
        router.replace("/seller");
        return;
      }

      setChecking(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) return null;

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">
      <button
        className="text-sm opacity-70 mb-4"
        onClick={() =>
          history.length > 1 ? router.back() : router.push("/home")
        }
      >
        ← Back
      </button>

      <div className="flex items-center gap-2">
        <Store className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Become a Zaha seller</h1>
      </div>
      <p className="mt-2 text-neutral-600">
        Open your shop, reach new customers, and grow your brand on Zaha.
      </p>

      <div className="grid gap-3 mt-6">
        <Perk
          icon={<Shield className="h-5 w-5" />}
          title="Trusted marketplace"
          desc="Verified shops, safe orders, and a buyer-first experience."
        />
        <Perk
          icon={<Truck className="h-5 w-5" />}
          title="Flexible shipping"
          desc="Offer delivery, pickup, COD, and transparent timelines."
        />
        <Perk
          icon={<BadgePercent className="h-5 w-5" />}
          title="Promotions & insights"
          desc="Run discounts and track performance with simple analytics."
        />
        <Perk
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Simple listing flow"
          desc="Create products with photos, video, and personalization options."
        />
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
          />
          <span className="text-sm">
            I agree to the{" "}
            <a
              className="underline"
              href="/terms"
              onClick={(e) => e.stopPropagation()}
            >
              Seller Terms
            </a>{" "}
            and{" "}
            <a
              className="underline"
              href="/policies"
              onClick={(e) => e.stopPropagation()}
            >
              Policies
            </a>
            .
          </span>
        </label>
      </div>

      <div className="mt-4 flex gap-3">
        <Button
          className="h-11 rounded-xl"
          disabled={!accept}
          onClick={() => router.replace("/onboarding/seller")}
        >
          Continue
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          onClick={() => router.push("/home")}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

function Perk({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-start gap-3 bg-white">
      <div className="shrink-0 rounded-full p-2 bg-neutral-100">{icon}</div>
      <div>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-neutral-600">{desc}</div>
      </div>
    </div>
  );
}
