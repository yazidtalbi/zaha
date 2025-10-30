"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";

type Product = {
  id: string;
  title: string;
  price_mad: number;
  photos: string[] | null;
  active: boolean;
  shop_id: string;
  created_at: string;
};

type MaxPrice = 0 | 250 | 500;
type SortKey = "newest" | "price_asc" | "price_desc";

export default function DealsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // quick filters
  const [maxPrice, setMaxPrice] = useState<MaxPrice>(0);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Heuristic “deals”: the cheapest + most recent items
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("price_mad", { ascending: true }) // cheap first
        .order("created_at", { ascending: false }) // then recent
        .limit(60);

      if (!error) setItems((data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const [city, setCity] = useState<string | null>(null);
  const [onlyMyCity, setOnlyMyCity] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("city")
        .eq("id", user.id)
        .maybeSingle();
      setCity(data?.city ?? null);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = [...items];

    // apply price cap
    if (maxPrice > 0) list = list.filter((p) => (p.price_mad ?? 0) <= maxPrice);

    // sort
    list.sort((a, b) => {
      if (sort === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sort === "price_asc") return (a.price_mad ?? 0) - (b.price_mad ?? 0);
      if (sort === "price_desc") return (b.price_mad ?? 0) - (a.price_mad ?? 0);
      return 0;
    });

    return list.slice(0, 48);
  }, [items, maxPrice, sort]);

  return (
    <main className="pb-24">
      <header className="px-4 pt-4">
        <h1 className="text-xl font-semibold">Deals</h1>
        <p className="text-sm text-ink/70">Cheaper and recent finds.</p>
      </header>

      {/* chips */}
      <section className="px-4 mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Chip active={maxPrice === 0} onClick={() => setMaxPrice(0)}>
          All
        </Chip>
        <Chip active={maxPrice === 250} onClick={() => setMaxPrice(250)}>
          Under MAD250
        </Chip>
        <Chip active={maxPrice === 500} onClick={() => setMaxPrice(500)}>
          Under MAD500
        </Chip>

        <div className="mx-1 h-6 w-px bg-black/10" />

        <Chip active={sort === "newest"} onClick={() => setSort("newest")}>
          Newest
        </Chip>
        <Chip
          active={sort === "price_asc"}
          onClick={() => setSort("price_asc")}
        >
          Price ↑
        </Chip>
        <Chip
          active={sort === "price_desc"}
          onClick={() => setSort("price_desc")}
        >
          Price ↓
        </Chip>
      </section>

      {/* grid */}
      {loading ? (
        <div className="p-4 text-sm text-ink/70">Loading…</div>
      ) : (
        <section className="px-4 mt-4 grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} p={p} variant="carousel" />
          ))}
          {!filtered.length && (
            <div className="col-span-2 text-sm text-ink/70 py-8 text-center">
              No deals found.
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm whitespace-nowrap ${
        active
          ? "bg-ink text-white border-ink"
          : "bg-paper hover:bg-white border-black/10"
      }`}
    >
      {children}
    </button>
  );
}
