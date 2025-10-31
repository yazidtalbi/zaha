// src/lib/cart.ts
import { supabase } from "@/lib/supabaseClient";

export type SelectedOptions =
  | Record<string, string>
  | Array<{ group: string; value: string; price_delta_mad?: number }>;

type AddToCartParams = {
  productId: string;
  qty?: number;
  options?: SelectedOptions | null;
  personalization?: string | null;
};

type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "other"; message?: string };

function looksLikeUUID(x: string) {
  return /^[0-9a-fA-F-]{10,}$/.test(x);
}

// Overloads for backward compatibility (still supported)
export async function addToCart(
  productId: string,
  qty?: number
): Promise<AddToCartResult>;
export async function addToCart(
  params: AddToCartParams
): Promise<AddToCartResult>;

// ...imports and types stay the same

export async function addToCart(a: string | AddToCartParams, b?: number) {
  const usingObject = typeof a === "object";
  const productId = usingObject ? a.productId : a;
  const qty = usingObject ? a.qty ?? 1 : b ?? 1;
  let options = usingObject ? a.options ?? null : null;
  let personalization = usingObject ? a.personalization ?? null : null;

  // auth etc... (unchanged)

  // normalize empty string -> null
  if (typeof personalization === "string") {
    personalization = personalization.trim() || null;
  }

  // sanitize options: remove undefined to keep JSON valid & stable
  if (options && !Array.isArray(options) && typeof options === "object") {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(options as Record<string, any>)) {
      if (v !== undefined && v !== null && String(v) !== "")
        cleaned[k] = String(v);
    }
    options = cleaned;
  }

  // ---- try RPC v2 first (unchanged) ----
  try {
    const rpcV2 = await supabase.rpc("add_to_cart_v2", {
      p_product_id: productId,
      p_qty: qty,
      p_options: options,
      p_personalization: personalization,
    });
    if (!rpcV2.error) return { ok: true } as const;
  } catch {}

  // ---- client-side merge with proper JSON filters ----
  let q = supabase
    .from("cart_items")
    .select("id, qty")
    .eq("user_id", (await supabase.auth.getUser()).data.user!.id)
    .eq("product_id", productId);

  // JSON equality must be stringified; null uses 'is'
  if (options === null) q = q.filter("options", "is", null);
  else q = q.filter("options", "eq", JSON.stringify(options));

  if (personalization === null) q = q.filter("personalization", "is", null);
  else q = q.filter("personalization", "eq", personalization);

  const { data: existingRows, error: findErr } = await q.limit(1);
  if (findErr)
    return { ok: false as const, reason: "other", message: findErr.message };

  if (existingRows && existingRows.length) {
    const row = existingRows[0] as { id: string; qty: number };
    const newQty = Number(row.qty ?? 0) + Number(qty ?? 0);
    const { error: upErr } = await supabase
      .from("cart_items")
      .update({ qty: newQty })
      .eq("id", row.id);
    if (upErr)
      return { ok: false as const, reason: "other", message: upErr.message };
    return { ok: true } as const;
  }

  // New row (JSON is sent as object; supabase will serialize correctly)
  const { error: insErr } = await supabase.from("cart_items").insert([
    {
      user_id: (await supabase.auth.getUser()).data.user!.id,
      product_id: productId,
      qty,
      options, // jsonb
      personalization, // text
    },
  ]);
  if (insErr)
    return { ok: false as const, reason: "other", message: insErr.message };

  return { ok: true } as const;
}
