"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("hoznij@yopmail.com"); // test email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const redirecting = useRef(false);

  const next = useMemo(() => {
    const raw = search?.get("next") || "/account";
    return raw.startsWith("/") ? raw : "/account";
  }, [search]);

  useEffect(() => {
    // If already logged in, go to next
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && !redirecting.current) {
        redirecting.current = true;
        router.replace(next);
      }
    });

    // Observe auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s && !redirecting.current) {
        redirecting.current = true;
        router.replace(next);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, next]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setErr(error.message); // ← shows the exact failure reason
      console.error("signIn error", error); // also visible in console
      return;
    }
    // Success: session is persisted by the client options; redirect happens via listener
  }

  return (
    <main className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Sign in / Create account</h1>

      <form
        onSubmit={handleSignIn}
        className="space-y-3 border rounded-xl p-4 bg-white"
      >
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          disabled={loading}
          className="w-full rounded bg-black text-white py-2"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {err && <p className="text-red-600 text-sm">{err}</p>}
      </form>

      {/* TEMP: one-click hard reset while debugging */}
      <div className="mt-4">
        <button
          className="text-sm text-red-600 underline"
          onClick={async () => {
            await supabase.auth.signOut();
            localStorage.clear();
            location.reload();
          }}
        >
          Reset session (sign out & clear storage)
        </button>
      </div>
    </main>
  );
}
