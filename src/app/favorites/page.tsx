// app/favorites/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard"; // assumes <ProductCard p={...} onUnfavorite={(id)=>...} />

type Product = {
  id: string;
  title: string;
  price_mad: number;
  photos: string[] | null;
  shop_id: string;
  active?: boolean | null;
  unavailable?: boolean | null; // if you use this flag
};

type FavoriteRow = { product_id: string | null };

export default function FavoritesPage() {
  return (
    <RequireAuth>
      <FavoritesInner />
    </RequireAuth>
  );
}

function FavoritesInner() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Get the logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 2) Pull favorites (IDs only)
      const { data: favs, error: favErr } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id)
        .returns<FavoriteRow[]>();

      if (favErr || !favs?.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 3) Unique, truthy product IDs
      const ids = Array.from(
        new Set(favs.map((f) => f.product_id).filter(Boolean) as string[])
      );
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 4) Load products by IDs (skip deleted/disabled)
      const { data: prods, error: prodErr } = await supabase
        .from("products")
        .select("id,title,price_mad,photos,shop_id,active,unavailable")
        .in("id", ids);

      // Defensive: filter out nulls and unavailable/disabled
      const cleaned = (prods || [])
        .filter(Boolean)
        .filter(
          (p) =>
            (p.active ?? true) &&
            (p.unavailable === false || p.unavailable == null)
        ) as Product[];

      if (!prodErr) setItems(cleaned);
      setLoading(false);
    })();
  }, []);

  const empty = useMemo(() => !loading && items.length === 0, [loading, items]);

  if (loading) {
    return <main className="p-4">Loading…</main>;
  }

  if (empty) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-semibold mb-2">Favorites</h1>
        <p className="text-muted-foreground">No favorite items yet.</p>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Favorites</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items
          .filter(Boolean) // extra safety
          .map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              onUnfavorite={(id) =>
                setItems((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))}
      </div>
    </main>
  );
}
