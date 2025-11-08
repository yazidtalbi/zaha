// lib/useProduct.ts
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabaseClient";

const key = (id?: string) => (id ? (["product", id] as const) : null);

export function primeProductCache(slim: any) {
  // seed without revalidation
  mutate(key(slim.id), slim, false);
}

export function useProduct(id?: string) {
  return useSWR(
    key(id),
    async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select(`*, shops:shop_id(id,title,avatar_url,owner,created_at,city)`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    {
      revalidateOnFocus: false,
      // if ProductCard primed it, we render instantly
    }
  );
}
