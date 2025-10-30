"use client";
import { useState } from "react";

const categories = [
  { label: "All", value: "" },
  { label: "Gifts", value: "gift" },
  { label: "Handmade", value: "handmade" },
  { label: "Personalized", value: "personalized" },
  { label: "Vintage", value: "vintage" },
  { label: "Home", value: "home" },
];

export default function CategoryPills({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 py-2">
      {categories.map((c) => (
        <button
          key={c.value}
          onClick={() => onSelect(c.value)}
          className={`flex-shrink-0 rounded-full border px-4 py-2 text-sm ${
            active === c.value
              ? "bg-terracotta text-white border-terracotta"
              : "bg-white hover:bg-neutral-50"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
