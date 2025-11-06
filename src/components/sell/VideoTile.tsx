"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Trash2, Video as VideoIcon, Loader2 } from "lucide-react";

type Props = {
  productId: string;
  bucket?: string; // default "product_media"
  initialVideoUrl?: string | null;
  initialPosterUrl?: string | null;
  onChange?: (payload: {
    video_url: string | null;
    video_poster_url: string | null;
  }) => void;
};

const MAX_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_SECONDS = 15;

export default function VideoTile({
  productId,
  bucket = "product_media",
  initialVideoUrl,
  initialPosterUrl,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(
    initialVideoUrl ?? null
  );
  const [posterUrl, setPosterUrl] = useState<string | null>(
    initialPosterUrl ?? null
  );

  useEffect(() => {
    setVideoUrl(initialVideoUrl ?? null);
    setPosterUrl(initialPosterUrl ?? null);
  }, [initialVideoUrl, initialPosterUrl]);

  async function pick() {
    inputRef.current?.click();
  }

  async function handleSelect(file: File) {
    setError(null);

    if (!file.type.startsWith("video/")) {
      setError("Please choose a video.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Video too big. Max 20MB.");
      return;
    }

    // Validate duration (<= 15s) via a temporary <video>
    const blobUrl = URL.createObjectURL(file);
    const ok = await validateDuration(blobUrl, MAX_SECONDS).catch(() => false);
    if (!ok) {
      URL.revokeObjectURL(blobUrl);
      setError("Max 15 seconds.");
      return;
    }

    setBusy(true);
    try {
      // Pathing
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const base = `products/${productId}/video`;
      const videoPath = `${base}/original.${ext}`;
      const posterPath = `${base}/poster.jpg`;

      // Upload video
      const { error: up1 } = await supabase.storage
        .from(bucket)
        .upload(videoPath, file, { upsert: true, contentType: file.type });
      if (up1) throw up1;

      // Generate poster client-side (first frame)
      const posterBlob = await capturePoster(blobUrl);
      let posterPublicUrl: string | null = null;
      if (posterBlob) {
        const { error: up2 } = await supabase.storage
          .from(bucket)
          .upload(posterPath, posterBlob, {
            upsert: true,
            contentType: "image/jpeg",
          });
        if (up2) throw up2;
      }

      // Get public URLs (MVP)
      const { data: v } = supabase.storage.from(bucket).getPublicUrl(videoPath);
      const { data: p } = supabase.storage
        .from(bucket)
        .getPublicUrl(posterPath);

      const videoPublicUrl = v.publicUrl;
      posterPublicUrl = p.publicUrl;

      // Persist on product (MVP direct update)
      await supabase
        .from("products")
        .update({
          video_url: videoPublicUrl,
          video_poster_url: posterPublicUrl,
        })
        .eq("id", productId);

      setVideoUrl(videoPublicUrl);
      setPosterUrl(posterPublicUrl ?? null);
      onChange?.({
        video_url: videoPublicUrl,
        video_poster_url: posterPublicUrl ?? null,
      });
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      URL.revokeObjectURL(blobUrl);
    }
  }

  async function removeVideo() {
    if (!videoUrl && !posterUrl) return;
    setBusy(true);
    setError(null);
    try {
      // Clear DB
      await supabase
        .from("products")
        .update({ video_url: null, video_poster_url: null })
        .eq("id", productId);

      setVideoUrl(null);
      setPosterUrl(null);
      onChange?.({ video_url: null, video_poster_url: null });
      // (Optional) also delete files from storage if you want:
      // await supabase.storage.from(bucket).remove([`products/${productId}/video/original.mp4`, `products/${productId}/video/poster.jpg`]);
    } catch (e: any) {
      console.error(e);
      setError("Couldn’t remove video.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelect(f);
        }}
      />

      {videoUrl ? (
        <div className="group relative aspect-square overflow-hidden rounded-xl border bg-white">
          {/* Poster (fallback to video tag’s poster attr if you prefer) */}
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt="Video poster"
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <video
              src={videoUrl}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition" />

          {/* Play icon badge */}
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
            <VideoIcon className="h-3 w-3" />
            Video
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={removeVideo}
            disabled={busy}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 border hover:bg-white"
            aria-label="Remove video"
            title="Remove video"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="aspect-square w-full rounded-xl border-2 border-dashed grid place-items-center text-sm text-neutral-600 bg-white"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </span>
          ) : (
            <span className="inline-flex flex-col items-center gap-2">
              <VideoIcon className="h-5 w-5 opacity-70" />
              <span>Add video</span>
              <span className="text-[11px] text-neutral-500">≤15s • ≤20MB</span>
            </span>
          )}
        </button>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ---------- helpers ---------- */

function validateDuration(url: string, maxSeconds: number) {
  return new Promise<boolean>((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;
    v.onloadedmetadata = () => {
      // Safari iOS needs a small timeout sometimes
      const ok = (v.duration || 0) <= maxSeconds + 0.2;
      resolve(ok);
    };
    v.onerror = reject;
  });
}

async function capturePoster(url: string): Promise<Blob | null> {
  try {
    const v = document.createElement("video");
    v.src = url;
    v.crossOrigin = "anonymous";
    v.muted = true;
    v.preload = "auto";
    // Jump to ~0.3s to avoid black frames
    await v.play().catch(() => {});
    v.currentTime = 0.3;

    await new Promise<void>((res) => {
      v.onseeked = () => res();
      v.onloadeddata = () => res();
    });

    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), "image/jpeg", 0.82)
    );
    return blob;
  } catch {
    return null;
  }
}
