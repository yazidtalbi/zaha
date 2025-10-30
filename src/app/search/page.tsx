"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import BottomSheet from "@/components/BottomSheet";
import { Filter as FilterIcon } from "lucide-react";
import EmptyState from "@/components/EmptyState";

type Item = {
  id: string;
  title: string;
  photos: string[] | null;
  price_mad: number;
  city: string | null;
  active: boolean;
  created_at: string;
  tags: string[] | null;
  on_sale?: boolean;
};

const QUICK_FILTERS = [
  { label: "Under MAD250", key: "under250" },
  { label: "On sale", key: "onsale" }, // requires products.on_sale boolean (or adapt)
  { label: "Handmade", key: "handmade" }, // requires tags[]
  { label: "Personalized", key: "personalized" },
] as const;

export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // URL-backed state
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [city, setCity] = useState(sp.get("city") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");
  const [sort, setSort] = useState(sp.get("sort") ?? "new"); // "new" | "price-asc" | "price-desc"
  const [chips, setChips] = useState<Record<string, boolean>>({
    under250: sp.get("under250") === "1",
    onsale: sp.get("onsale") === "1",
    handmade: sp.get("handmade") === "1",
    personalized: sp.get("personalized") === "1",
  });

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 24;

  const [sheetOpen, setSheetOpen] = useState(false);

  // counts for the badge
  const leftCount = (sort !== "new" ? 1 : 0) + (city ? 1 : 0) + (max ? 1 : 0);
  const rightCount = Object.values(chips).filter(Boolean).length;
  const selectedCount = leftCount + rightCount; // use leftCount if you only want sheet filters

  function pushUrl(resetPage = true) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (city) p.set("city", city);
    if (max) p.set("max", max);
    if (sort !== "new") p.set("sort", sort);
    Object.entries(chips).forEach(([k, v]) => v && p.set(k, "1"));
    router.replace(`/search${p.toString() ? `?${p.toString()}` : ""}`);
    if (resetPage) setPage(0);
  }

  async function load(reset = true) {
    setLoading(true);

    let query = supabase.from("products").select("*").eq("active", true);

    if (q) query = query.ilike("title", `%${q}%`);
    if (city) query = query.ilike("city", city);
    if (max) query = query.lte("price_mad", Number(max));

    if (chips.under250) query = query.lte("price_mad", 250);
    if (chips.handmade) query = query.contains("tags", ["handmade"]);
    if (chips.personalized) query = query.contains("tags", ["personalized"]);
    if (chips.onsale) query = query.eq("on_sale", true);

    if (sort === "new") query = query.order("created_at", { ascending: false });
    if (sort === "price-asc")
      query = query.order("price_mad", { ascending: true });
    if (sort === "price-desc")
      query = query.order("price_mad", { ascending: false });

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await query.range(from, to);
    if (error) console.error(error);

    setItems((prev) =>
      reset ? (data as Item[]) ?? [] : [...prev, ...((data as Item[]) ?? [])]
    );
    setLoading(false);
  }

  // initial + on URL/page change
  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, page]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushUrl(true);
    load(true);
  }

  function toggleChip(key: keyof typeof chips) {
    setChips((s) => {
      const next = { ...s, [key]: !s[key] };
      setTimeout(() => {
        pushUrl();
        load(true);
      }, 0);
      return next;
    });
  }

  return (
    <main className="pb-24 bg-neutral-50 min-h-screen">
      {/* Search input (sticky) */}
      <form
        onSubmit={handleSubmit}
        className="p-4 sticky top-0 bg-neutral-50 z-10"
      >
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for something special"
            className="w-full rounded-full bg-white px-4 py-3 pl-10 shadow-sm text-sm"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 rounded-full px-4 py-2 text-sm bg-black text-white"
          >
            Search
          </button>
          <span className="absolute left-3 top-3.5 text-neutral-400 text-lg">
            🔍
          </span>
        </div>

        {/* Row: left filter icon + right quick chips */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* LEFT: filter icon with numeric badge */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="relative h-9 w-9 grid place-items-center rounded-full border bg-transparent"
            aria-label="Filters"
          >
            <FilterIcon size={16} />
            {selectedCount > 0 && (
              <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full bg-black text-white text-[10px] leading-[18px] text-center px-1">
                {selectedCount}
              </span>
            )}
          </button>

          {/* RIGHT: quick chips */}
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleChip(f.key)}
              className={`rounded-full border px-3 py-2 text-sm whitespace-nowrap ${
                chips[f.key] ? "bg-black text-white border-black" : "bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      <section className="px-4 space-y-2">
        <div className="text-xs text-neutral-500">
          {loading
            ? "Searching…"
            : `${items.length} item${items.length !== 1 ? "s" : ""}`}
        </div>

        {!loading && items.length === 0 ? (
          <EmptyState q={q} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
            <div className="py-4">
              <button /* load more button unchanged */ />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          {items.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        <div className="py-4">
          <button
            disabled={loading}
            onClick={() => setPage((n) => n + 1)}
            className="w-full rounded-full border bg-white px-4 py-2 text-sm"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      </section>

      {/* Bottom sheet with Sort + City + Max price */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
      >
        <div className="space-y-4">
          {/* Sort */}
          <div>
            <div className="text-sm font-medium mb-2">Sort by</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { v: "new", label: "Newest" },
                { v: "price-asc", label: "Price ↑" },
                { v: "price-desc", label: "Price ↓" },
              ].map((srt) => (
                <button
                  key={srt.v}
                  onClick={() => setSort(srt.v)}
                  className={`rounded-full border px-3 py-2 text-sm ${
                    sort === srt.v
                      ? "bg-black text-white border-black"
                      : "bg-white"
                  }`}
                >
                  {srt.label}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <div className="text-sm font-medium mb-2">City</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "",
                "Casablanca",
                "Rabat",
                "Marrakech",
                "Fez",
                "Tangier",
                "Tetouan",
              ].map((c) => (
                <button
                  key={c || "all"}
                  onClick={() => setCity(c)}
                  className={`rounded-full border px-3 py-2 text-sm ${
                    city === c ? "bg-black text-white border-black" : "bg-white"
                  }`}
                >
                  {c || "All Morocco"}
                </button>
              ))}
            </div>
          </div>

          {/* Max price */}
          <div>
            <div className="text-sm font-medium mb-2">Max price</div>
            <input
              className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
              placeholder="MAD"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => {
                setSort("new");
                setCity("");
                setMax("");
              }}
              className="text-sm underline"
            >
              Clear
            </button>
            <button
              onClick={() => {
                setSheetOpen(false);
                pushUrl();
                load(true);
              }}
              className="rounded-full bg-black text-white px-4 py-2 text-sm"
            >
              Apply filters
            </button>
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}
