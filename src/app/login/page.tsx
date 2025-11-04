// app/login/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, LogIn, Chrome } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const redirecting = useRef(false);

  const next = useMemo(() => {
    const raw = search?.get("next") || "/home";
    return raw.startsWith("/") ? raw : "/home";
  }, [search]);

  useEffect(() => {
    // If already signed in, immediately decide where to go
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && !redirecting.current) {
        redirecting.current = true;
        await decideAfterAuth(next, router);
      }
    })();

    // React to auth changes (email/password or OAuth)
    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, sess) => {
      if (evt === "SIGNED_IN" && sess?.user && !redirecting.current) {
        redirecting.current = true;
        await decideAfterAuth(next, router);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [next, router]);

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // onAuthStateChange will handle redirect
    } catch (e: any) {
      setErr(e?.message ?? "Could not sign in");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/login` // return here, the effect will handle decideAfterAuth
              : undefined,
        },
      });
      if (error) throw error;
      // Will redirect to Google; after return, onAuthStateChange runs.
    } catch (e: any) {
      setErr(
        e?.message?.includes("provider is not enabled")
          ? "Google provider not enabled in Supabase project settings."
          : (e?.message ?? "Google sign-in failed")
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-2">Welcome back</h1>
        <p className="text-neutral-600 mb-6">Sign in to continue.</p>

        <form onSubmit={signInWithEmail} className="space-y-3">
          <div className="relative">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-4 h-12 pr-10"
              required
            />
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 opacity-60" />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border px-4 h-12 pr-10"
              required
            />
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 opacity-60" />
          </div>

          {err && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
              {err}
            </div>
          )}

          <Button
            type="submit"
            className="w-full rounded-xl h-12"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                Sign in
              </>
            )}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs text-neutral-500">or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl h-12"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          <Chrome className="h-5 w-5 mr-2" />
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-neutral-600">
          New to Zaha?{" "}
          <button
            onClick={() =>
              router.push(
                "/signup" + (next ? `?next=${encodeURIComponent(next)}` : "")
              )
            }
            className="text-black underline"
          >
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}

/** Decide where to go after auth:
 * - If profile exists with role → next (default /home)
 * - Else → /onboarding
 */
async function decideAfterAuth(
  next: string,
  router: ReturnType<typeof useRouter>
) {
  // 1) get user
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    router.replace("/login");
    return;
  }

  // 2) ensure profile row exists (create minimal row if missing)
  const { data: profileRows, error: selErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", uid)
    .maybeSingle();

  if (selErr) {
    // if selection failed, safe-fallback to onboarding to complete profile
    router.replace("/onboarding");
    return;
  }

  if (!profileRows) {
    // Create a row; you can attach defaults here
    await supabase.from("profiles").insert({ id: uid, role: null });
    router.replace("/onboarding");
    return;
  }

  // 3) Route based on role
  if (profileRows.role) {
    router.replace(next || "/home");
  } else {
    router.replace("/onboarding");
  }
}
