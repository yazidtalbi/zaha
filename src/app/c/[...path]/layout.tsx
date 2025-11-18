// app/c/layout.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ChevronLeft } from "lucide-react";

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
    <div className="mb-3 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 py-1 px-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 rounded-full bg-neutral-200 animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

export default function CLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
    <div className="max-w-6xl mx-auto px-3 pt-4">
      <div className="flex items-center gap-2 rounded-full border bg-white h-11 px-3">
        {/* Back icon */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent triggering the main button
            if (window.history.length > 1) router.back();
            else router.push("/");
          }}
          className="shrink-0 p-1 -ml-1 rounded-full hover:bg-black/5 active:scale-95 transition"
        >
          <ChevronLeft className="h-5 w-5 opacity-70" />
        </button>

        {/* Main search trigger (rest of pill) */}
        <button
          onClick={() => router.push("/search")}
          className="flex-1 flex items-center gap-2 h-full -ml-1 active:scale-[0.98] transition text-left"
        >
          <span className="text-sm text-neutral-400">Search on Zaha..</span>
        </button>
      </div>

      {/* Title for the top category, stable because it's derived from URL */}
      <h1 className="text-2xl font-semibold mb-2 pt-4">
        {prettify(topPath || "Category")}
      </h1>

      {/* Tabs — now as pills */}
      {ready ? (
        <div className="mb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 py-1 px-1">
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
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition ${
                    active
                      ? "bg-[#371837] text-white border-[#371837] shadow-sm"
                      : "bg-neutral-100 text-neutral-700 border-transparent hover:bg-sand/80"
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
