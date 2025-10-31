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
  /** "merge": (default) increase qty when identical line found
   *  "new": always create a new cart row */
  mode?: "merge" | "new";
};

type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "other"; message?: string };

function looksLikeUUID(x: string) {
  return /^[0-9a-fA-F-]{10,}$/.test(x);
}

// Backward compatible overloads
export async function addToCart(
  productId: string,
  qty?: number
): Promise<AddToCartResult>;
export async function addToCart(
  params: AddToCartParams
): Promise<AddToCartResult>;

export async function addToCart(
  a: string | AddToCartParams,
  b?: number
): Promise<AddToCartResult> {
  const usingObject = typeof a === "object";
  const productId = usingObject ? a.productId : a;
  const qty = usingObject ? a.qty ?? 1 : b ?? 1;
  let options = usingObject ? a.options ?? null : null;
  let personalization = usingObject ? a.personalization ?? null : null;
  const mode: "merge" | "new" = usingObject && a.mode ? a.mode : "merge";

  if (!productId || !looksLikeUUID(productId)) {
    return { ok: false, reason: "other", message: "Invalid productId." };
  }

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr) return { ok: false, reason: "other", message: authErr.message };
  const user = auth.user;
  if (!user) return { ok: false, reason: "auth" };

  // normalize
  if (typeof personalization === "string") {
    personalization = personalization.trim() || null;
  }
  if (options && !Array.isArray(options) && typeof options === "object") {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(options as Record<string, any>)) {
      if (v !== undefined && v !== null && String(v) !== "")
        cleaned[k] = String(v);
    }
    options = cleaned;
  }

  // Try RPC v2 (if you later add one that supports these fields)
  try {
    const rpcV2 = await supabase.rpc("add_to_cart_v2", {
      p_product_id: productId,
      p_qty: qty,
      p_options: options,
      p_personalization: personalization,
      p_mode: mode, // safe to ignore in SQL if not used
    });
    if (!rpcV2.error) return { ok: true };
  } catch {}

  // MERGE: find identical line and increase qty
  if (mode === "merge") {
    let q = supabase
      .from("cart_items")
      .select("id, qty", { count: "exact" })
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (options === null) q = q.filter("options", "is", null);
    else q = q.filter("options", "eq", JSON.stringify(options));

    if (personalization === null) q = q.filter("personalization", "is", null);
    else q = q.filter("personalization", "eq", personalization);

    const { data: existingRows, error: findErr } = await q.limit(1);
    if (findErr)
      return { ok: false, reason: "other", message: findErr.message };

    if (existingRows && existingRows.length) {
      const row = existingRows[0] as { id: string; qty: number };
      const newQty = Number(row.qty ?? 0) + Number(qty ?? 0);
      const { error: upErr } = await supabase
        .from("cart_items")
        .update({ qty: newQty })
        .eq("id", row.id);
      if (upErr) return { ok: false, reason: "other", message: upErr.message };
      return { ok: true };
    }
  }

  // NEW (or merge found nothing): insert a fresh row
  const { error: insErr } = await supabase.from("cart_items").insert([
    {
      user_id: user.id,
      product_id: productId,
      qty,
      options, // jsonb
      personalization, // text
    },
  ]);
  if (insErr) return { ok: false, reason: "other", message: insErr.message };
  return { ok: true };
}
