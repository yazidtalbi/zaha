"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import CategoryPills from "@/components/CategoryPills";
import HeroCard from "@/components/HeroCard";

import HeroCarousel from "@/components/HeroCarousel";

import Link from "next/link";
import Header from "@/components/Header";
import CategoriesStrip from "@/components/home/CategoriesStrip";

const slides = [
  {
    img: "/banners/holiday.jpg",
    title: "Discover our holiday picks",
    ctaLabel: "Get gifting",
    ctaHref: "/home?campaign=holiday",
  },
  {
    img: "/banners/handmade.jpg",
    title: "Handmade treasures from Morocco",
    ctaLabel: "Explore handmade",
    ctaHref: "/home?tag=handmade",
  },
  {
    img: "/banners/personalized.jpg",
    title: "Personalized, made just for you",
    ctaLabel: "Personalize now",
    ctaHref: "/home?tag=personalized",
  },
];

export default function HomePage() {
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("favorites").select("product_id");
      setFavIds(new Set((data ?? []).map((r: any) => r.product_id)));
    })();
  }, []);
  // then pass <FavButton productId={id} prefLiked={favIds.has(id)} />

  async function load() {
    setLoading(true);
    let query = supabase.from("products").select("*").eq("active", true);
    if (category) query = query.ilike("tags", `%${category}%`);
    if (q) query = query.ilike("title", `%${q}%`);
    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(24);
    setItems(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [category, q]);

  return (
    <main className="pb-24 bg-neutral-50 min-h-screen">
      {/* Search */}

      <Header />
      {/* Categories */}
      <CategoryPills active={category} onSelect={setCategory} />

      {/* Hero */}
      {/* <HeroCard /> */}

      <HeroCarousel slides={slides} />

      <CategoriesStrip />
      {/* or pass pre-fetched categories as `initial` */}

      {/* Section */}
      <section className="p-4 space-y-2">
        <h2 className="text-lg font-semibold">Crafted in Morocco</h2>
        {loading ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 gap-y-8">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} variant="carousel" />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
