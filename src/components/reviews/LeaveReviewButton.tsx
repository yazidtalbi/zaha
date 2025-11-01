// components/reviews/LeaveReviewButton.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  productId: string;
  shopId?: string | null;
  orderId: string;
  authorId: string;
  onSuccess?: (review: {
    id: string;
    product_id: string;
    shop_id: string | null;
    order_id: string | null;
    author: string;
    rating: number | null;
    title: string | null;
    body: string | null;
    created_at: string;
  }) => void;
};

export default function LeaveReviewButton({
  productId,
  shopId,
  orderId,
  authorId,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      // Try insert and immediately return the new row
      const { data, error } = await supabase
        .from("reviews")
        .insert([
          {
            product_id: productId,
            shop_id: shopId ?? null,
            order_id: orderId,
            author: authorId,
            rating,
            title: null,
            body: text.trim() || null,
          },
        ])
        .select(
          "id, product_id, shop_id, order_id, author, rating, title, body, created_at"
        )
        .single();

      if (error) {
        // If duplicate (unique (product_id, author)), fetch existing and treat as success
        // Postgres unique_violation = 23505
        // Supabase JS error.code usually carries this
        if ((error as any).code === "23505") {
          const { data: existing } = await supabase
            .from("reviews")
            .select(
              "id, product_id, shop_id, order_id, author, rating, title, body, created_at"
            )
            .eq("product_id", productId)
            .eq("author", authorId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (existing) {
            onSuccess?.(existing);
            setOpen(false);
            toast.success("Your review is already posted.");
            return;
          }
        }

        toast.error("Failed to post review");
        return;
      }

      // Success: hand the row to parent so it can swap UI instantly
      if (data) {
        onSuccess?.(data);
        toast.success("Thanks for your review!");
        setOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        Leave a review
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Leave a review</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 py-4">
            <label className="block text-sm font-medium">Rating</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
            >
              <option value={5}>5 stars</option>
              <option value={4}>4 stars</option>
              <option value={3}>3 stars</option>
              <option value={2}>2 stars</option>
              <option value={1}>1 star</option>
            </select>

            <label className="block text-sm font-medium mt-3">
              Your review
            </label>
            <textarea
              className="w-full rounded-md border px-3 py-2 min-h-[120px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share details about the product and your experience…"
            />
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full">
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
