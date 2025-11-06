// app/seller/shop/settings/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { toast } from "sonner";

// ————————————————————————————————————————
// shadcn/ui
// ————————————————————————————————————————
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ————————————————————————————————————————
// icons
// ————————————————————————————————————————
import {
  Upload,
  Loader2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Star,
  Check,
  ImagePlus,
  RefreshCw,
} from "lucide-react";

type Shop = {
  id: string;
  title: string;
  avatar_url: string | null;
  cover_urls: string[] | null;
  owner: string;
  // Optional: if you add this column later, the UI will use it;
  // otherwise it gracefully falls back to index 0.
  cover_primary_idx?: number | null;
};

export default function SellerShopSettings() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);

  const [savingTitle, setSavingTitle] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyCovers, setBusyCovers] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);

  // ————————————————————————————————————————
  // bootstrap
  // ————————————————————————————————————————
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: existing, error } = await supabase
          .from("shops")
          .select("*")
          .eq("owner", user.id)
          .maybeSingle();

        if (error) throw error;

        if (existing) {
          setShop(existing as any);
        } else {
          const { data, error: insertErr } = await supabase
            .from("shops")
            .insert({ owner: user.id, title: "My shop" })
            .select("*")
            .maybeSingle();
          if (insertErr) throw insertErr;
          setShop((data as any) ?? null);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to load shop");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ————————————————————————————————————————
  // utils
  // ————————————————————————————————————————
  const fileToCanvasCompressed = async (
    file: File,
    opts: { maxW: number; maxH: number; quality?: number; mime?: string }
  ) => {
    const { maxW, maxH, quality = 0.85, mime = "image/webp" } = opts;
    const img = document.createElement("img");
    const reader = new FileReader();
    const load = new Promise<HTMLImageElement>((res, rej) => {
      reader.onload = () => {
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = reader.result as string;
      };
      reader.onerror = rej;
    });
    reader.readAsDataURL(file);
    const loaded = await load;

    const { width, height } = loaded;
    const scale = Math.min(maxW / width, maxH / height, 1);
    const cw = Math.max(1, Math.floor(width * scale));
    const ch = Math.max(1, Math.floor(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(loaded, 0, 0, cw, ch);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, quality)
    );
    if (!blob) throw new Error("Compression failed");
    return new File([blob], file.name.replace(/\.\w+$/, ".webp"), {
      type: mime,
    });
  };

  const uploadToBucket = async (file: File, keyPrefix: string) => {
    const ext = (file.name.split(".").pop() || "webp").toLowerCase();
    const key = `${keyPrefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("shops")
      .upload(key, file, { upsert: true, cacheControl: "3600" });
    if (error) throw error;
    const { data } = supabase.storage.from("shops").getPublicUrl(key);
    return { publicUrl: data.publicUrl, key };
  };

  // Given a public URL, try to infer the storage key (so we can delete).
  // This assumes standard Supabase public URL pattern.
  const inferStorageKeyFromPublicUrl = (url: string) => {
    const match = url.match(/storage\/v1\/object\/public\/shops\/(.+)$/);
    return match?.[1] ?? null;
  };

  // ————————————————————————————————————————
  // avatar
  // ————————————————————————————————————————
  const onChangeAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file || !shop) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image");
      return;
    }
    try {
      setBusyAvatar(true);
      // compress to ~320px for avatars
      const compact = await fileToCanvasCompressed(file, {
        maxW: 320,
        maxH: 320,
      });
      const { publicUrl } = await uploadToBucket(compact, `avatars/${shop.id}`);

      const { data, error } = await supabase
        .from("shops")
        .update({ avatar_url: publicUrl })
        .eq("id", shop.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;

      setShop(data as any);
      toast.success("Avatar updated");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update avatar");
    } finally {
      setBusyAvatar(false);
    }
  };

  // ————————————————————————————————————————
  // covers
  // ————————————————————————————————————————
  const onAddCovers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.currentTarget.value = "";
    if (!files.length || !shop) return;

    try {
      setBusyCovers(true);
      const uploads: string[] = [];
      for (const f of files) {
        if (!f.type.startsWith("image/")) continue;
        // compress to ~1600x1000 for banners
        const compressed = await fileToCanvasCompressed(f, {
          maxW: 1600,
          maxH: 1000,
        });
        const { publicUrl } = await uploadToBucket(
          compressed,
          `covers/${shop.id}`
        );
        uploads.push(publicUrl);
      }

      const next = [...(shop.cover_urls ?? []), ...uploads];
      const { data, error } = await supabase
        .from("shops")
        .update({ cover_urls: next })
        .eq("id", shop.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;

      setShop(data as any);
      toast.success(
        `${uploads.length} cover${uploads.length > 1 ? "s" : ""} added`
      );
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to upload covers");
    } finally {
      setBusyCovers(false);
    }
  };

  const setPrimaryCover = async (index: number) => {
    if (!shop || !shop.cover_urls?.length) return;
    try {
      setReordering("primary");
      // Prefer cover_primary_idx column if present; otherwise reorder array.
      if ("cover_primary_idx" in shop) {
        const { data, error } = await supabase
          .from("shops")
          .update({ cover_primary_idx: index })
          .eq("id", shop.id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        setShop(data as any);
      } else {
        // Fallback: move selected cover to front of array
        const arr = [...shop.cover_urls!];
        const [picked] = arr.splice(index, 1);
        arr.unshift(picked);
        const { data, error } = await supabase
          .from("shops")
          .update({ cover_urls: arr })
          .eq("id", shop.id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        setShop(data as any);
      }
      toast.success("Primary cover set");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to set primary cover");
    } finally {
      setReordering(null);
    }
  };

  const moveCover = async (index: number, dir: "up" | "down") => {
    if (!shop || !shop.cover_urls?.length) return;
    const arr = [...shop.cover_urls!];
    const nextIndex = dir === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= arr.length) return;
    [arr[index], arr[nextIndex]] = [arr[nextIndex], arr[index]];
    try {
      setReordering(`${index}-${dir}`);
      const { data, error } = await supabase
        .from("shops")
        .update({ cover_urls: arr })
        .eq("id", shop.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      setShop(data as any);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to reorder");
    } finally {
      setReordering(null);
    }
  };

  const removeCover = async (idx: number) => {
    if (!shop || !shop.cover_urls?.length) return;

    const targetUrl = shop.cover_urls[idx];
    const key = inferStorageKeyFromPublicUrl(targetUrl);

    // Optimistic UI
    const nextArr = shop.cover_urls.filter((_, i) => i !== idx);
    setShop((s) => (s ? { ...s, cover_urls: nextArr } : s));

    try {
      // Delete from storage if we could infer the key
      if (key) {
        const { error: delErr } = await supabase.storage
          .from("shops")
          .remove([key]);
        if (delErr) {
          // not fatal, but log it
          console.warn("Storage delete failed:", delErr.message);
        }
      }

      // Persist DB
      const { data, error } = await supabase
        .from("shops")
        .update({ cover_urls: nextArr })
        .eq("id", shop.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      setShop(data as any);
      toast.success("Cover removed");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to remove cover");
      // rollback UI if needed
      setShop((s) =>
        s ? { ...s, cover_urls: [...(shop.cover_urls ?? [])] } : s
      );
    }
  };

  // ————————————————————————————————————————
  // title (debounced autosave)
  // ————————————————————————————————————————
  const [titleDraft, setTitleDraft] = useState("");
  useEffect(() => {
    setTitleDraft(shop?.title ?? "");
  }, [shop?.title]);

  useEffect(() => {
    if (!shop) return;
    if (titleDraft.trim() === shop.title) return;
    if (titleDraft.trim().length === 0) return; // ignore empty
    const t = setTimeout(async () => {
      try {
        setSavingTitle(true);
        const { data, error } = await supabase
          .from("shops")
          .update({ title: titleDraft.trim() })
          .eq("id", shop.id)
          .select("*")
          .maybeSingle();
        if (error) throw error;
        setShop(data as any);
        toast.success("Shop name saved");
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Failed to save name");
      } finally {
        setSavingTitle(false);
      }
    }, 600); // debounce
    return () => clearTimeout(t);
  }, [titleDraft, shop]);

  // ————————————————————————————————————————
  // render
  // ————————————————————————————————————————
  if (loading) {
    return (
      <main className="p-4 space-y-6">
        <Skeleton className="h-6 w-44" />
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-4">
            <Skeleton className="h-20 w-20 rounded-2xl shadow-none" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-3 gap-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl shadow-none">
          <CardContent className="p-4">
            <Skeleton className="h-10 w-full rounded-xl" />
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!shop) {
    return (
      <main className="p-4">
        <p className="text-sm text-ink/70">No shop found.</p>
      </main>
    );
  }

  const covers = shop.cover_urls ?? [];
  const primaryIdx =
    (shop as any).cover_primary_idx != null
      ? (shop as any).cover_primary_idx
      : 0;

  return (
    <TooltipProvider delayDuration={200}>
      <main className="p-4 space-y-6">
        <div className="mb-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Shop Settings
          </h1>
          <p className="text-xs text-ink/60">
            Update your avatar, cover wall, and shop name.
          </p>
        </div>

        {/* Avatar */}
        <Card className="rounded-2xl shadow-none border bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Main image (Avatar)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl shadow-none overflow-hidden bg-white ring-1 ring-black/5 shrink-0">
                {shop.avatar_url ? (
                  <img
                    src={shop.avatar_url!}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-ink/50">
                    No image
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="avatar-input"
                  className="inline-flex items-center gap-2 rounded-xl border bg-paper hover:bg-white px-3 py-2 cursor-pointer"
                >
                  {busyAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Change avatar
                    </>
                  )}
                </Label>
                <input
                  id="avatar-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onChangeAvatar}
                  disabled={busyAvatar}
                />

                {shop.avatar_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl"
                    onClick={async () => {
                      try {
                        setBusyAvatar(true);
                        const key = inferStorageKeyFromPublicUrl(
                          shop.avatar_url!
                        );
                        if (key) {
                          await supabase.storage.from("shops").remove([key]);
                        }
                        const { data, error } = await supabase
                          .from("shops")
                          .update({ avatar_url: null })
                          .eq("id", shop.id)
                          .select("*")
                          .maybeSingle();
                        if (error) throw error;
                        setShop(data as any);
                        toast.success("Avatar removed");
                      } catch (err: any) {
                        toast.error(err.message || "Failed to remove avatar");
                      } finally {
                        setBusyAvatar(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Remove avatar</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Covers */}
        <Card className="rounded-2xl shadow-none border bg-white">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Wall / Cover images</CardTitle>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="covers-input"
                  className="inline-flex items-center gap-2 rounded-xl border bg-paper hover:bg-white px-3 py-2 cursor-pointer"
                >
                  {busyCovers ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" />
                      Add cover(s)
                    </>
                  )}
                </Label>
                <input
                  id="covers-input"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onAddCovers}
                  disabled={busyCovers}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-2">
            {!covers.length ? (
              <p className="text-sm text-ink/70">No covers yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {covers.map((src, i) => {
                  const isPrimary =
                    ("cover_primary_idx" in shop &&
                      shop.cover_primary_idx === i) ||
                    (!("cover_primary_idx" in shop) && i === 0);

                  const busy =
                    reordering === `${i}-up` ||
                    reordering === `${i}-down` ||
                    (reordering === "primary" && isPrimary);

                  return (
                    <div
                      key={src + i}
                      className="group relative rounded-xl overflow-hidden ring-1 ring-black/5 bg-white"
                    >
                      <img
                        src={src}
                        alt={`Cover ${i + 1}`}
                        width={640}
                        height={400}
                        className="w-full h-28 sm:h-32 object-cover"
                      />

                      <div className="absolute inset-x-1 top-1 flex items-center justify-between gap-1">
                        <div className="inline-flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-7 w-7 rounded-lg"
                                disabled={i === 0 || !!reordering}
                                onClick={() => moveCover(i, "up")}
                                aria-label="Move up"
                              >
                                {busy && reordering?.includes("up") ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowUp className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move up</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-7 w-7 rounded-lg"
                                disabled={
                                  i === covers.length - 1 || !!reordering
                                }
                                onClick={() => moveCover(i, "down")}
                                aria-label="Move down"
                              >
                                {busy && reordering?.includes("down") ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move down</TooltipContent>
                          </Tooltip>
                        </div>

                        <div className="inline-flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant={isPrimary ? "default" : "secondary"}
                                className="h-7 w-7 rounded-lg"
                                disabled={isPrimary || !!reordering}
                                onClick={() => setPrimaryCover(i)}
                                aria-label="Set primary"
                              >
                                {isPrimary ? (
                                  <Star className="h-4 w-4 fill-current" />
                                ) : reordering === "primary" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Star className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isPrimary ? "Primary cover" : "Set as primary"}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-7 w-7 rounded-lg"
                                onClick={() => removeCover(i)}
                                aria-label="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shop name */}
        <Card className="rounded-2xl shadow-none border bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Shop name</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="rounded-xl bg-paper"
                maxLength={80}
                aria-label="Shop name"
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl"
                disabled
                title="Autosaves"
              >
                {savingTitle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Saved
                  </>
                )}
              </Button>
            </div>
            <p className="mt-1 text-xs text-ink/60">
              Tip: keep it short, clear, and memorable (max 80 chars).
            </p>
          </CardContent>
        </Card>

        {/* Live header preview (lightweight) */}
        <Card className="rounded-2xl shadow-none border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Quick preview</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="rounded-xl border overflow-hidden">
              <div className="relative h-28 sm:h-40 bg-neutral-100">
                {covers[primaryIdx] ? (
                  <img
                    src={covers[primaryIdx]}
                    alt="Primary cover"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex items-center gap-3 p-3">
                <Avatar className="h-12 w-12 ring-1 ring-black/5">
                  {shop.avatar_url ? (
                    <AvatarImage src={shop.avatar_url} alt={shop.title} />
                  ) : (
                    <AvatarFallback>
                      {shop.title?.slice(0, 2)?.toUpperCase() || "S"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{shop.title}</div>
                  <div className="text-xs text-ink/60 truncate">
                    This is how your header looks on your shop page.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </TooltipProvider>
  );
}
