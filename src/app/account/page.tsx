"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";

export default function Account() {
  return (
    <Suspense
      fallback={
        <main className="p-6 text-ink/60 animate-pulse">
          Loading your account…
        </main>
      }
    >
      <RequireAuth>
        <Inner />
      </RequireAuth>
    </Suspense>
  );
}

function Inner() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-2">Account</h1>
      <p>Signed in as: {email}</p>
    </main>
  );
}
