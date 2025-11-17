// app/signup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // computed from ?next=... but without useSearchParams
  const [next, setNext] = useState<string>("/home");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("next");
    if (raw && raw.startsWith("/")) {
      setNext(raw);
    } else {
      setNext("/home");
    }
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, sess) => {
      if (evt === "SIGNED_IN" && sess?.user) {
        await decideAfterAuth(next, router);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [next, router]);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // After email confirmation, onAuthStateChange will fire and redirect.
    } catch (e: any) {
      setErr(e?.message ?? "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <form onSubmit={signUp} className="w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
        <input
          className="w-full rounded-xl border px-4 h-12"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded-xl border px-4 h-12"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
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
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5 mr-2" /> Create account
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

// reuse from login page:
async function decideAfterAuth(
  next: string,
  router: ReturnType<typeof useRouter>
) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    router.replace("/login");
    return;
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", uid)
    .maybeSingle();
  if (!prof) {
    await supabase.from("profiles").insert({ id: uid, role: null });
    router.replace("/onboarding");
    return;
  }
  if (prof.role) router.replace(next || "/home");
  else router.replace("/onboarding");
}
