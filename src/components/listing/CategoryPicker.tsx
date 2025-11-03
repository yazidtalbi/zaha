// components/listing/CategoryCombobox.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/* ----------------- tiny debounce ----------------- */
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ----------------- types ----------------- */
type CategoryRow = { id: string; path: string };
type SuggestionRow = {
  category_id: string;
  path: string;
  crumb?: string;
  score: number;
};

/* ----------------- helpers ----------------- */
function prettyPath(path: string) {
  return path
    .split("/")
    .map((slug) =>
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
    .join(" / ");
}

/* ===========================================================
   CategoryCombobox
   =========================================================== */
export default function CategoryCombobox({
  title,
  value,
  onChange,
  placeholder = "Select a category",
}: {
  title: string; // product title to drive suggestions
  value: string | null; // selected category_id
  onChange: (id: string, path: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(""); // CommandInput value
  const [suggestions, setSuggestions] = useState<SuggestionRow[]>([]);
  const [results, setResults] = useState<CategoryRow[]>([]);
  const [selected, setSelected] = useState<{ id: string; path: string } | null>(
    null
  );

  // keep selected in sync when parent updates
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    // optional: fetch path for value (if you don't already have it)
    (async () => {
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
      const looksUseful = t.trim().length >= 3 && /\s/.test(t);
      if (!looksUseful) {
        setSuggestions([]);
        return;
      }
      const { data } = await supabase.rpc("suggest_categories", {
        title_text: t,
        lang: "en",
        max_results: 6,
        min_score: 0.16,
      });
      setSuggestions((data as SuggestionRow[]) ?? []);
    }, 300);
    run(title || "");
  }, [title]);

  // search when user types
  useEffect(() => {
    let active = true;
    (async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const { data, error } = await supabase
        .from("categories")
        .select("id, path")
        .or(
          `name_en.ilike.%${query}%,keywords.ilike.%${query}%,path.ilike.%${query}%`
        )
        .order("path", { ascending: true })
        .limit(50);
      if (!error && active) setResults((data as CategoryRow[]) ?? []);
    })();
    return () => {
      active = false;
    };
  }, [query]);

  const showingSuggestions = useMemo(
    () => !query.trim() && suggestions.length > 0,
    [query, suggestions.length]
  );

  function select(id: string, path: string) {
    setSelected({ id, path });
    onChange(id, path);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected ? (
            prettyPath(selected.path)
          ) : (
            <span className="text-neutral-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[min(560px,90vw)]">
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Type to search the full catalog…"
          />
          <CommandList className="max-h-72">
            {/* Search mode */}
            {!showingSuggestions && (
              <>
                <CommandEmpty>No categories found.</CommandEmpty>
                <CommandGroup heading="Search results">
                  {results.map((c) => {
                    const active = selected?.id === c.id;
                    return (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => select(c.id, c.path)}
                      >
                        <span className="truncate">{prettyPath(c.path)}</span>
                        {active && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}

            {/* Suggestion mode (empty query) */}
            {showingSuggestions && (
              <>
                <CommandGroup heading="Suggested from the title">
                  {suggestions.map((s) => {
                    const id = s.category_id;
                    const active = selected?.id === id;
                    const label = s.crumb ? s.crumb : prettyPath(s.path);
                    return (
                      <CommandItem
                        key={id}
                        value={id}
                        onSelect={() => select(id, s.path)}
                      >
                        <span className="truncate">{label}</span>
                        {active && <Check className="ml-auto h-4 w-4" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__focus"
                    onSelect={() => {
                      // focus the input so user can start typing to refine
                      const el = document.querySelector<HTMLInputElement>(
                        "[data-command][cmdk-input]"
                      );
                      el?.focus();
                    }}
                  >
                    Start typing to search all categories…
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
