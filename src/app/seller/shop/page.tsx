"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Shop = {
  id: string;
  title: string;
  avatar_url: string | null;
  cover_urls: string[] | null; // <-- renamed
  owner: string;
};

export default function SellerShopSettings() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyCovers, setBusyCovers] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existing, error } = await supabase
        .from("shops")
        .select("*")
        .eq("owner", user.id)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      if (existing) {
        setShop(existing as any);
      } else {
        const { data } = await supabase
          .from("shops")
          .insert({ owner: user.id, title: "My shop" })
          .select("*")
          .maybeSingle();
        setShop((data as any) ?? null);
      }
    })();
  }, []);

  async function uploadToBucket(file: File, keyPrefix: string) {
    const ext = file.name.split(".").pop() || "jpg";
    const key = `${keyPrefix}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("shops")
      .upload(key, file, { upsert: true, cacheControl: "3600" });
    if (error) throw error;
    const { data } = supabase.storage.from("shops").getPublicUrl(key);
    return data.publicUrl;
  }

  async function changeAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !shop) return;
    try {
      setBusyAvatar(true);
      const url = await uploadToBucket(file, `avatars/${shop.id}`);
      const { data, error } = await supabase
        .from("shops")
        .update({ avatar_url: url })
        .eq("id", shop.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      setShop(data as any);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyAvatar(false);
      e.currentTarget.value = "";
    }
  }

  async function addCovers(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !shop) return;
    try {
      setBusyCovers(true);
      const urls: string[] = [];
      for (const f of files)
        urls.push(await uploadToBucket(f, `covers/${shop.id}`));

      const next = [...(shop.cover_urls ?? []), ...urls]; // <-- cover_urls
      const { data, error } = await supabase
        .from("shops")
        .update({ cover_urls: next }) // <-- cover_urls
        .eq("id", shop.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      setShop(data as any);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusyCovers(false);
      e.currentTarget.value = "";
    }
  }

  async function removeCover(idx: number) {
    if (!shop) return;
    const next = (shop.cover_urls ?? []).filter((_, i) => i !== idx); // <-- cover_urls
    const { data, error } = await supabase
      .from("shops")
      .update({ cover_urls: next }) // <-- cover_urls
      .eq("id", shop.id)
      .select("*")
      .maybeSingle();
    if (error) return alert(error.message);
    setShop(data as any);
  }

  async function saveTitle(newTitle: string) {
    if (!shop) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("shops")
      .update({ title: newTitle })
      .eq("id", shop.id)
      .select("*")
      .maybeSingle();
    setSaving(false);
    if (error) return alert(error.message);
    setShop(data as any);
  }

  if (!shop) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-6">
      <h1 className="text-xl font-semibold">Shop Settings</h1>

      <section className="rounded-2xl border bg-sand p-4 space-y-3">
        <div className="font-medium">Main image (Avatar)</div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border">
            {shop.avatar_url ? (
              <img
                src={shop.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-xs text-ink/50">
                No image
              </div>
            )}
          </div>
          <label className="rounded-xl border px-3 py-2 cursor-pointer bg-paper hover:bg-white">
            {busyAvatar ? "Uploading…" : "Change avatar"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={changeAvatar}
              disabled={busyAvatar}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border bg-sand p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Wall / Cover images</div>
          <label className="rounded-xl border px-3 py-2 cursor-pointer bg-paper hover:bg-white">
            {busyCovers ? "Uploading…" : "Add cover(s)"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={addCovers}
              disabled={busyCovers}
            />
          </label>
        </div>

        {!shop.cover_urls?.length ? (
          <div className="text-sm text-ink/70">No covers yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {shop.cover_urls!.map((src, i) => (
              <div
                key={src + i}
                className="relative rounded-xl overflow-hidden"
              >
                <img src={src} alt="" className="w-full h-24 object-cover" />
                <button
                  onClick={() => removeCover(i)}
                  className="absolute top-1 right-1 text-xs px-2 py-1 rounded bg-black/60 text-white"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-sand p-4 space-y-2">
        <div className="font-medium">Shop name</div>
        <ShopTitleInline
          value={shop.title}
          onSave={saveTitle}
          saving={saving}
        />
      </section>
    </main>
  );
}

function ShopTitleInline({
  value,
  onSave,
  saving,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  saving: boolean;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <div className="flex items-center gap-2">
      <input
        className="w-full rounded-xl border px-3 py-2 bg-paper"
        value={v}
        onChange={(e) => setV(e.target.value)}
      />
      <button
        onClick={() => onSave(v)}
        disabled={saving}
        className="rounded-xl px-3 py-2 bg-terracotta text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
