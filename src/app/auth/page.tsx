// app/auth/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Lock, Chrome, UserPlus, LogIn } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const redirecting = useRef(false);

  const next = useMemo(() => {
    const raw = search?.get("next") || "/home";
    return raw.startsWith("/") ? raw : "/home";
  }, [search]);

  /* ———————————————————————————————————————————————————————— */
  // AUTH STATE
  /* ———————————————————————————————————————————————————————— */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user && !redirecting.current) {
        redirecting.current = true;
        await decideAfterAuth(next, router);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, sess) => {
      if (evt === "SIGNED_IN" && sess?.user && !redirecting.current) {
        redirecting.current = true;
        await decideAfterAuth(next, router);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [next, router]);

  /* ———————————————————————————————————————————————————————— */
  // HANDLERS
  /* ———————————————————————————————————————————————————————— */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
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
              ? `${window.location.origin}/auth`
              : undefined,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setErr(e?.message ?? "Google sign-in failed");
      setLoading(false);
    }
  }

  /* ———————————————————————————————————————————————————————— */
  // UI
  /* ———————————————————————————————————————————————————————— */
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-white text-center relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm mx-auto"
        >
          <h1 className="text-3xl font-semibold mb-2 text-[var(--terracotta,#c97e4e)]">
            Zaha
          </h1>
          <p className="text-neutral-700 mb-6">
            {mode === "login"
              ? "Welcome back — sign in to continue."
              : "Join Morocco’s creative marketplace."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            <div className="relative">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border px-4 h-12 pr-10 outline-none"
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
                className="w-full rounded-xl border px-4 h-12 pr-10 outline-none"
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
              className="w-full rounded-xl h-12 mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign in
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 mr-2" />
                  Create account
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
            {mode === "login" ? (
              <>
                New to Zaha?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-black underline"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-black underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}

/* ———————————————————————————————————————————————————————— */
/* Decide redirect destination after auth */
/* ———————————————————————————————————————————————————————— */
async function decideAfterAuth(
  next: string,
  router: ReturnType<typeof useRouter>
) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    router.replace("/auth");
    return;
  }

  const { data: profileRows, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", uid)
    .maybeSingle();

  if (error) {
    router.replace("/onboarding");
    return;
  }

  if (!profileRows) {
    await supabase.from("profiles").insert({ id: uid, role: null });
    router.replace("/onboarding");
    return;
  }

  if (profileRows.role) {
    router.replace(next || "/home");
  } else {
    router.replace("/onboarding");
  }
}
