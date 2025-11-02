import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabaseClient";

export const IMG_LIMITS = {
  MAX_MB: 1.5, // target size per image (tweak)
  MAX_DIM: 2000, // max width/height (longest side)
  QUALITY: 0.85, // starting quality (library may iterate down)
};

export async function compressToWebp(file: File) {
  // Library returns a File/Blob. We’ll force output to webp.
  const compressed = await imageCompression(file, {
    maxSizeMB: IMG_LIMITS.MAX_MB,
    maxWidthOrHeight: IMG_LIMITS.MAX_DIM,
    initialQuality: IMG_LIMITS.QUALITY,
    useWebWorker: true,
    fileType: "image/webp", // force WEBP output
    maxIteration: 10, // try harder to reach size
    onProgress: () => {}, // hook from UI if you want a progress bar
  });

  // Extra hard gate (optional)
  if (compressed.size > IMG_LIMITS.MAX_MB * 1024 * 1024) {
    // As a last resort, you could re-run with smaller dimensions
    // or show an error:
    // throw new Error("Image is still too large after compression.");
  }

  return compressed;
}

export async function uploadCompressedToSupabase(
  file: File,
  userId: string,
  bucket = "products"
) {
  const webpBlob = await compressToWebp(file);
  const key = `u_${userId}/${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage.from(bucket).upload(key, webpBlob, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: true,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}
