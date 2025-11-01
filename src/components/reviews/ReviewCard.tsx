"use client";
import { format } from "date-fns";
import { Stars } from "./Stars";

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[] | null;
  created_at: string;
  author?: string | null;
  author_profile?: {
    id: string;
    name: string | null;
    role?: string | null;
    phone?: string | null;
    city?: string | null;
  } | null;
};

export function ReviewCard({
  r,
  onClick,
}: {
  r: Review;
  onClick?: () => void;
}) {
  const name = r.author_profile?.name ?? "Verified buyer";
  return (
    <button
      onClick={onClick}
      className="text-left w-full rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow"
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(r.created_at), "MMM d, yyyy")}
        </div>
      </div>
      <div className="mt-2">
        <Stars value={r.rating} />
      </div>
      {r.title && <div className="mt-2 font-medium">{r.title}</div>}
      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
        {r.body}
      </p>
    </button>
  );
}
