"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart";
import { toast } from "sonner";

export function AddToCartButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function handleAdd() {
    setBusy(true);
    const res = await addToCart(productId, 1);
    setBusy(false);

    if (res.ok) {
      toast.success("Added to cart 🛒");
      return;
    }

    if (res.reason === "auth") {
      toast("Please sign in to add items.");
      router.push("/account"); // or /login if you have one
      return;
    }

    toast.error("Failed to add to cart", { description: res.message });
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart:changed"));
  }

  return (
    <button
      onClick={handleAdd}
      disabled={busy || disabled}
      className="rounded-xl border px-4 py-2 text-sm bg-sand hover:bg-white disabled:opacity-60"
    >
      {busy ? "Adding…" : "Add to cart"}
    </button>
  );
}
