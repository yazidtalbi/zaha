// lib/productSeed.ts
import { create } from "zustand";

/**
 * Slim snapshot of a product that we pass from card → product page.
 * Only the fields we actually need for instant hydrate.
 */
export type SlimProduct = {
  id: string;
  title: string;
  price_mad: number;

  compare_at_mad: number | null;
  promo_price_mad: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;

  photos: string[];

  rating_avg: number | null;
  reviews_count: number | null;
  orders_count: number | null;
  free_shipping: boolean | null;

  shop_owner: string | null;
  keywords: string | null;

  video_url: string | null;
  video_poster_url: string | null;

  // Availability + basic shop context
  unavailable: boolean | null;
  active: boolean | null;
  deleted_at: string | null;

  shop_id: string | null;
  shop_title: string | null;
  city: string | null;
};

type Store = {
  seeds: Record<string, SlimProduct>;
  setSeed: (id: string, data: SlimProduct) => void;
  popSeed: (id: string) => SlimProduct | undefined; // read once and delete
};

export const useProductSeed = create<Store>((set, get) => ({
  seeds: {},

  setSeed: (id, data) =>
    set((s) => ({
      seeds: {
        ...s.seeds,
        [id]: data,
      },
    })),

  popSeed: (id) => {
    const data = get().seeds[id];
    set((s) => {
      const { [id]: _removed, ...rest } = s.seeds;
      return { seeds: rest };
    });
    return data;
  },
}));
