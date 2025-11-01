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

      {/* Thumbnails strip (photos) */}
      {Array.isArray((r as any).photos) && (r as any).photos.length ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {(r as any).photos.slice(0, 4).map((src: string, i: number) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-10 w-10 rounded object-cover border"
            />
          ))}
          {(r as any).photos.length > 4 && (
            <div className="h-10 w-10 rounded border grid place-items-center text-xs text-ink/70">
              +{(r as any).photos.length - 4}
            </div>
          )}
        </div>
      ) : null}

      {r.title && <div className="mt-2 font-medium">{r.title}</div>}
      <p className="mt-1 text-sm text-muted-foreground line-clamp-3">
        {r.body}
      </p>
    </button>
  );
}
