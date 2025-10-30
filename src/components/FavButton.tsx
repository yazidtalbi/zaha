"use client";
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";

export default function FavButton({ productId }: { productId: string }) {
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("product_id", productId)
        .maybeSingle();
      if (!ignore) setLiked(!!data);
    })();
    return () => {
      ignore = true;
    };
  }, [productId]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (liked) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
      if (!error) setLiked(false);
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, product_id: productId });
      if (!error) setLiked(true);
    }
    setBusy(false);
  }

  return (
    <button
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
      onClick={toggle}
      className={`absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full
                  ${
                    liked ? "bg-rose-500 text-white" : "bg-white/90 text-black"
                  }`}
    >
      {liked ? "♥" : "♡"}
    </button>
  );
}
