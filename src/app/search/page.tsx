// app/search/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "@/components/ProductCard";
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
  promo_price_mad?: number | null;
  personalization_enabled?: boolean | null;
  free_shipping?: boolean | null;
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

const PAGE_SIZE = 24;
const FETCH_TIMEOUT_MS = 15000; // 15s

type CommittedState = {
  q: string;
  city: string;
  max: string;
  sort: "new" | "price-asc" | "price-desc";
  chips: Chips;
};

const EMPTY_CHIPS: Chips = {
  under250: false,
  onsale: false,
  handmade: false,
  personalized: false,
};

function getCommittedFromLocation(): CommittedState {
  if (typeof window === "undefined") {
    return {
      q: "",
      city: "",
      max: "",
      sort: "new",
      chips: { ...EMPTY_CHIPS },
    };
  }

  const sp = new URLSearchParams(window.location.search);
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
}

// timeout helper (clears timer + returns proper error)
async function runWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Search timeout"));
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result as T;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export default function SearchPage() {
  const router = useRouter();

  // static initial state to avoid hydration mismatch
  const [committed, setCommitted] = useState<CommittedState>({
    q: "",
    city: "",
    max: "",
    sort: "new",
    chips: { ...EMPTY_CHIPS },
  });

  // sync with URL after mount
  useEffect(() => {
    const next = getCommittedFromLocation();
    setCommitted(next);
  }, []);

  const hasActiveQuery =
    !!committed.q ||
    !!committed.city ||
    !!committed.max ||
    committed.sort !== "new" ||
    Object.values(committed.chips).some(Boolean);

  /* ==================== DRAFT (UI) STATE ==================== */
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

  /* ==================== RESULTS & PAGINATION ==================== */
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  pageRef.current = page;

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

    console.log("[search] load() start", {
      reset,
      committed,
      page: pageRef.current,
    });

    setLoading(true);
    try {
      let query = supabase
        .from("products")
        .select(
          "id,title,photos,price_mad,city,active,created_at,promo_price_mad,personalization_enabled,free_shipping",
          { count: "exact" }
        )
        .eq("active", true)
        .neq("unavailable", true);

      // ── FUZZY SEARCH (title + description + keywords)
      const rawSearch = committed.q.trim();
      if (rawSearch) {
        const firstToken = rawSearch.split(/\s+/)[0];
        const fuzzy =
          firstToken.length > 3 ? firstToken.slice(0, 3) : firstToken;
        const term = fuzzy || rawSearch;

        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,keywords.ilike.%${term}%`
        );
      }

      if (committed.city) query = query.eq("city", committed.city);
      if (committed.max) query = query.lte("price_mad", Number(committed.max));

      // chips → real columns
      if (committed.chips.under250) query = query.lte("price_mad", 250);

      if (committed.chips.onsale) {
        query = query.not("promo_price_mad", "is", null);
      }

      if (committed.chips.handmade) {
        query = query.ilike("keywords", "%handmade%");
      }

      if (committed.chips.personalized) {
        query = query.eq("personalization_enabled", true);
      }

      if (committed.sort === "new")
        query = query.order("created_at", { ascending: false });
      if (committed.sort === "price-asc")
        query = query.order("price_mad", { ascending: true });
      if (committed.sort === "price-desc")
        query = query.order("price_mad", { ascending: false });

      const from = pageRef.current * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      console.log("[search] sending supabase query", { from, to });

      const { data, error, count } = await runWithTimeout(
        query.range(from, to),
        FETCH_TIMEOUT_MS
      );

      console.log("[search] supabase response", {
        error,
        count,
        dataLength: (data as Item[] | null | undefined)?.length ?? 0,
      });

      if (error) throw error;

      setItems((prev) =>
        reset
          ? ((data as Item[]) ?? [])
          : [...prev, ...((data as Item[]) ?? [])]
      );
      if (reset) setTotal(count ?? 0);
    } catch (e: any) {
      // Timeouts are expected sometimes → warn, don't blow up UI
      if (e instanceof Error && e.message === "Search timeout") {
        console.warn("[search] timeout after", FETCH_TIMEOUT_MS, "ms");
      } else {
        console.error("[search] error", e);
      }

      if (reset) {
        setItems([]);
        setTotal(0);
      }
    } finally {
      console.log("[search] load() done, turning loading=false");
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(0);
    setItems([]);
    setTotal(null);
  }, [paramsKey]);

  useEffect(() => {
    if (!hasActiveQuery) return;
    load(page === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, paramsKey, hasActiveQuery]);

  /* ==================== URL / CLEAR ==================== */
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

    const qs = p.toString();
    router.replace(`/search${qs ? `?${qs}` : ""}`);

    setCommitted({
      q: qv,
      city: cityv,
      max: maxv,
      sort: sortv,
      chips: chipsv,
    });

    if (resetPage) setPage(0);
  }

  function clearAll() {
    setQ("");
    setCity("");
    setMax("");
    setSort("new");
    setChips({ ...EMPTY_CHIPS });
    setItems([]);
    setPage(0);
    setTotal(null);
    router.replace("/search");
    setCommitted({
      q: "",
      city: "",
      max: "",
      sort: "new",
      chips: { ...EMPTY_CHIPS },
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushUrlFromDrafts(true);
  }

  /* ==================== AUTO-APPLY CHIPS ==================== */
  useEffect(() => {
    const t = setTimeout(() => pushUrlFromDrafts(true, { chips }), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips]);

  function toggleChipDraft(key: keyof Chips) {
    setChips((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  /* ==================== DISCOVERY DATA ==================== */
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
          .select("term,rank")
          .order("rank", { ascending: true })
          .limit(10);
        if (!error && data?.length)
          setPopularSearches((data as any[]).map((d) => d.term));
      } catch {}
    })();
  }, []);

  /* ==================== SHEET ==================== */
  const [sheetOpen, setSheetOpen] = useState(false);

  const leftCount =
    (committed.sort !== "new" ? 1 : 0) +
    (committed.city ? 1 : 0) +
    (committed.max ? 1 : 0);
  const rightCount = Object.values(committed.chips).filter(Boolean).length;
  const selectedCount = leftCount + rightCount;

  /* ==================== INFINITE SCROLL ==================== */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;

    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        const canLoadMore =
          !loading &&
          hasActiveQuery &&
          items.length > 0 &&
          items.length % PAGE_SIZE === 0 &&
          (total === null || items.length < total);

        if (first.isIntersecting && canLoadMore) {
          setPage((n) => n + 1);
        }
      },
      { rootMargin: "600px" }
    );

    io.observe(el);
    return () => io.unobserve(el);
  }, [loading, items.length, hasActiveQuery, total]);

  /* ==================== ESC TO CLEAR ==================== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        clearAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showDiscovery = !hasActiveQuery;

  return (
    <main className="pb-24 bg-neutral-50 min-h-screen">
      {/* Search input (sticky) */}
      <form
        onSubmit={handleSubmit}
        className="p-4 sticky top-0 bg-neutral-50 z-10"
      >
        <div className="relative">
          <div className="flex items-center gap-2 rounded-full border bg-white pl-10 pr-2 h-11">
            <SearchIcon className="absolute left-3 h-4 w-4 opacity-60" />
            <input
              ref={inputRef}
              aria-label="Search products"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search on Zaha.."
              className="flex-1 outline-none text-sm placeholder:text-neutral-400 bg-transparent"
            />
            {(q.trim().length > 0 || hasActiveQuery) && (
              <button
                type="button"
                onClick={clearAll}
                aria-label="Clear search"
                className="h-9 w-9 grid place-items-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filters row */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pr-4">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="relative h-9 grid place-items-center rounded-full border bg-white px-3 shrink-0"
                aria-label="Filters"
              >
                <SlidersHorizontal size={16} />
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
                        type="button"
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
                        type="button"
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
                    type="button"
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
                      type="button"
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

          {/* Quick filters — auto-apply */}
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleChipDraft(f.key)}
              className={`shrink-0 rounded-full border px-3 py-2 text-sm whitespace-nowrap ${
                chips[f.key] ? "bg-black text-white border-black" : "bg-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Active filters as removable pills */}
        {hasActiveQuery && (
          <div className="px-0 mt-2 flex flex-wrap gap-2">
            {committed.city && (
              <button
                type="button"
                onClick={() => pushUrlFromDrafts(true, { city: "" })}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-xs"
              >
                City: {committed.city} <X size={12} />
              </button>
            )}
            {committed.max && (
              <button
                type="button"
                onClick={() => pushUrlFromDrafts(true, { max: "" })}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-xs"
              >
                Max: MAD {committed.max} <X size={12} />
              </button>
            )}
            {committed.sort !== "new" && (
              <button
                type="button"
                onClick={() => pushUrlFromDrafts(true, { sort: "new" })}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-xs"
              >
                {committed.sort === "price-asc" ? "Price ↑" : "Price ↓"}{" "}
                <X size={12} />
              </button>
            )}
            {Object.entries(committed.chips).map(([k, v]) =>
              v ? (
                <button
                  type="button"
                  key={k}
                  onClick={() =>
                    pushUrlFromDrafts(true, {
                      chips: { ...committed.chips, [k]: false } as Chips,
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1.5 text-xs"
                >
                  {QUICK_FILTERS.find((qf) => qf.key === k)?.label}
                  <X size={12} />
                </button>
              ) : null
            )}

            <button
              type="button"
              onClick={clearAll}
              className="text-xs underline ml-1"
            >
              Clear all
            </button>
          </div>
        )}
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
                    className="min-w-[100px] rounded-xl bg-white border overflow-hidden"
                  >
                    <div className="h-[100px] bg-neutral-100">
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
                    setQ(term);
                    pushUrlFromDrafts(true, { q: term });
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
            {loading && items.length === 0
              ? "Searching…"
              : total !== null
                ? `${total} result${total !== 1 ? "s" : ""}`
                : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </div>

          {loading && items.length === 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl overflow-hidden border bg-white"
                >
                  <div className="h-[140px] bg-neutral-100 animate-pulse" />
                  <div className="p-2 space-y-2">
                    <div className="h-3 bg-neutral-100 rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-neutral-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && items.length === 0 ? (
            <EmptyState q={committed.q} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {items.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>

              <div ref={sentinelRef} className="h-8" />

              {loading && items.length > 0 && (
                <div className="py-4 text-center text-sm text-neutral-500">
                  Loading…
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
