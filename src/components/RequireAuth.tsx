"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const router = useRouter();
  const redirectingRef = useRef(false);

  function goLogin() {
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    let nextPath = "/";
    if (typeof window !== "undefined") {
      nextPath = window.location.pathname + window.location.search;
    }
    const next = encodeURIComponent(nextPath);
    router.replace(`/login?next=${next}`);
  }

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);
      const hasSession = !!data?.session;
      setAuthed(hasSession);
      setReady(true);
      if (!hasSession) setTimeout(goLogin, 50);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const hasSession = !!session;
      setAuthed(hasSession);
      if (!hasSession) goLogin();
    });

    void init();

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []); // no pathname / search hook needed

  if (!ready || !authed) return null;
  return <>{children}</>;
}
