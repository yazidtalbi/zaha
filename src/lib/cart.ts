// src/lib/cart.ts
import { supabase } from "@/lib/supabaseClient";

type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "auth" | "other"; message?: string };

export async function addToCart(
  productId: string,
  qty = 1
): Promise<AddToCartResult> {
  // Ensure signed-in
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) {
    return { ok: false, reason: "other", message: authErr.message };
  }
  if (!user) {
    return { ok: false, reason: "auth" };
  }

  // 1) Try RPC if it exists
  const rpc = await supabase.rpc("add_to_cart", {
    p_product_id: productId,
    p_qty: qty,
  });

  if (!rpc.error) {
    return { ok: true };
  }

  // If RPC isn't defined in your DB, fall back to upsert
  // NOTE: RLS must allow insert/update when user_id = auth.uid().
  const upsert = await supabase
    .from("cart_items")
    .upsert([{ user_id: user.id, product_id: productId, qty }], {
      onConflict: "user_id,product_id",
    });

  if (upsert.error) {
    return { ok: false, reason: "other", message: upsert.error.message };
  }

  return { ok: true };
}
