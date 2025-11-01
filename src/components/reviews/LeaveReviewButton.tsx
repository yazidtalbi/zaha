"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function LeaveReviewButton({
  productId,
  shopId,
  orderId,
}: {
  productId: string;
  shopId: string;
  orderId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return toast("Please sign in.");

    // Ensure a profiles row exists (FK -> profiles.id)
    await supabase
      .from("profiles")
      .upsert({ id: user.id }, { onConflict: "id" });

    if (!body.trim()) return toast("Please write something.");
    setLoading(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      shop_id: shopId,
      order_id: orderId ?? null,
      author: user.id,
      rating,
      body,
      is_public: true,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to post review", { description: error.message });
    } else {
      toast.success("Review posted!");
      setOpen(false);
      setBody("");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full">
        Leave a review
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Rating</Label>
              <Select
                defaultValue="5"
                onValueChange={(v) => setRating(Number(v))}
              >
                <SelectTrigger className="mt-1 w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} stars
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Your review</Label>
              <Textarea
                rows={5}
                placeholder="Describe your experience…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <Button
              onClick={submit}
              disabled={loading || !body.trim()}
              className="w-full"
            >
              {loading ? "Submitting..." : "Submit review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
