// home/CategoriesStrip.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/lib/supabaseClient";

type CategoryCard = {
  id: string;
  name: string;
  href: string;
  image?: string | null;
};

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

/* -------- simple cross-mount cache (persists while app lives) -------- */
let TOP_LVL_CAT_CACHE: CategoryCard[] | null = null;

export default function CategoriesStrip({
  initial,
  title = "Shop by category",
  limit = 24,
  rows = 3,
  lang = "en",
  /** 'default' keeps card layout; 'minimal' shows pill tags */
  variant = "default",
  moreHref = "/categories",
}: {
  initial?: CategoryCard[];
  title?: string;
  limit?: number;
  rows?: number;
  lang?: "en" | "fr" | "ar";
  variant?: "default" | "minimal";
  moreHref?: string;
}) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
  });

  const [items, setItems] = useState<CategoryCard[]>(initial ?? []);
  const [loading, setLoading] = useState(!(initial && initial.length > 0));
  const [debug, setDebug] = useState<string | null>(null);

  // Try to hydrate from sessionStorage once on first mount (in case of hard reload)
  useEffect(() => {
    if (!TOP_LVL_CAT_CACHE) {
      const raw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("zaha_toplvl_cats_v1")
          : null;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CategoryCard[];
          TOP_LVL_CAT_CACHE = parsed;
          if (!initial || initial.length === 0) {
            setItems(parsed);
            setLoading(false);
          }
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If server passed initial, use it and prime cache
    if (initial && initial.length > 0) {
      setItems(initial);
      TOP_LVL_CAT_CACHE = initial;
      setLoading(false);
      return;
    }

    // Serve instantly from cache if available
    if (TOP_LVL_CAT_CACHE) {
      setItems(TOP_LVL_CAT_CACHE);
      setLoading(false);
      return;
    }

    // Otherwise fetch once
    (async () => {
      setLoading(true);
      setDebug(null);

      const { data, error } = await supabase
        .from("categories")
        .select(
          "id, path, slug, name_en, name_fr, name_ar, parent_id, depth, sort, is_active, image_url"
        )
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort", { ascending: false })
        .order("name_en", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Top-level categories error:", error);
        setDebug(error.message);
        setItems([]);
      } else {
        const mapped = mapCats(data ?? [], lang);
        TOP_LVL_CAT_CACHE = mapped;
        setItems(mapped);
        try {
          sessionStorage.setItem("zaha_toplvl_cats_v1", JSON.stringify(mapped));
        } catch {}
      }
      setLoading(false);
    })();
  }, [initial, limit, lang]);

  const groups = useMemo(() => chunk(items, rows), [items, rows]);
  const empty = !loading && items.length === 0;

  /* ---------- MINIMAL VARIANT (pill tags) ---------- */
  if (variant === "minimal") {
    const pills = useMemo(() => items.slice(0, 10), [items]); // stable cap 10

    return (
      <section className="py-3">
        <nav className="  ">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {pills.map((c) => (
              <Link
                key={c.id}
                href={c.href}
                prefetch
                className="inline-flex items-center whitespace-nowrap rounded-full
                           border border-black/10 bg-neutral-50 px-3 h-8 text-sm
                           text-ink/80 hover:bg-neutral-100 active:scale-[0.98] transition font-medium"
              >
                {c.name}
              </Link>
            ))}

            {/* + More chip */}
            <Link
              href={moreHref}
              prefetch
              className="inline-flex items-center whitespace-nowrap rounded-full
                         border border-black/10 bg-sand px-3 h-8 text-sm
                         text-ink hover:bg-sand/80 active:scale-[0.98] transition"
            >
              + More
            </Link>
          </div>
        </nav>
      </section>
    );
  }

  /* ---------- DEFAULT VARIANT (your original cards) ---------- */
  return (
    <section className="py-5">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>

      {empty && (
        <div className="text-sm text-neutral-700 mb-3">
          No categories visible.
          {debug ? <div className="mt-1 opacity-70">Debug: {debug}</div> : null}
        </div>
      )}

      <div ref={emblaRef} className="overflow-visible">
        <div className="flex gap-3">
          {groups.map((group, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 shrink-0 w-[150px] sm:w-[180px]"
            >
              {group.map((c) => (
                <Card key={c.id} {...c} />
              ))}
            </div>
          ))}

          {loading &&
            Array.from({ length: Math.ceil((limit || 0) / rows) }).map(
              (_, i) => (
                <div
                  key={`sk-${i}`}
                  className="flex flex-col gap-3 shrink-0 w-[150px] sm:w-[180px]"
                >
                  {Array.from({ length: rows }).map((__, j) => (
                    <Card key={`skc-${i}-${j}`} loading />
                  ))}
                </div>
              )
            )}
        </div>
      </div>
    </section>
  );
}

function Card({
  name,
  href,
  image,
  loading,
}: Partial<CategoryCard> & { loading?: boolean }) {
  const initials = getInitials(name ?? "Category");

  const visual = loading ? (
    <div className="h-full w-full animate-pulse bg-neutral-200" />
  ) : image ? (
    <img
      src={image}
      alt={name ?? "Category"}
      className="h-full w-full object-cover"
      loading="lazy"
    />
  ) : (
    <div className="h-full w-full bg-gradient-to-br from-sand to-paper flex items-center justify-center">
      <span className="text-[14px] font-semibold text-ink/80">{initials}</span>
    </div>
  );

  const content = (
    <div
      className={clsx(
        "group rounded-md border bg-white overflow-hidden",
        "transition-transform hover:-translate-y-0.5 hover:shadow-md",
        "h-[60px] sm:h-[60px]",
        loading && "pointer-events-none"
      )}
    >
      <div className="grid grid-cols-6 h-full">
        <div className="col-span-2 relative">
          <div className="absolute inset-0">{visual}</div>
        </div>
        <div className="col-span-4 flex items-center px-2">
          <div
            className={clsx(
              "text-[13px] font-medium leading-tight text-ink line-clamp-2",
              loading && "h-4 w-3/4 rounded-md bg-neutral-200 animate-pulse"
            )}
          >
            {!loading && (name ?? "Category")}
          </div>
        </div>
      </div>
    </div>
  );

  return loading ? (
    <div aria-hidden>{content}</div>
  ) : (
    <Link href={href ?? "#"} aria-disabled={!href}>
      {content}
    </Link>
  );
}

/* ================= helpers ================= */

function mapCats(rows: any[], lang: "en" | "fr" | "ar"): CategoryCard[] {
  return (rows || []).map((c) => ({
    id: c.id,
    name:
      (lang === "ar" && (c.name_ar || c.name_en)) ||
      (lang === "fr" && (c.name_fr || c.name_en)) ||
      c.name_en ||
      c.slug ||
      c.path ||
      "Category",
    href: `/c/${encodeURIComponent(c.path || c.slug || c.id)}`,
    image: c.image_url ?? null,
  }));
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

function getInitials(label: string) {
  const words = label.trim().split(/\s+/);
  const a = words[0]?.[0] ?? "";
  const b = words[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}
