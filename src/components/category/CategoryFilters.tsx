"use client";

export type CategoryFilterState = {
  q?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  onlyPromo?: boolean;
  freeShipping?: boolean;
  sort?: "newest" | "price-asc" | "price-desc" | "top-rated" | "most-ordered";
};

export function stateFromSearchParams(
  sp: URLSearchParams | null
): CategoryFilterState {
  const q = sp?.get("q") || undefined;
  const minPrice = sp?.get("min") ? Number(sp.get("min")) : null;
  const maxPrice = sp?.get("max") ? Number(sp.get("max")) : null;
  const onlyPromo = sp?.get("promo") === "1";
  const freeShipping = sp?.get("fs") === "1";
  const sort = (sp?.get("sort") as CategoryFilterState["sort"]) || "newest";

  return { q, minPrice, maxPrice, onlyPromo, freeShipping, sort };
}

export function stateToSearchParams(state: CategoryFilterState) {
  const qs = new URLSearchParams();
  if (state.q) qs.set("q", state.q);
  if (state.minPrice != null) qs.set("min", String(state.minPrice));
  if (state.maxPrice != null) qs.set("max", String(state.maxPrice));
  if (state.onlyPromo) qs.set("promo", "1");
  if (state.freeShipping) qs.set("fs", "1");
  if (state.sort && state.sort !== "newest") qs.set("sort", state.sort);
  return qs;
}

export default function CategoryFilters({
  value,
  onChange,
}: {
  value: CategoryFilterState;
  onChange: (next: CategoryFilterState) => void;
}) {
  const local = value;

  function update<K extends keyof CategoryFilterState>(
    k: K,
    v: CategoryFilterState[K]
  ) {
    onChange({ ...local, [k]: v });
  }

  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center">
      {/* Search */}
      <input
        type="search"
        placeholder="Search in category…"
        defaultValue={local.q ?? ""}
        onBlur={(e) => update("q", e.currentTarget.value || undefined)}
        className="col-span-2 sm:col-span-1 px-3 py-2 rounded-xl border border-sand bg-white/70 outline-none"
      />

      {/* Price min */}
      <input
        type="number"
        min={0}
        placeholder="Min MAD"
        defaultValue={local.minPrice ?? ""}
        onBlur={(e) =>
          update(
            "minPrice",
            e.currentTarget.value ? Number(e.currentTarget.value) : null
          )
        }
        className="px-3 py-2 rounded-xl border border-sand bg-white/70 outline-none"
      />

      {/* Price max */}
      <input
        type="number"
        min={0}
        placeholder="Max MAD"
        defaultValue={local.maxPrice ?? ""}
        onBlur={(e) =>
          update(
            "maxPrice",
            e.currentTarget.value ? Number(e.currentTarget.value) : null
          )
        }
        className="px-3 py-2 rounded-xl border border-sand bg-white/70 outline-none"
      />

      {/* Promo only */}
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sand bg-white/70 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={!!local.onlyPromo}
          onChange={(e) => update("onlyPromo", e.currentTarget.checked)}
        />
        <span>Promo</span>
      </label>

      {/* Free shipping */}
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-sand bg-white/70 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={!!local.freeShipping}
          onChange={(e) => update("freeShipping", e.currentTarget.checked)}
        />
        <span>Free shipping</span>
      </label>

      {/* Sort */}
      <select
        defaultValue={local.sort ?? "newest"}
        onChange={(e) => update("sort", e.currentTarget.value as any)}
        className="px-3 py-2 rounded-xl border border-sand bg-white/70"
      >
        <option value="newest">Newest</option>
        <option value="price-asc">Price ↑</option>
        <option value="price-desc">Price ↓</option>
        <option value="top-rated">Top rated</option>
        <option value="most-ordered">Most ordered</option>
      </select>
    </div>
  );
}
