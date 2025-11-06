"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type Mini = {
  id: string;
  title: string;
  price_mad: number;
  photo: string | null;
  at: number;
};

export default function RecentlyViewed() {
  const [items, setItems] = useState<Mini[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recently_viewed");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  if (!items.length) return null;

  return (
    <section className="px-4 pb-8">
      <h3 className="text-base font-semibold mb-2">Recently viewed</h3>
      <div className="grid grid-cols-2 gap-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/product/${p.id}`}
            className="block rounded-xl bg-sand border border-black/5 overflow-hidden "
          >
            <div className="aspect-square bg-white">
              {p.photo ? (
                <img
                  src={p.photo}
                  alt={p.title}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="p-2 ">
              <div className="text-sm line-clamp-2">{p.title}</div>
              <div className="text-xs text-ink/70 mt-1">MAD {p.price_mad}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
