"use client";

import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    // 1) get current session
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setReady(true);
      if (!data.session) {
        // keep where the user wanted to go
        const next = encodeURIComponent(
          pathname + (search?.toString() ? `?${search}` : "")
        );
        router.replace(`/login?next=${next}`);
      }
    });

    // 2) listen for auth changes (tab-safe)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
      if (!session) {
        const next = encodeURIComponent(
          pathname + (search?.toString() ? `?${search}` : "")
        );
        router.replace(`/login?next=${next}`);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router, pathname, search]);

  if (!ready) return null; // avoid flash
  if (!authed) return null; // redirected to /login
  return <>{children}</>;
}
