// components/CategorySheetPicker.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  ChevronsUpDown,
  ChevronRight,
  ChevronLeft,
  Check,
  Search,
  X,
} from "lucide-react";

/* ───────────── Helpers ───────────── */
function prettifySlug(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function prettyPath(path: string) {
  return path.split("/").map(prettifySlug).join(" / ");
}
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
// Fallback heuristic for primaries: no "/" in path
const isLikelyPrimaryFromPath = (path: string) => !path.includes("/");

/* ───────────── Types ───────────── */
type Cat = {
  id: string;
  path: string;
  slug: string;
  name_en: string | null;
  name_fr: string | null;
  name_ar: string | null;
  parent_id: string | null;
  image_url?: string | null;
  is_active?: boolean | null;
};

type Crumb = {
  id: string | null; // null = top
  label: string;
  path: string; // "" at top
};

type SuggestionRow = {
  category_id: string;
  path: string;
  crumb?: string | null;
  score: number;
};

export default function CategorySheetPicker({
  title,
  value,
  onChange,
  placeholder = "Select a category",
  lang = "en",
}: {
  title: string;
  value: string | null;
  onChange: (id: string, path: string) => void;
  placeholder?: string;
  lang?: "en" | "fr" | "ar";
}) {
  const [open, setOpen] = useState(false);

  const [debug, setDebug] = useState<string | null>(null);
  const setFirstError = (label: string, err: any) => {
    const msg = `${label}: ${err?.message ?? err ?? "Unknown error"}`;
    console.error(msg, err);
    setDebug((d) => d ?? msg);
  };

  const [selected, setSelected] = useState<{ id: string; path: string } | null>(
    null
  );

  const [items, setItems] = useState<Cat[]>([]);
  const [loadingLevel, setLoadingLevel] = useState(false);

  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<Cat[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      const term = query.trim();
      if (!term) {
        setSearchResults([]);
        setLoadingSearch(false);
        return;
      }
      setLoadingSearch(true);

      const res = await supabase
        .from("categories")
        .select(
          "id, path, slug, name_en, name_fr, name_ar, is_active, parent_id"
        )
        .eq("is_active", true)
        .not("parent_id", "is", null) // exclude primaries
        .or(
          [
            `name_en.ilike.%${term}%`,
            `name_fr.ilike.%${term}%`,
            `name_ar.ilike.%${term}%`,
            `slug.ilike.%${term}%`,
            `path.ilike.%${term}%`,
          ].join(",")
        )
        .order("path", { ascending: true })
        .limit(50);

      if (res.error) {
        setFirstError("Search query failed", res.error);
        const fb = await supabase
          .from("categories")
          .select("id, path, slug, name_en, name_fr, name_ar, parent_id")
          .not("parent_id", "is", null)
          .or(
            [
              `name_en.ilike.%${term}%`,
              `name_fr.ilike.%${term}%`,
              `name_ar.ilike.%${term}%`,
              `slug.ilike.%${term}%`,
              `path.ilike.%${term}%`,
            ].join(",")
          )
          .order("path", { ascending: true })
          .limit(50);
        if (!fb.error) setSearchResults((fb.data as Cat[]) ?? []);
      } else {
        setSearchResults((res.data as Cat[]) ?? []);
      }
      setLoadingSearch(false);
    }, 250)
  ).current;

  const [crumbs, setCrumbs] = useState<Crumb[]>([
    { id: null, label: "Categories", path: "" },
  ]);

  useEffect(() => {
    (async () => {
      if (!value) {
        setSelected(null);
        return;
      }
      const { data, error } = await supabase
        .from("categories")
        .select("id, path")
        .eq("id", value)
        .maybeSingle();
      if (error) setFirstError("Fetch selected category failed", error);
      if (data) setSelected({ id: data.id, path: data.path });
    })();
  }, [value]);

  const didPrimeRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (didPrimeRef.current) return;
    didPrimeRef.current = true;
    void loadLevel(null, "Categories", "");
  }, [open]);

  const loadLevel = useCallback(
    async (parentId: string | null, label: string, path: string) => {
      setLoadingLevel(true);

      const base = supabase
        .from("categories")
        .select(
          "id, path, slug, name_en, name_fr, name_ar, parent_id, image_url, is_active"
        )
        .order("sort", { ascending: false })
        .order("name_en", { ascending: true });

      const res =
        parentId === null
          ? await base.is("parent_id", null).eq("is_active", true)
          : await base.eq("parent_id", parentId).eq("is_active", true);

      if (res.error) {
        setFirstError("Load level failed", res.error);
        const fb =
          parentId === null
            ? await supabase
                .from("categories")
                .select(
                  "id, path, slug, name_en, name_fr, name_ar, parent_id, image_url"
                )
                .is("parent_id", null)
                .order("name_en", { ascending: true })
            : await supabase
                .from("categories")
                .select(
                  "id, path, slug, name_en, name_fr, name_ar, parent_id, image_url"
                )
                .eq("parent_id", parentId)
                .order("name_en", { ascending: true });

        if (!fb.error) setItems((fb.data as Cat[]) ?? []);
      } else {
        setItems((res.data as Cat[]) ?? []);
      }

      setCrumbs((prev) => {
        const idx = prev.findIndex((c) => c.id === parentId && c.path === path);
        if (idx >= 0) return prev.slice(0, idx + 1);
        return [...prev, { id: parentId, label, path }];
      });

      setLoadingLevel(false);
    },
    []
  );

  // Replace your async onRowPress with this version (no extra query on secondary)
  function onRowPress(c: Cat) {
    const atRootNow = crumbs[crumbs.length - 1]?.id === null;

    // If we're at the root, navigate deeper (may show loading skeleton briefly)
    if (atRootNow) {
      const label =
        (lang === "ar" && (c.name_ar || c.name_en)) ||
        (lang === "fr" && (c.name_fr || c.name_en)) ||
        c.name_en ||
        c.slug ||
        c.path;

      // Only here do we change the loadingLevel because we actually fetch a new level
      setLoadingLevel(true);
      Promise.resolve(loadLevel(c.id, label, c.path)).finally(() =>
        setLoadingLevel(false)
      );
      return;
    }

    // Otherwise (secondary and deeper): just pick without toggling global loading
    pick(c.id, c.path);
  }

  function pick(id: string, path: string) {
    setSelected({ id, path });
    onChange(id, path);
  }

  async function goToCrumb(index: number) {
    const target = crumbs[index];
    setCrumbs((prev) => prev.slice(0, index + 1));
    await loadLevel(target.id, target.label, target.path);
  }

  useEffect(() => {
    setLoadingSearch(!!q.trim());
    debouncedSearch(q);
  }, [q, debouncedSearch]);

  const showingSearch = q.trim().length > 0;
  const triggerLabel = useMemo(
    () => (selected ? prettyPath(selected.path) : placeholder),
    [selected, placeholder]
  );

  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // Load suggestions and exclude primaries
  useEffect(() => {
    const run = debounce(async (t: string) => {
      const meaningful = t.trim().length >= 3 && /\s/.test(t);
      if (!meaningful) {
        setSuggestions([]);
        return;
      }
      setLoadingSuggest(true);

      const { data, error } = await supabase.rpc("suggest_categories", {
        title_text: t,
        lang: "en",
        max_results: 6,
        min_score: 0.16,
      });

      if (error) {
        setFirstError("Suggestions failed", error);
        setSuggestions([]);
        setLoadingSuggest(false);
        return;
      }

      const raw: SuggestionRow[] = (data as SuggestionRow[]) ?? [];
      if (!raw.length) {
        setSuggestions([]);
        setLoadingSuggest(false);
        return;
      }

      const ids = raw.map((r) => r.category_id);
      const meta = await supabase
        .from("categories")
        .select("id, parent_id, path")
        .in("id", ids);

      let filtered: SuggestionRow[] = raw;

      if (meta.error) {
        // fallback by path
        filtered = raw.filter((r) => !isLikelyPrimaryFromPath(r.path));
      } else {
        const parentMap = new Map(
          (
            meta.data as {
              id: string;
              parent_id: string | null;
              path: string;
            }[]
          ).map((m) => [m.id, m.parent_id])
        );
        filtered = raw.filter((r) => parentMap.get(r.category_id) !== null);
      }

      // de-dup by label key
      const seen = new Set<string>();
      const deduped: SuggestionRow[] = [];
      for (const s of filtered) {
        const key = (s.crumb ?? s.path).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(s);
        }
      }

      setSuggestions(deduped);
      setLoadingSuggest(false);
    }, 300);

    run(title || "");
  }, [title]);

  /* ── Dynamic sticky offsets ── */
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerH, setHeaderH] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      setHeaderH(h);
    };
    measure();
    window.addEventListener("resize", measure);
    const rAF = requestAnimationFrame(measure);
    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(rAF);
    };
  }, []);
  useEffect(() => {
    const h = headerRef.current?.offsetHeight ?? 0;
    if (h !== headerH) setHeaderH(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, debug]);

  /* ───────────── Render ───────────── */
  // Are we at the root (primary categories list)?
  const atRoot = crumbs[crumbs.length - 1]?.id === null;

  return (
    <div className="space-y-1">
      {/* Trigger */}
      <Sheet
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setDebug(null);
        }}
      >
        <SheetTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className={clsx(
              "w-full inline-flex items-center justify-between rounded-lg border px-3 py-2 text-left h-12",
              "bg-white hover:bg-neutral-50 transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta/60"
            )}
            aria-label="Open category picker"
          >
            <span className={clsx("truncate", !selected && "text-neutral-500")}>
              {triggerLabel}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-70 shrink-0" />
          </button>
        </SheetTrigger>

        {/* ── Restyled Drawer like your example ── */}
        <SheetContent
          side="bottom"
          className={clsx(
            "max-w-screen-sm mx-auto",
            "rounded-t-2xl bg-white shadow-2xl border-t border-ink/10",
            "px-0 pt-2 pb-[env(safe-area-inset-bottom)]",
            // hide the default close button
            "[&>button[data-radix-sheet-close]]:hidden"
          )}
        >
          {/* Grabber */}
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />

          <div className="h-[calc(86vh-0px)] flex flex-col">
            {/* Sticky header (title + debug) */}
            <div
              ref={headerRef}
              className="sticky top-0 z-10 bg-white/80 backdrop-blur supports-backdrop-filter:bg-white/60"
            >
              <SheetHeader className="px-4 pt-1 pb-3">
                <SheetTitle className="text-[17px] font-semibold">
                  Select category
                </SheetTitle>
                {debug && (
                  <div className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
                    {debug}
                  </div>
                )}
              </SheetHeader>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-auto">
              {/* Search above recommendations */}
              <div
                className="z-10 bg-white/90 backdrop-blur supports-backdrop-filter:bg-white/70"
                style={{ top: headerH }}
              >
                <div className="px-4 py-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search categories…"
                      className="pl-9 pr-9"
                      aria-label="Search categories"
                    />
                    {q && (
                      <button
                        type="button"
                        onClick={() => setQ("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-neutral-100"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4 opacity-70" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Recommendations (hidden while typing) */}
              {!q.trim().length && (
                <div className="px-4 pt-2 pb-6">
                  <div className="text-xs font-medium text-neutral-600 mb-2">
                    {loadingSuggest
                      ? "Loading suggestions…"
                      : "Recommended suggestions"}
                  </div>
                  {loadingSuggest ? (
                    <div className="flex gap-2 flex-wrap">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-7 w-28 rounded-full bg-sand animate-pulse"
                        />
                      ))}
                    </div>
                  ) : suggestions.length ? (
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((s) => {
                        const id = s.category_id;
                        const active = selected?.id === id;
                        const label = s.crumb ? s.crumb : prettyPath(s.path);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => pick(id, s.path)}
                            className={clsx(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              active
                                ? "bg-black text-white border-black"
                                : "hover:bg-sand"
                            )}
                            aria-pressed={active}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500">
                      No suggestions yet.
                    </div>
                  )}
                </div>
              )}

              {/* NOTE: Removed the “Back to Categories” strip entirely */}

              {/* Results OR Hierarchy List */}
              <div className="px-1">
                {q.trim().length ? (
                  <>
                    <div className="px-3 pb-2 pt-2 text-xs font-semibold tracking-wide text-neutral-600 uppercase">
                      {loadingSearch ? "Searching…" : "Results"}
                    </div>
                    {loadingSearch ? (
                      <ul>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <li key={i} className="px-4 py-3">
                            <div className="h-4 w-3/4 rounded bg-neutral-200 animate-pulse" />
                          </li>
                        ))}
                      </ul>
                    ) : searchResults.length ? (
                      <ul className="divide-y">
                        {searchResults.map((c) => {
                          const active = selected?.id === c.id;
                          // Search results are subcategories
                          return (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => pick(c.id, c.path)}
                                className={clsx(
                                  "w-full px-4 py-3 flex items-center gap-2 text-left transition-colors",
                                  active
                                    ? "bg-black text-white"
                                    : "hover:bg-neutral-50"
                                )}
                                aria-current={active ? "true" : "false"}
                              >
                                {/* In search results we DON'T show images; also no per-row back chevron here */}
                                <span className="truncate">
                                  {prettyPath(c.path)}
                                </span>
                                {active && (
                                  <Check className="ml-auto h-4 w-4 opacity-90" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 py-10 text-sm text-neutral-500">
                        No categories found.
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {loadingLevel ? (
                      <ul className="divide-y">
                        {Array.from({ length: 10 }).map((_, i) => (
                          <li key={i} className="px-4 py-3">
                            <div className="h-4 w-2/3 rounded bg-neutral-200 animate-pulse" />
                          </li>
                        ))}
                      </ul>
                    ) : items.length ? (
                      <ul className="divide-y">
                        {items.map((c) => {
                          const label =
                            (lang === "ar" && (c.name_ar || c.name_en)) ||
                            (lang === "fr" && (c.name_fr || c.name_en)) ||
                            c.name_en ||
                            c.slug ||
                            c.path;
                          const active = selected?.id === c.id;

                          return (
                            <li key={c.id}>
                              <div
                                className={clsx(
                                  "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                                  active
                                    ? "bg-black text-white"
                                    : "hover:bg-neutral-50"
                                )}
                              >
                                {/* When NOT at root (subcategory screens), show a small back chevron inside each row.
                                    This navigates up one level (previous crumb). */}
                                {!atRoot && (
                                  <button
                                    type="button"
                                    aria-label="Go up one level"
                                    className={clsx(
                                      "h-7 w-7 grid place-items-center rounded-md",
                                      active
                                        ? "bg-white/10"
                                        : "bg-white/10 hover:bg-neutral-200"
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (crumbs.length > 1) {
                                        void goToCrumb(crumbs.length - 2);
                                      }
                                    }}
                                  >
                                    <ChevronLeft
                                      className={clsx(
                                        "h-4 w-4",
                                        active ? "opacity-90" : "opacity-70"
                                      )}
                                    />
                                  </button>
                                )}

                                {/* No images at root or anywhere */}
                                <button
                                  type="button"
                                  onClick={() => onRowPress(c)}
                                  className="flex-1 text-left flex items-center gap-3 min-w-0"
                                >
                                  <span className="truncate">{label}</span>

                                  <span className="ml-auto flex items-center gap-2">
                                    {active && (
                                      <Check className="h-4 w-4 opacity-90 shrink-0" />
                                    )}
                                    {/* Only show forward chevron when at root (indicates deeper levels) */}
                                    {atRoot && (
                                      <ChevronRight className="h-4 w-4 opacity-60 shrink-0" />
                                    )}
                                  </span>
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="px-4 py-10 text-sm text-neutral-500">
                        No categories here.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-white sticky bottom-0">
              <SheetFooter className="p-3 grid grid-cols-1 gap-2">
                <Button
                  className="w-full h-12 rounded-full"
                  disabled={!selected}
                  onClick={() => setOpen(false)}
                >
                  Done
                </Button>
              </SheetFooter>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
