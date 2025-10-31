"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const redirectingRef = useRef(false);

  function goLogin() {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    if (!pathname.startsWith("/login")) {
      const q = search?.toString();
      const next = encodeURIComponent(pathname + (q ? `?${q}` : ""));
      router.replace(`/login?next=${next}`);
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("getSession error:", error);
      setAuthed(!!data?.session);
      setReady(true);
      if (!data?.session) setTimeout(goLogin, 50);
    };

    init();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      if (!session) goLogin();
    });
    return () => sub.subscription.unsubscribe();
  }, [pathname]); // re-check on route change

  if (!ready || !authed) return null;
  return <>{children}</>;
}
