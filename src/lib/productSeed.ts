// lib/productSeed.ts
import { create } from "zustand";

type Store = {
  seeds: Record<string, any>;
  setSeed: (id: string, data: any) => void;
  popSeed: (id: string) => any; // read once and delete
};

export const useProductSeed = create<Store>((set, get) => ({
  seeds: {},
  setSeed: (id, data) => set((s) => ({ seeds: { ...s.seeds, [id]: data } })),

  popSeed: (id) => {
    const data = get().seeds[id];
    set((s) => {
      const { [id]: _, ...rest } = s.seeds;
      return { seeds: rest };
    });
    return data;
  },
}));
