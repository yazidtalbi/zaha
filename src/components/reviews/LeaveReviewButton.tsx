// components/reviews/LeaveReviewButton.tsx
"use client";

import { useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { v4 as uuidv4 } from "uuid";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";

type ReviewRow = {
  id: string;
  product_id: string;
  shop_id: string | null;
  order_id: string | null;
  author: string;
  rating: number | null;
  title: string | null;
  body: string | null;
  photos: string[] | null;
  created_at: string;
};

type Props = {
  productId: string;
  shopId?: string | null;
  orderId: string;
  authorId: string;
  onSuccess?: (row: ReviewRow) => void;
};

const MAX_IMAGES = 5;
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

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
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const filtered = selected.filter((f) => ACCEPT.includes(f.type));
    const next = [...files, ...filtered].slice(0, MAX_IMAGES);
    setFiles(next);
  }

  function removeFile(index: number) {
    setFiles((fs) => fs.filter((_, i) => i !== index));
  }

  const valid = useMemo(() => rating >= 1 && rating <= 5, [rating]);

  async function uploadAll(): Promise<string[]> {
    if (!files.length) return [];
    const urls: string[] = [];

    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const id = uuidv4();
      const path = `${authorId}/${productId}/${id}.${ext}`;
      const { error } = await supabase.storage.from("reviews").upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type,
      });
      if (error) throw error;

      const { data } = supabase.storage.from("reviews").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function doInsert(photos: string[]) {
    // actual DB insert
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
          photos, // 👈 store URLs
        },
      ])
      .select(
        "id, product_id, shop_id, order_id, author, rating, title, body, photos, created_at"
      )
      .single();

    if (error) {
      // unique_violation → fetch existing and treat as success
      if ((error as any).code === "23505") {
        const { data: existing } = await supabase
          .from("reviews")
          .select(
            "id, product_id, shop_id, order_id, author, rating, title, body, photos, created_at"
          )
          .eq("product_id", productId)
          .eq("author", authorId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existing) {
          onSuccess?.(existing as ReviewRow);
          toast.success("Your review is already posted.");
          setOpen(false);
          return;
        }
      }

      throw error;
    }

    if (data) {
      onSuccess?.(data as ReviewRow);
      toast.success("Thanks for your review!");
      setOpen(false);
    }
  }

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    try {
      // 1) upload images
      const photos = await uploadAll();
      // 2) insert row
      await doInsert(photos);
    } catch (e: any) {
      toast.error(e?.message || "Failed to post review");
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

            {/* Images */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Photos (optional)</label>
                <span className="text-xs text-ink/60">
                  {files.length}/{MAX_IMAGES}
                </span>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT.join(",")}
                multiple
                hidden
                onChange={onPickFiles}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => {
                  const url = URL.createObjectURL(f);
                  return (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-16 rounded object-cover border"
                      />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 bg-black/70 text-white rounded-full h-5 w-5 leading-[18px] text-[11px]"
                        onClick={() => removeFile(i)}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {files.length < MAX_IMAGES && (
                  <button
                    type="button"
                    className="h-16 w-16 rounded border grid place-items-center text-sm"
                    onClick={() => inputRef.current?.click()}
                  >
                    +
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-ink/60">
                JPEG/PNG/WebP, up to {MAX_IMAGES} images.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!valid || submitting}
            className="w-full"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </Button>
        </SheetContent>
      </Sheet>

      {/* Final confirmation: cannot edit after submit */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Post this review?</AlertDialogTitle>
            <AlertDialogDescription>
              Reviews can’t be edited after posting. You can ask support to
              remove a review if needed. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit} disabled={submitting}>
              Yes, post it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
