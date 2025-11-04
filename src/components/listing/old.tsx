"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Check, ChevronsUpDown, Search, X } from "lucide-react";

/* ---------------- tiny debounce (no deps) ---------------- */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let t: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ---------------- helpers ---------------- */
function prettyPath(path: string) {
  return path
    .split("/")
    .map((slug) =>
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" / ");
}

/* ---------------- types ---------------- */
type CategoryRow = { id: string; path: string };
type SuggestionRow = {
  category_id: string;
  path: string;
  crumb?: string;
  score: number;
};

export default function CategorySheetPicker({
  title, // product title (drives suggestions)
  value, // selected category_id
  onChange,
  placeholder = "Select a category",
}: {
  title: string;
  value: string | null;
  onChange: (id: string, path: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState<{ id: string; path: string } | null>(
    null
  );

  // search UI state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CategoryRow[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // suggestions (when query is empty)
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);

  // sync incoming value -> fetch its path once (for the trigger label)
  useEffect(() => {
    (async () => {
      if (!value) {
        setSelected(null);
        return;
      }
      const { data } = await supabase
        .from("categories")
        .select("id, path")
        .eq("id", value)
        .maybeSingle();
      if (data) setSelected({ id: data.id, path: data.path });
    })();
  }, [value]);

  // suggestions from title (debounced)
  useEffect(() => {
    const run = debounce(async (t: string) => {
      const meaningful = t.trim().length >= 3 && /\s/.test(t);
      if (!meaningful) {
        setSuggestions([]);
        return;
      }
      setLoadingSuggest(true);
      const { data } = await supabase.rpc("suggest_categories", {
        title_text: t,
        lang: "en",
        max_results: 6,
        min_score: 0.16,
      });
      setSuggestions((data as SuggestionRow[]) ?? []);
      setLoadingSuggest(false);
    }, 300);
    run(title || "");
  }, [title]);

  // live search (when user types)
  useEffect(() => {
    let active = true;
    (async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }
      setLoadingSearch(true);
      const { data, error } = await supabase
        .from("categories")
        .select("id, path")
        .or(`name_en.ilike.%${q}%,keywords.ilike.%${q}%,path.ilike.%${q}%`)
        .order("path", { ascending: true })
        .limit(50);
      if (!error && active) setResults((data as CategoryRow[]) ?? []);
      setLoadingSearch(false);
    })();
    return () => {
      active = false;
    };
  }, [query]);

  const showingSuggestions = useMemo(
    () => !query.trim() && suggestions.length > 0,
    [query, suggestions.length]
  );

  function pick(id: string, path: string) {
    setSelected({ id, path });
    onChange(id, path);
    setOpen(false);
  }

  return (
    <div className="space-y-1">
      {/* Trigger (compact field) */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between"
          >
            {selected ? (
              <span className="truncate">{prettyPath(selected.path)}</span>
            ) : (
              <span className="text-neutral-500">{placeholder}</span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-70" />
          </Button>
        </SheetTrigger>

        <SheetContent side="bottom" className="h-[85vh] p-0">
          <div className="h-full flex flex-col">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle>Selected category</SheetTitle>
              <div className="mt-2">
                <Button variant="secondary" className="w-full justify-start">
                  {selected ? prettyPath(selected.path) : "—"}
                </Button>
              </div>
            </SheetHeader>

            {/* Search bar */}
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-70" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search categories…"
                  className="pl-9 pr-9"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label="Clear"
                  >
                    <X className="h-4 w-4 opacity-70" />
                  </button>
                )}
              </div>
            </div>

            {/* List / Suggestions */}
            <div className="px-1 flex-1 overflow-auto">
              {/* Search results */}
              {query.trim() && (
                <div className="px-3 pb-2 text-sm font-medium text-neutral-600">
                  {loadingSearch ? "Searching…" : "Results"}
                </div>
              )}
              {query.trim() &&
                (results.length ? (
                  <ul className="divide-y">
                    {results.map((r) => {
                      const active = selected?.id === r.id;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => pick(r.id, r.path)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-2 ${
                              active ? "bg-black text-white" : "hover:bg-muted"
                            }`}
                          >
                            <span className="truncate">
                              {prettyPath(r.path)}
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
                  <div className="px-4 py-6 text-sm text-neutral-500">
                    {loadingSearch ? "" : "No categories found."}
                  </div>
                ))}

              {/* Suggestions (when no query) */}
              {!query.trim() && (
                <>
                  <div className="px-3 pb-2 text-sm font-medium text-neutral-600">
                    {loadingSuggest
                      ? "Loading suggestions…"
                      : "Recommended suggestions"}
                  </div>
                  {suggestions.length ? (
                    <div className="px-3 pb-4 flex flex-wrap gap-2">
                      {suggestions.map((s) => {
                        const id = s.category_id;
                        const active = selected?.id === id;
                        const label = s.crumb ? s.crumb : prettyPath(s.path);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => pick(id, s.path)}
                            className={
                              "rounded-full border px-3 py-1.5 text-sm " +
                              (active
                                ? "bg-black text-white border-black"
                                : "hover:bg-muted")
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-4 py-6 text-sm text-neutral-500">
                      {loadingSuggest ? "" : "No suggestions yet."}
                    </div>
                  )}
                </>
              )}
            </div>

            <SheetFooter className="p-4">
              <Button className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
