// components/home/HeroCategoriesStrip.tsx
"use client";

import Link from "next/link";

type HeroCategory = {
  id: string;
  label: string; // what you show under the icon (short)
  href: string;
  image?: string; // your render URL (optional for now)
};

const HERO_CATEGORIES: HeroCategory[] = [
  {
    id: "jewelry",
    label: "Jewelry",
    href: "/c/jewelry", // change to your real path
    image: "cat/jewelry.png", // put your final image URL here
  },
  {
    id: "art",
    label: "Art",
    href: "/c/art",
    image: "cat/art.png",
  },
  {
    id: "beauty",
    label: "Beauty",
    href: "/c/beauty",
    image: "cat/beauty.png",
  },
  {
    id: "clothing",
    label: "Clothing",
    href: "/c/clothing",
    image: "cat/clothing.png",
  },
  {
    id: "bags",
    label: "Bags",
    href: "/c/bags",
    image: "cat/bags.png",
  },
  {
    id: "home-living",
    label: "Home Living",
    href: "/c/home-living",
    image: "cat/home.png",
  },
  {
    id: "baby",
    label: "Baby",
    href: "/c/baby",
    image: "cat/baby.png",
  },
];

export default function HeroCategoriesStrip({
  moreHref = "/categories",
}: {
  moreHref?: string;
}) {
  return (
    <section className=" ">
      <div className="flex items-center overflow-x-auto no-scrollbar px-1 space-x-4 -ml-4 pl-4">
        {HERO_CATEGORIES.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            prefetch
            className="group block shrink-0 cursor-pointer"
          >
            <div className="flex w-[80px] flex-col items-center gap-4">
              {/* image container (bigger) */}
              <div
                className="
              flex h-[80px] w-[80px] items-center justify-center"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.label}
                    className="object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-neutral-300" />
                )}
              </div>

              <span className="text-sm font-semibold tracking-tight text-ink text-center">
                {item.label}
              </span>
            </div>
          </Link>
        ))}

        {/* See more */}
        <Link
          href={moreHref}
          prefetch
          className="block shrink-0 cursor-pointer"
        >
          <div className="flex w-[140spx] flex-col items-center gap-1">
            <button
              type="button"
              className="
            flex h-[140px] w-[140spx] items-center justify-center
           
        
          "
            >
              <span className="flex h-12 w-12 items-center text-xs justify-center rounded-full border border-neutral-300 text-base">
                More
              </span>
            </button>
            {/* <span className="text-sm font-medium text-neutral-700">
              See more
            </span> */}
          </div>
        </Link>
      </div>
    </section>
  );
}
