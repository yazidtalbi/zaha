// app/c/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Category = {
  id: string;
  path: string;
  slug: string;
  name_en: string | null;
  sort?: number | null;
};

// 🔒 Module-scoped cache: survives re-renders and most client navigations
const TABS_CACHE = new Map<string, Category[]>();

function prettify(s: string) {
  return s
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function TabsSkeleton() {
  return (
    <div className="mb-3 border-b overflow-x-auto no-scrollbar">
      <div className="flex gap-6 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-6 w-24 rounded bg-sand animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default function CLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); // e.g. /c/home-living/decor
  const pathAfterC = useMemo(() => pathname.replace(/^\/c\/?/, ""), [pathname]);

  // topPath is the first segment after /c/
  const topPath = useMemo(() => {
    const seg = pathAfterC.split("/").filter(Boolean)[0] || "";
    return seg;
  }, [pathAfterC]);

  // active tab slug is the second segment (or "all")
  const activeSlug = useMemo(() => {
    const segs = pathAfterC.split("/").filter(Boolean);
    return segs[1] ?? "all";
  }, [pathAfterC]);

  // pull from cache instantly; fetch only if missing
  const [childrenCats, setChildrenCats] = useState<Category[]>(
    TABS_CACHE.get(topPath) ?? []
  );
  const [ready, setReady] = useState<boolean>(TABS_CACHE.has(topPath));

  useEffect(() => {
    let alive = true;
    if (!topPath) {
      setChildrenCats([]);
      setReady(true);
      return;
    }
    // If cached → do nothing (no reset)
    if (TABS_CACHE.has(topPath)) {
      setChildrenCats(TABS_CACHE.get(topPath)!);
      setReady(true);
      return;
    }

    // First time we see this topPath → fetch once and cache
    (async () => {
      const { data: parent } = await supabase
        .from("categories")
        .select("id")
        .eq("path", topPath)
        .maybeSingle();

      if (!alive || !parent?.id) {
        if (alive) setReady(true);
        return;
      }

      const { data: kids } = await supabase
        .from("categories")
        .select("id, path, slug, name_en, sort")
        .eq("parent_id", parent.id)
        .order("sort", { ascending: false })
        .order("name_en", { ascending: true });

      if (!alive) return;
      const next = (kids as any[]) ?? [];
      TABS_CACHE.set(topPath, next);
      setChildrenCats(next);
      setReady(true);
    })();

    return () => {
      alive = false;
    };
  }, [topPath]);

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4">
      {/* Title for the top category, stable because it's derived from URL */}
      <h1 className="text-2xl font-semibold mb-2">
        {prettify(topPath || "Category")}
      </h1>

      {/* Tabs — rendered from cache; only active underline changes */}
      {ready ? (
        <div className="mb-3 border-b overflow-x-auto no-scrollbar">
          <div className="flex gap-6">
            {[
              { label: "All", slug: "all" },
              ...childrenCats.map((c) => ({
                label: prettify(c.name_en ?? c.slug),
                slug: c.slug,
              })),
            ].map((t) => {
              const href =
                t.slug === "all" ? `/c/${topPath}` : `/c/${topPath}/${t.slug}`;
              const active =
                (t.slug === "all" && pathAfterC === topPath) ||
                activeSlug === t.slug;

              return (
                <Link
                  key={`${topPath}-${t.slug}`}
                  href={href}
                  prefetch
                  className={`pb-3 whitespace-nowrap font-medium ${
                    active
                      ? "text-ink border-b-2 border-terracotta"
                      : "text-neutral-500 hover:text-ink"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <TabsSkeleton />
      )}

      {/* Page content (product grid, filters, etc.) */}
      <div className="pb-6">{children}</div>
    </div>
  );
}
