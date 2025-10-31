// app/sell/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type NewProductInsert = {
  title: string;
  price_mad: number;
  city: string | null;
  active: boolean;
  photos: string[];
  shop_id: string;

  // promo
  promo_price_mad: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;

  // options
  options_config: OptionGroup[];

  // personalization 👇
  personalization_enabled: boolean;
  personalization_instructions: string | null;
  personalization_max_chars: number | null;
};

// we'll add shop_owner at insert time
type NewProductInsertWithOwner = NewProductInsert & { shop_owner: string };

function uid() {
  // compact UUID
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export default function SellPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<string>("");
  const [city, setCity] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Personalization
  const [persoEnabled, setPersoEnabled] = useState(false);
  const [persoInstr, setPersoInstr] = useState("");
  const [persoMax, setPersoMax] = useState<string>("");

  // Promo
  const [promoPrice, setPromoPrice] = useState<string>("");
  const [promoStart, setPromoStart] = useState<string>("");
  const [promoEnd, setPromoEnd] = useState<string>("");

  // Options Builder
  const [groups, setGroups] = useState<OptionGroup[]>([]);

  function addGroup() {
    setGroups((gs) => [
      ...gs,
      {
        id: uid(),
        name: "Size",
        required: true,
        values: [{ id: uid(), label: "S", price_delta_mad: 0 }],
      },
    ]);
  }
  function removeGroup(id: string) {
    setGroups((gs) => gs.filter((g) => g.id !== id));
  }
  function setGroupName(id: string, name: string) {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, name } : g)));
  }
  function toggleRequired(id: string) {
    setGroups((gs) =>
      gs.map((g) => (g.id === id ? { ...g, required: !g.required } : g))
    );
  }
  function addValue(groupId: string) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? {
              ...g,
              values: [
                ...g.values,
                { id: uid(), label: "New option", price_delta_mad: 0 },
              ],
            }
          : g
      )
    );
  }
  function removeValue(groupId: string, valueId: string) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, values: g.values.filter((v) => v.id !== valueId) }
          : g
      )
    );
  }
  function updateValue(
    groupId: string,
    valueId: string,
    patch: Partial<OptionValue>
  ) {
    setGroups((gs) =>
      gs.map((g) =>
        g.id === groupId
          ? {
              ...g,
              values: g.values.map((v) =>
                v.id === valueId ? { ...v, ...patch } : v
              ),
            }
          : g
      )
    );
  }

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

  function toISO(dtLocal: string): string | null {
    if (!dtLocal) return null;
    const ms = Date.parse(dtLocal.replace(" ", "T"));
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString();
  }

  async function handleSave() {
    try {
      const base = Number(price);
      if (!title.trim()) throw new Error("Title is required");
      if (!Number.isFinite(base) || base <= 0)
        throw new Error("Enter a valid price");
      if (!photos.length) throw new Error("Add at least one photo");

      // validate options
      for (const g of groups) {
        if (!g.name.trim()) throw new Error("Option group needs a name");
        if (!g.values.length)
          throw new Error(`"${g.name}" needs at least one value`);
        for (const v of g.values) {
          if (!v.label.trim())
            throw new Error(`A value in "${g.name}" is missing a label`);
          if (
            v.price_delta_mad != null &&
            !Number.isFinite(Number(v.price_delta_mad))
          )
            throw new Error(`Invalid price delta in "${g.name}"`);
        }
      }

      // promo
      let promo_price_mad: number | null = null;
      let promo_starts_at: string | null = null;
      let promo_ends_at: string | null = null;
      if (promoPrice || promoStart || promoEnd) {
        const p = Number(promoPrice);
        if (!Number.isFinite(p) || p <= 0)
          throw new Error("Enter a valid promo price");
        if (p >= base)
          throw new Error("Promo price must be lower than base price");
        if (!promoStart || !promoEnd)
          throw new Error("Select both promo start and end");
        const sISO = toISO(promoStart)!;
        const eISO = toISO(promoEnd)!;
        if (new Date(eISO).getTime() <= new Date(sISO).getTime())
          throw new Error("Promo end must be after start");
        promo_price_mad = Math.round(p);
        promo_starts_at = sISO;
        promo_ends_at = eISO;
      }

      // personalization
      let personalization_enabled = !!persoEnabled;
      let personalization_instructions: string | null = null;
      let personalization_max_chars: number | null = null;

      if (personalization_enabled) {
        const max = Number(persoMax);
        if (!Number.isFinite(max) || max <= 0) {
          throw new Error("Enter a valid max characters for personalization");
        }
        if (!persoInstr.trim()) {
          throw new Error("Add buyer instructions for personalization");
        }
        personalization_instructions = persoInstr.trim();
        personalization_max_chars = Math.round(max);
      } else {
        // make sure DB receives explicit "off" values
        personalization_enabled = false;
        personalization_instructions = null;
        personalization_max_chars = null;
      }

      setSaving(true);

      // need both: shop id AND owner id
      const shopId = await getOrCreateMyShop();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const payload: NewProductInsertWithOwner = {
        title: title.trim(),
        price_mad: Math.round(base),
        city: city.trim() || null,
        active: true,
        photos,
        shop_id: shopId,
        shop_owner: user.id, // ensure products.shop_owner is set

        // promo
        promo_price_mad,
        promo_starts_at,
        promo_ends_at,

        // options
        options_config: groups,

        // personalization 👇 now persisted correctly
        personalization_enabled,
        personalization_instructions,
        personalization_max_chars,
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <div className="text-sm mb-1">Base Price (MAD)</div>
        <input
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-full rounded border px-3 py-2"
          inputMode="numeric"
        />
      </label>

      {/* Promo */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="text-sm font-medium">Promo (optional)</div>
        <label className="block">
          <div className="text-sm mb-1">Promo Price (MAD)</div>
          <input
            type="number"
            min={0}
            value={promoPrice}
            onChange={(e) => setPromoPrice(e.target.value)}
            className="w-full rounded border px-3 py-2"
            inputMode="numeric"
            placeholder="e.g., 199"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm mb-1">Promo starts</div>
            <input
              type="datetime-local"
              value={promoStart}
              onChange={(e) => setPromoStart(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <div className="text-sm mb-1">Promo ends</div>
            <input
              type="datetime-local"
              value={promoEnd}
              onChange={(e) => setPromoEnd(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">
          If you set a promo price, both start and end are required. The product
          will automatically revert to the base price when the promo ends.
        </p>
      </div>

      {/* City */}
      <label className="block">
        <div className="text-sm mb-1">City</div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="Tetouan"
        />
      </label>

      {/* Options Builder */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Options (custom dropdowns)</div>
          <button
            type="button"
            onClick={addGroup}
            className="text-sm rounded bg-black text-white px-3 py-1.5"
          >
            + Add option group
          </button>
        </div>

        {!groups.length && (
          <p className="text-sm text-neutral-500">
            Add groups like <b>Size</b> or <b>Fabric Color</b>. Each value can
            change the price relative to the base price.
          </p>
        )}

        {groups.map((g) => (
          <div key={g.id} className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={g.name}
                onChange={(e) => setGroupName(g.id, e.target.value)}
                className="flex-1 rounded border px-3 py-2"
                placeholder="Group name (e.g., Size)"
              />
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={g.required ?? true}
                  onChange={() => toggleRequired(g.id)}
                />
                required
              </label>
              <button
                type="button"
                onClick={() => removeGroup(g.id)}
                className="text-sm rounded border px-2 py-1"
              >
                Remove
              </button>
            </div>

            <div className="space-y-2">
              {g.values.map((v) => (
                <div key={v.id} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    className="col-span-3 rounded border px-3 py-2"
                    value={v.label}
                    onChange={(e) =>
                      updateValue(g.id, v.id, { label: e.target.value })
                    }
                    placeholder="Option label (e.g., M - Hoodie)"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    className="col-span-1 rounded border px-3 py-2"
                    value={String(v.price_delta_mad ?? 0)}
                    onChange={(e) =>
                      updateValue(g.id, v.id, {
                        price_delta_mad: Number(e.target.value || 0),
                      })
                    }
                    placeholder="Δ MAD"
                    title="Price delta relative to base price (can be 0 or negative)."
                  />
                  <button
                    type="button"
                    onClick={() => removeValue(g.id, v.id)}
                    className="col-span-1 text-sm rounded border px-2 py-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addValue(g.id)}
              className="text-sm rounded bg-neutral-100 px-3 py-1.5"
            >
              + Add value
            </button>
          </div>
        ))}
      </div>

      {/* Personalization */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Personalization</div>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={persoEnabled}
              onChange={(e) => setPersoEnabled(e.target.checked)}
            />
            Enable
          </label>
        </div>

        {persoEnabled && (
          <>
            <label className="block">
              <div className="text-sm mb-1">
                Buyer instructions (shown in sheet)
              </div>
              <textarea
                className="w-full rounded border px-3 py-2"
                value={persoInstr}
                onChange={(e) => setPersoInstr(e.target.value)}
                placeholder="Tell the buyer what to write (e.g., 'Enter the name to engrave…')"
                rows={3}
              />
            </label>

            <label className="block">
              <div className="text-sm mb-1">Max characters</div>
              <input
                type="number"
                min={1}
                className="w-full rounded border px-3 py-2"
                value={persoMax}
                onChange={(e) => setPersoMax(e.target.value)}
                inputMode="numeric"
                placeholder="e.g., 80"
              />
            </label>
            <p className="text-xs text-neutral-500">
              The “Add a personalization” button appears on the product page
              only when personalization is enabled.
            </p>
          </>
        )}
      </div>

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
