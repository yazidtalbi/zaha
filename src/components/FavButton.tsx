"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useFavorites } from "@/hooks/useFavorites";

export default function FavButton({
  productId,
  shopOwner,
  className = "",
  size = 18,
}: {
  productId: string;
  shopOwner?: string | null;
  className?: string;
  size?: number;
}) {
  const { favorites, uid, toggleFavorite } = useFavorites();
  const [busy, setBusy] = useState(false);
  const on = favorites.has(productId);

  // Load initial liked state ONCE per user session
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!uid) return;
      const { data } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", uid)
        .eq("product_id", productId)
        .maybeSingle();
      if (!ignore && !!data && !on) toggleFavorite(productId);
    })();
    return () => {
      ignore = true;
    };
  }, [uid, productId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);

    // user not logged in → ask login only once
    if (!uid) {
      window.location.href = "/login";
      return;
    }

    // Prevent favoriting own product (no need to re-fetch)
    if (shopOwner && shopOwner === uid) {
      toast.error("You can’t favorite your own product.");
      setBusy(false);
      return;
    }

    try {
      if (on) {
        await supabase
          .from("favorites")
          .delete()
          .eq("user_id", uid)
          .eq("product_id", productId);
        toggleFavorite(productId);
        toast("Removed");
      } else {
        await supabase
          .from("favorites")
          .insert({ user_id: uid, product_id: productId });
        toggleFavorite(productId);
        toast.success("Added ❤️");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={`grid place-items-center active:scale-[0.98] disabled:opacity-60 ${className}`}
    >
      <Heart size={size} className={on ? "fill-current" : ""} />
    </button>
  );
}
