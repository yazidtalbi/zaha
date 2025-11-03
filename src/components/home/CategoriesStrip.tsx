"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { supabase } from "@/lib/supabaseClient";

type CategoryCard = {
  id: string;
  name: string;
  image: string;
  href: string;
};

function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

// ——— Popular fallbacks (always has plenty so we can pad to the limit) ———
const POPULAR_FALLBACKS: CategoryCard[] = [
  {
    id: "fb-home",
    name: "Home & Living",
    image:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=home",
  },
  {
    id: "fb-jewelry",
    name: "Jewelry",
    image:
      "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=jewelry",
  },
  {
    id: "fb-clothing",
    name: "Clothing",
    image:
      "https://images.unsplash.com/photo-1520975922203-b2635ad3efeb?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=clothing",
  },
  {
    id: "fb-crafts",
    name: "Craft Supplies & Tools",
    image:
      "https://images.unsplash.com/photo-1491485880348-85d48a9e5313?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=crafts",
  },
  {
    id: "fb-toys",
    name: "Toys & Games",
    image:
      "https://images.unsplash.com/photo-1511452885600-a3d2c9148a31?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=toys",
  },
  {
    id: "fb-art",
    name: "Art & Collectibles",
    image:
      "https://images.unsplash.com/photo-1520697222861-e53a11a8f5cd?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=art",
  },
  {
    id: "fb-wedding",
    name: "Weddings",
    image:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=weddings",
  },
  {
    id: "fb-electronics",
    name: "Electronics",
    image:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=electronics",
  },
  {
    id: "fb-books",
    name: "Books & Zines",
    image:
      "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=books",
  },
  {
    id: "fb-beauty",
    name: "Beauty & Personal Care",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=beauty",
  },
  {
    id: "fb-bags",
    name: "Bags & Purses",
    image:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=bags",
  },
  {
    id: "fb-shoes",
    name: "Shoes",
    image:
      "https://images.unsplash.com/photo-1514986888952-8cd320577b68?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=shoes",
  },
  {
    id: "fb-pets",
    name: "Pet Supplies",
    image:
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=pets",
  },
  {
    id: "fb-baby",
    name: "Baby & Kids",
    image:
      "https://images.unsplash.com/photo-1541534401786-2077eed87a72?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=baby",
  },
  {
    id: "fb-vintage",
    name: "Vintage",
    image:
      "https://images.unsplash.com/photo-1496317899792-9d7dbcd928a1?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=vintage",
  },
  {
    id: "fb-rugs",
    name: "Rugs",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=rugs",
  },
  {
    id: "fb-lighting",
    name: "Lighting",
    image:
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=lighting",
  },
  {
    id: "fb-furniture",
    name: "Furniture",
    image:
      "https://images.unsplash.com/photo-1519710164239-da123dc03ef4?q=80&w=1200&auto=format&fit=crop",
    href: "/search?category=furniture",
  },
];

export default function CategoriesStrip({
  initial,
  title = "Shop by category",
  limit = 24,
  rows = 3,
}: {
  initial?: CategoryCard[];
  title?: string;
  limit?: number;
  rows?: number;
}) {
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    containScroll: "trimSnaps",
  });
  const [items, setItems] = useState<CategoryCard[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial) return;
    (async () => {
      setLoading(true);

      // 1) Top-level with images
      const top = await supabase
        .from("categories")
        .select("id, name_en, image_url, path, parent_id")
        .is("parent_id", null)
        .not("image_url", "is", null)
        .order("name_en", { ascending: true })
        .limit(limit);

      const topMapped = mapCats(top.data || []);

      // 2) If not enough, also pull child categories with images
      let need = Math.max(0, limit - topMapped.length);
      let childrenMapped: CategoryCard[] = [];
      if (need > 0) {
        const children = await supabase
          .from("categories")
          .select("id, name_en, image_url, path, parent_id")
          .not("parent_id", "is", null)
          .not("image_url", "is", null)
          .order("name_en", { ascending: true })
          .limit(need * 2); // ask for a bit more; we’ll slice later
        childrenMapped = dedupeById(
          mapCats(children.data || []),
          new Set(topMapped.map((x) => x.id))
        );
      }

      // 3) Pad with curated fallbacks if still short
      const merged = [...topMapped, ...childrenMapped].slice(0, limit);
      need = Math.max(0, limit - merged.length);
      const padded =
        need > 0
          ? [
              ...merged,
              ...dedupeById(
                POPULAR_FALLBACKS,
                new Set(merged.map((x) => x.id))
              ).slice(0, need),
            ]
          : merged;

      setItems(padded);
      setLoading(false);
    })();
  }, [initial, limit]);

  const groups = chunk(items, rows);

  return (
    <section className="px-4 py-5">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>

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

          {/* Loading skeleton columns */}
          {loading &&
            Array.from({ length: Math.ceil(limit / rows) }).map((_, i) => (
              <div
                key={`sk-${i}`}
                className="flex flex-col gap-3 shrink-0 w-[180px] sm:w-[200px]"
              >
                {Array.from({ length: rows }).map((__, j) => (
                  <Card key={`skc-${i}-${j}`} loading />
                ))}
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}

function Card({
  name,
  image,
  href,
  loading,
}: Partial<CategoryCard> & { loading?: boolean }) {
  return (
    <Link
      href={href || "#"}
      aria-disabled={loading}
      tabIndex={loading ? -1 : 0}
      className={clsx(
        "group rounded-md border bg-white overflow-hidden",
        "transition-transform hover:-translate-y-0.5 hover:shadow-md",
        "h-[60px] sm:h-[60px]",
        loading && "pointer-events-none"
      )}
    >
      <div className="grid grid-cols-6 h-full">
        <div className="col-span-2 relative">
          <div className="absolute inset-0">
            {loading ? (
              <div className="h-full w-full animate-pulse bg-neutral-200" />
            ) : (
              <img
                src={image!}
                alt={name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
          </div>
        </div>
        <div className="col-span-4 flex items-center px-2">
          <div
            className={clsx(
              "text-[13px] font-medium leading-tight text-ink line-clamp-2",
              loading && "h-4 w-3/4 rounded-md bg-neutral-200 animate-pulse"
            )}
          >
            {!loading && name}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ——— helpers ———
function prettify(s: string) {
  return s
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapCats(rows: any[]): CategoryCard[] {
  return rows
    .filter((c) => !!c.image_url)
    .map((c) => ({
      id: c.id,
      name: prettify(c.name_en || c.path || "Category"),
      image: c.image_url,
      href: `/search?category=${encodeURIComponent(c.id)}`,
    }));
}

function dedupeById(list: CategoryCard[], seen: Set<string>) {
  const out: CategoryCard[] = [];
  for (const x of list) {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      out.push(x);
    }
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}
