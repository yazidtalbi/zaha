// app/search/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
import { Filter as FilterIcon, X } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

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
  { label: "On sale", key: "onsale" },
  { label: "Handmade", key: "handmade" },
  { label: "Personalized", key: "personalized" },
] as const;

type Chips = Record<(typeof QUICK_FILTERS)[number]["key"], boolean>;

const POPULAR_SEARCHES_FALLBACK = [
  "poster",
  "rose dahlia turquoise pendant",
  "molly nguyen padme",
  "silent night shirt",
  "new to icu",
  "doterra essential oil",
];

type RecentView = {
  id: string;
  title: string;
  price_mad: number;
  photo: string | null;
  at: number;
};

export default function SearchPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // ===== COMMITTED (URL) =====
  const committed = useMemo(() => {
    const chips: Chips = {
      under250: sp.get("under250") === "1",
      onsale: sp.get("onsale") === "1",
      handmade: sp.get("handmade") === "1",
      personalized: sp.get("personalized") === "1",
    };
    return {
      q: sp.get("q") ?? "",
      city: sp.get("city") ?? "",
      max: sp.get("max") ?? "",
      sort: (sp.get("sort") ?? "new") as "new" | "price-asc" | "price-desc",
      chips,
    };
  }, [sp]);

  const hasActiveQuery =
    !!committed.q ||
    !!committed.city ||
    !!committed.max ||
    committed.sort !== "new" ||
    Object.values(committed.chips).some(Boolean);

  // ===== DRAFT UI =====
  const [q, setQ] = useState(committed.q);
  const [city, setCity] = useState(committed.city);
  const [max, setMax] = useState(committed.max);
  const [sort, setSort] = useState<"new" | "price-asc" | "price-desc">(
    committed.sort
  );
  const [chips, setChips] = useState<Chips>(committed.chips);

  useEffect(() => {
    setQ(committed.q);
    setCity(committed.city);
    setMax(committed.max);
    setSort(committed.sort);
    setChips(committed.chips);
  }, [
    committed.q,
    committed.city,
    committed.max,
    committed.sort,
    committed.chips,
  ]);

  // ===== RESULTS FETCHING =====
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 24;

  const paramsKey = useMemo(() => {
    const p = new URLSearchParams();
    if (committed.q) p.set("q", committed.q);
    if (committed.city) p.set("city", committed.city);
    if (committed.max) p.set("max", committed.max);
    if (committed.sort !== "new") p.set("sort", committed.sort);
    Object.entries(committed.chips).forEach(([k, v]) => v && p.set(k, "1"));
    return p.toString();
  }, [committed]);

  async function load(reset: boolean) {
    if (!hasActiveQuery) return;
    setLoading(true);
    try {
      let query = supabase.from("products").select("*").eq("active", true);

      if (committed.q) query = query.ilike("title", `%${committed.q}%`);
      if (committed.city) query = query.eq("city", committed.city);
      if (committed.max) query = query.lte("price_mad", Number(committed.max));

      if (committed.chips.under250) query = query.lte("price_mad", 250);
      if (committed.chips.handmade)
        query = query.contains("tags", ["handmade"]);
      if (committed.chips.personalized)
        query = query.contains("tags", ["personalized"]);
      if (committed.chips.onsale) query = query.eq("on_sale", true);

      if (committed.sort === "new")
        query = query.order("created_at", { ascending: false });
      if (committed.sort === "price-asc")
        query = query.order("price_mad", { ascending: true });
      if (committed.sort === "price-desc")
        query = query.order("price_mad", { ascending: false });

      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await query.range(from, to);
      if (error) throw error;

      setItems((prev) =>
        reset ? (data as Item[]) ?? [] : [...prev, ...((data as Item[]) ?? [])]
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(page === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey, page, hasActiveQuery]);

  // ===== URL COMMIT =====
  // 1) Replace your pushUrlFromDrafts with an override-friendly version:
  function pushUrlFromDrafts(
    resetPage = true,
    overrides?: Partial<{
      q: string;
      city: string;
      max: string;
      sort: "new" | "price-asc" | "price-desc";
      chips: Chips;
    }>
  ) {
    const qv = overrides?.q ?? q;
    const cityv = overrides?.city ?? city;
    const maxv = overrides?.max ?? max;
    const sortv = overrides?.sort ?? sort;
    const chipsv = overrides?.chips ?? chips;

    const p = new URLSearchParams();
    if (qv) p.set("q", qv);
    if (cityv) p.set("city", cityv);
    if (maxv) p.set("max", maxv);
    if (sortv !== "new") p.set("sort", sortv);
    Object.entries(chipsv).forEach(([k, v]) => v && p.set(k, "1"));

    router.replace(`/search${p.toString() ? `?${p.toString()}` : ""}`);
    if (resetPage) setPage(0);
  }

  // **Clear all** → default state (discovery)
  function clearAll() {
    setQ("");
    setCity("");
    setMax("");
    setSort("new");
    setChips({
      under250: false,
      onsale: false,
      handmade: false,
      personalized: false,
    });

    // 🔥 instantly clear current results
    setItems([]);

    // reset pagination and return to default
    setPage(0);
    router.replace("/search");
  }

  // ===== DISCOVERY DATA =====
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>(
    POPULAR_SEARCHES_FALLBACK
  );

  useEffect(() => {
    try {
      const arr: RecentView[] = JSON.parse(
        localStorage.getItem("recently_viewed") || "[]"
      );
      const dedup = Array.from(
        new Map(arr.sort((a, b) => b.at - a.at).map((v) => [v.id, v])).values()
      );
      setRecentViews(dedup.slice(0, 12));
    } catch {}

    (async () => {
      try {
        const { data, error } = await supabase
          .from("search_popular")
          .select("term")
          .order("rank", { ascending: true })
          .limit(10);
        if (!error && data?.length)
          setPopularSearches(data.map((d: any) => d.term));
      } catch {}
    })();
  }, []);

  // ===== SHEET =====
  const [sheetOpen, setSheetOpen] = useState(false);
  const leftCount =
    (committed.sort !== "new" ? 1 : 0) +
    (committed.city ? 1 : 0) +
    (committed.max ? 1 : 0);
  const rightCount = Object.values(committed.chips).filter(Boolean).length;
  const selectedCount = leftCount + rightCount;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushUrlFromDrafts(true);
  }

  function toggleChipDraft(key: keyof Chips) {
    setChips((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const showDiscovery = !hasActiveQuery;

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
            placeholder='Search for "sweatshirt with left hand embroidery"'
            className="w-full rounded-full bg-white px-4 py-3 pl-10 pr-24 shadow-sm text-sm"
          />
          {/* Clear X (only when there is text) */}
          {q.trim().length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear search"
              className="absolute right-24 top-2.5 h-7 w-7 grid place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"
            >
              <X size={16} />
            </button>
          )}
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

        {/* Filters row */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
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
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>

              <div className="space-y-4 pt-4">
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
                        onClick={() => setSort(srt.v as typeof sort)}
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
                          city === c
                            ? "bg-black text-white border-black"
                            : "bg-white"
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
              </div>

              <SheetFooter className="mt-4">
                <div className="flex w-full items-center justify-between">
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
                  <SheetClose asChild>
                    <button
                      onClick={() => pushUrlFromDrafts(true)}
                      className="rounded-full bg-black text-white px-4 py-2 text-sm"
                    >
                      Apply filters
                    </button>
                  </SheetClose>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleChipDraft(f.key)}
              className={`rounded-full border px-3 py-2 text-sm whitespace-nowrap ${
                chips[f.key] ? "bg-black text-white border-black" : "bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => pushUrlFromDrafts(true)}
            className="ml-1 rounded-full border bg-white px-3 py-2 text-sm"
            aria-label="Apply quick filters"
          >
            Apply
          </button>
        </div>
      </form>

      {/* DISCOVERY */}
      {showDiscovery ? (
        <section className="px-4 space-y-6 py-4">
          {/* Recently viewed */}
          {recentViews.length > 0 && (
            <div>
              <div className="text-sm font-medium mb-2 text-neutral-700">
                Recently viewed
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {recentViews.slice(0, 12).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => router.push(`/product/${v.id}`)}
                    className="min-w-[120px] rounded-xl bg-white shadow-sm border overflow-hidden"
                  >
                    <div className="h-[96px] bg-neutral-100">
                      {v.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.photo}
                          alt={v.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="p-2">
                      <div className="text-xs line-clamp-2">{v.title}</div>
                      <div className="text-xs mt-1 text-neutral-500">
                        MAD {v.price_mad}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular right now */}
          <div>
            <div className="text-sm font-medium mb-2 text-neutral-700">
              Popular right now
            </div>
            <div className="space-y-2">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => {
                    setQ(term); // for immediate visual feedback
                    pushUrlFromDrafts(true, { q: term }); // commit using the new term
                  }}
                  className="w-full text-left rounded-xl bg-white px-4 py-3 text-sm hover:bg-neutral-100"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        // RESULTS
        <section className="px-4 space-y-2">
          <div className="text-xs text-neutral-500">
            {loading
              ? "Searching…"
              : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </div>

          {!loading && items.length === 0 ? (
            <EmptyState q={committed.q} />
          ) : (
            <>
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
            </>
          )}
        </section>
      )}
    </main>
  );
}
