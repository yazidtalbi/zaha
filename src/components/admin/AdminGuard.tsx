// components/admin/AdminGuard.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

type AdminGuardProps = {
  children: ReactNode;
};

type Profile = {
  id: string;
  role: string | null;
  name: string | null;
};

export function AdminGuard({ children }: AdminGuardProps) {
  const [state, setState] = useState<"loading" | "allowed" | "denied">(
    "loading"
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        if (!mounted) return;
        setState("denied");
        return;
      }

      const uid = authData.user.id;
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("id, role, name")
        .eq("id", uid)
        .maybeSingle();

      if (!mounted) return;

      if (error || !profileData || profileData.role !== "superadmin") {
        setState("denied");
      } else {
        setProfile(profileData);
        setState("allowed");
      }
    }

    check();

    return () => {
      mounted = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking access…</div>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <div className="text-lg font-semibold">Access denied</div>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don’t have permission to access the admin area.
        </p>
        <Button onClick={() => router.push("/")}>Go back home</Button>
      </main>
    );
  }

  return <>{children}</>;
}
