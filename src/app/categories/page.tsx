// app/categories/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronRight, Search, RefreshCw } from "lucide-react";

type RawCat = {
  id: string;
  path: string | null;
  slug: string | null;
  name_en: string | null;
  name_fr: string | null;
  name_ar: string | null;
  parent_id: string | null;
  depth: number | null;
  sort: number | null;
  is_active: boolean | null;
  image_url: string | null;
};

type Cat = {
  id: string;
  name: string;
  href: string;
  image?: string | null;
  parentId: string | null;
  depth: number;
};

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

function mapCat(c: RawCat, lang: "en" | "fr" | "ar"): Cat {
  const name =
    (lang === "ar" && (c.name_ar || c.name_en)) ||
    (lang === "fr" && (c.name_fr || c.name_en)) ||
    c.name_en ||
    c.slug ||
    c.path ||
    "Category";

  const path = c.path || c.slug || c.id;
  return {
    id: c.id,
    name,
    href: `/c/${encodeURIComponent(path)}`,
    image: c.image_url ?? null,
    parentId: c.parent_id,
    depth: c.depth ?? 0,
  };
}

function getInitials(label: string) {
  const [a = "", b = ""] = label.trim().split(/\s+/);
  return (a[0] || "").toUpperCase() + (b[0] || "").toUpperCase();
}

export default function CategoriesPage({
  lang = "en",
}: {
  lang?: "en" | "fr" | "ar";
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // raw data
  const [top, setTop] = useState<Cat[]>([]);
  const [children, setChildren] = useState<Cat[]>([]);

  // ui state
  const [q, setQ] = useState("");
  const [alpha, setAlpha] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;

    (async () => {
      setLoading(true);
      setError(null);

      // fetch top-level
      const topQ = supabase
        .from("categories")
        .select(
          "id, path, slug, name_en, name_fr, name_ar, parent_id, depth, sort, is_active, image_url"
        )
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort", { ascending: false })
        .order("name_en", { ascending: true });

      // fetch children (depth = 1) — first level under top
      const childQ = supabase
        .from("categories")
        .select(
          "id, path, slug, name_en, name_fr, name_ar, parent_id, depth, sort, is_active, image_url"
        )
        .not("parent_id", "is", null)
        .eq("is_active", true)
        .lte("depth", 1) // only immediate children
        .order("sort", { ascending: false })
        .order("name_en", { ascending: true });

      const [{ data: topRows, error: e1 }, { data: childRows, error: e2 }] =
        await Promise.all([topQ, childQ]);

      if (canceled) return;

      if (e1 || e2) {
        setError(e1?.message || e2?.message || "Failed to load categories");
        setTop([]);
        setChildren([]);
      } else {
        setTop((topRows ?? []).map((c) => mapCat(c as RawCat, lang)));
        setChildren((childRows ?? []).map((c) => mapCat(c as RawCat, lang)));
      }
      setLoading(false);
    })();

    return () => {
      canceled = true;
    };
  }, [lang]);

  // build sections with children
  const sections = useMemo(() => {
    const map: Record<string, { parent: Cat; kids: Cat[] }> =
      Object.create(null);

    for (const p of top) map[p.id] = { parent: p, kids: [] };
    for (const c of children) {
      if (!c.parentId) continue;
      if (!map[c.parentId]) continue;
      map[c.parentId].kids.push(c);
    }

    // sorting for deterministic UX
    const arr = Object.values(map).sort((a, b) =>
      a.parent.name.localeCompare(b.parent.name)
    );
    arr.forEach((s) => s.kids.sort((a, b) => a.name.localeCompare(b.name)));
    return arr;
  }, [top, children]);

  // search + alpha filters
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    const first = alpha?.toUpperCase() ?? null;

    return sections
      .filter(({ parent }) => {
        const keepAlpha = first
          ? parent.name[0]?.toUpperCase() === first
          : true;
        if (!keepAlpha) return false;

        if (!text) return true;
        return (
          parent.name.toLowerCase().includes(text) ||
          parent.href.toLowerCase().includes(text)
        );
      })
      .map(({ parent, kids }) => {
        const fk = !q
          ? kids
          : kids.filter(
              (k) =>
                k.name.toLowerCase().includes(q.toLowerCase()) ||
                k.href.toLowerCase().includes(q.toLowerCase())
            );
        return { parent, kids: fk };
      });
  }, [sections, q, alpha]);

  const alphabet = useMemo(
    () => Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
    []
  );

  return (
    <main className="min-h-[80vh]">
      {/* Page header */}
      <div className="sticky top-0 z-30 bg-paper/80 backdrop-blur border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Browse all categories</h1>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Go back
          </Button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search categories…"
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => {
                setQ("");
                setAlpha(null);
              }}
              title="Reset filters"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Alphabet filter */}
          <div className="mt-2 flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setAlpha(null)}
              className={clsx(
                "px-2.5 py-1.5 rounded-md text-sm border",
                !alpha ? "bg-sand" : "bg-white hover:bg-sand/60"
              )}
            >
              All
            </button>
            {alphabet.map((ch) => (
              <button
                key={ch}
                onClick={() => setAlpha(ch)}
                className={clsx(
                  "px-2.5 py-1.5 rounded-md text-sm border",
                  alpha === ch ? "bg-sand" : "bg-white hover:bg-sand/60"
                )}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg border bg-white overflow-hidden animate-pulse"
              >
                <div className="aspect-[5/3] bg-neutral-200" />
                <div className="p-3">
                  <div className="h-4 w-4/5 bg-neutral-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-sm text-red-600">
            Failed to load categories: {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-sm text-neutral-700">No categories found.</div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-8">
            {filtered.map(({ parent, kids }) => (
              <section key={parent.id}>
                {/* Parent row */}
                <Link
                  href={parent.href}
                  className="group flex items-center gap-3 rounded-xl border bg-white overflow-hidden hover:shadow-sm transition"
                >
                  {/* Visual */}
                  <div className="w-40 shrink-0 aspect-[5/3] bg-neutral-100 relative">
                    {parent.image ? (
                      <img
                        src={parent.image}
                        alt={parent.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-sand to-paper">
                        <span className="text-[18px] font-semibold text-ink/80">
                          {getInitials(parent.name)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 pr-3 py-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold">{parent.name}</h2>
                      <ChevronRight className="h-4 w-4 text-neutral-500 group-hover:translate-x-0.5 transition" />
                    </div>

                    {/* Children pills */}
                    {kids.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {kids.slice(0, 10).map((k) => (
                          <Link
                            key={k.id}
                            href={k.href}
                            className="inline-flex items-center rounded-full border px-3 h-8 text-sm bg-neutral-50 hover:bg-neutral-100"
                          >
                            {k.name}
                          </Link>
                        ))}
                        {kids.length > 10 && (
                          <Link
                            href={parent.href}
                            className="inline-flex items-center rounded-full border px-3 h-8 text-sm bg-sand hover:bg-sand/80"
                          >
                            +{kids.length - 10} more
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
