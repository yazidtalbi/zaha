"use client";

import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function FavoritesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ————————————————————————————————————
  // Fetch favorites
  // ————————————————————————————————————
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("product:product_id(*)")
        .order("created_at", { ascending: false });

      if (!error) setItems((data ?? []).map((r: any) => r.product));
      setLoading(false);
    })();
  }, []);

  // ————————————————————————————————————
  // Handle removal from local state
  // ————————————————————————————————————
  function handleUnfavorite(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Favorites</h1>
      {items.length === 0 ? (
        <p className="text-sm text-ink/70">No favorites yet.</p>
      ) : (
        <section className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              onUnfavorite={(id) =>
                setItems((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))}
        </section>
      )}
    </main>
  );
}
