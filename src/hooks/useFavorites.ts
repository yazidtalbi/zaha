"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

let cache: Set<string> | null = null;
let subscribers: ((ids: Set<string>) => void)[] = [];

export function useFavorites() {
  const [ids, setIds] = useState<Set<string>>(cache ?? new Set());
  const [uid, setUid] = useState<string | null>(null);

  // Subscribe to global cache updates
  useEffect(() => {
    const sub = (next: Set<string>) => setIds(new Set(next));
    subscribers.push(sub);
    return () => {
      subscribers = subscribers.filter((fn) => fn !== sub);
    };
  }, []);

  // Load user + favorites once
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUid(data.user.id);

      if (!cache) {
        const { data: favs } = await supabase
          .from("favorites")
          .select("product_id")
          .eq("user_id", data.user.id);

        cache = new Set(favs?.map((f) => f.product_id));
        subscribers.forEach((fn) => fn(cache!));
      }
    })();
  }, []);

  function toggleFavorite(pid: string) {
    if (!uid || !cache) return;
    const next = new Set(cache);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    cache = next;
    subscribers.forEach((fn) => fn(next));
  }

  return { favorites: ids, uid, toggleFavorite };
}
