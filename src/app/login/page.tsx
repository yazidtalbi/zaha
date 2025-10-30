"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const search = useSearchParams();
  const next = search?.get("next") || "/account";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) router.replace(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [router, next]);

  if (session) return null;

  return (
    <main className="p-4 max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-3">Sign in / Create account</h1>
      <div className="rounded-xl border bg-paper p-4">
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          appearance={{ theme: ThemeSupa }}
          theme="light"
        />
      </div>
    </main>
  );
}
