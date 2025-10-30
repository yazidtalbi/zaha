"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type NewProductInsert = {
  title: string;
  price_mad: number;
  city: string | null;
  active: boolean;
  photos: string[];
  shop_id: string; // 👈 REQUIRED for RLS
};

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<string>("");
  const [city, setCity] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const urls: string[] = [];

      for (const file of files) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
        const key = `u_${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("products")
          .upload(key, file, { cacheControl: "3600", upsert: true });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from("products").getPublicUrl(key);
        urls.push(data.publicUrl);
      }

      setPhotos((prev) => [...prev, ...urls]);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  /** Ensure the current user has a shop and return its id */
  async function getOrCreateMyShop(): Promise<string> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const { data: existing, error: selErr } = await supabase
      .from("shops")
      .select("id, owner")
      .eq("owner", user.id)
      .maybeSingle();

    if (selErr) throw selErr;
    if (existing?.id) return existing.id;

    const { data: created, error: insErr } = await supabase
      .from("shops")
      .insert({ owner: user.id, title: "My shop" })
      .select("id")
      .maybeSingle();

    if (insErr) throw insErr;
    return created!.id;
  }

  async function handleSave() {
    try {
      // Basic client validation
      const priceNumber = Number(price);
      if (!title.trim()) throw new Error("Title is required");
      if (!Number.isFinite(priceNumber) || priceNumber <= 0)
        throw new Error("Enter a valid price");
      if (!photos.length) throw new Error("Add at least one photo");

      setSaving(true);

      const shopId = await getOrCreateMyShop(); // 👈 owner-scoped

      const payload: NewProductInsert = {
        title: title.trim(),
        price_mad: Math.round(priceNumber),
        city: city.trim() || null,
        active: true,
        photos,
        shop_id: shopId, // 👈 REQUIRED
      };

      const { data, error } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      alert("Product created!");
      if (data?.id) router.push(`/product/${data.id}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Sell an item</h1>

      <label className="block">
        <div className="text-sm mb-1">Photos</div>
        <input type="file" accept="image/*" multiple onChange={handleSelect} />
        {uploading && <div className="text-sm mt-1">Uploading…</div>}
      </label>

      {!!photos.length && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={src} className="relative rounded-lg overflow-hidden">
              <img src={src} alt="" className="w-full h-28 object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 rounded bg-black/60 text-white text-xs px-2 py-1"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <div className="text-sm mb-1">Title</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="Handmade clay cup"
        />
      </label>

      <label className="block">
        <div className="text-sm mb-1">Price (MAD)</div>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded border px-3 py-2"
          inputMode="numeric"
        />
      </label>

      <label className="block">
        <div className="text-sm mb-1">City</div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="Tetouan"
        />
      </label>

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="w-full rounded-xl px-4 py-3 bg-terracotta text-white font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Publish"}
      </button>
    </main>
  );
}
