"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load(uid?: string | null) {
      if (!uid) {
        setCount(0);
        return;
      }

      // IMPORTANT: read `count` from the response. `data` will be null with head: true.
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .is("read_at", null);

      if (!mounted) return;
      if (!error) setCount(count ?? 0);
    }

    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;

      await load(uid);

      if (uid) {
        // Realtime scoped to this user's notifications only
        channel = supabase
          .channel(`notifications_unread_${uid}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${uid}`,
            },
            () => load(uid)
          )
          .subscribe();
      }
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
