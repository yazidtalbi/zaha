// app/seller/edit/[id]/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "sonner";

// ————————————————————————————
// Types (aligned with /sell/page.tsx)
// ————————————————————————————
type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type Product = {
  id: string;
  title: string;
  price_mad: number;
  active: boolean;
  unavailable: boolean; // 👈 NEW
  photos: string[] | null;
  created_at: string;
  shop_id: string;
  deleted_at: string | null;
  city: string | null;
  promo_price_mad: number | null;
  promo_starts_at: string | null; // ISO
  promo_ends_at: string | null; // ISO
  options_config: OptionGroup[] | null;
};

// ————————————————————————————
// Utils
// ————————————————————————————
function uid() {
  // compact UUID
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// convert ISO -> value suitable for <input type="datetime-local">
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

// convert local datetime input -> ISO
function localInputToISO(dtLocal: string): string | null {
  if (!dtLocal) return null;
  const ms = Date.parse(dtLocal.replace(" ", "T"));
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export default function EditProductPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);

  // editable fields
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState<number | string>("");
  const [city, setCity] = useState<string>("");
  const [active, setActive] = useState(true);
  const [unavailable, setUnavailable] = useState(false); // 👈 NEW

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Promo
  const [promoPrice, setPromoPrice] = useState<string>("");
  const [promoStart, setPromoStart] = useState<string>(""); // datetime-local string
  const [promoEnd, setPromoEnd] = useState<string>("");

  // Options
  const [groups, setGroups] = useState<OptionGroup[]>([]);

  // ————————————————————————————
  // Load
  // ————————————————————————————
  useEffect(() => {
    const pid = (id ?? "").toString();
    if (!pid) return;

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select(
            "id,title,price_mad,active,unavailable,photos,created_at,shop_id,deleted_at,city,promo_price_mad,promo_starts_at,promo_ends_at,options_config"
          )
          .eq("id", pid)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error("Product not found");
          setLoading(false);
          return;
        }

        const p = data as Product;
        setProduct(p);

        setTitle(p.title ?? "");
        setPrice(p.price_mad ?? 0);
        setActive(!!p.active && !p.deleted_at);
        setUnavailable(Boolean(p.unavailable)); // 👈 NEW
        setCity(p.city ?? "");
        setPhotos(Array.isArray(p.photos) ? p.photos : []);

        setPromoPrice(
          p.promo_price_mad != null ? String(p.promo_price_mad) : ""
        );
        setPromoStart(isoToLocalInput(p.promo_starts_at));
        setPromoEnd(isoToLocalInput(p.promo_ends_at));

        setGroups(Array.isArray(p.options_config) ? p.options_config : []);
      } catch (err) {
        toast.error("Failed to load product", {
          description: (err as Error).message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ————————————————————————————
  // Photo upload & remove
  // ————————————————————————————
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
      toast.success("Photos uploaded");
    } catch (err) {
      toast.error("Upload failed", { description: (err as Error).message });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  // ————————————————————————————
  // Options Builder helpers
  // ————————————————————————————
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

  // ————————————————————————————
  // Save
  // ————————————————————————————
  async function save() {
    if (!product) return;

    try {
      if (!title.trim()) throw new Error("Title is required");
      const priceNumber = Number(price);
      if (!Number.isFinite(priceNumber) || priceNumber < 0)
        throw new Error("Price must be a positive number");
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

      // promo: same rules as Sell page
      let promo_price_mad: number | null = null;
      let promo_starts_at: string | null = null;
      let promo_ends_at: string | null = null;
      if (promoPrice || promoStart || promoEnd) {
        const p = Number(promoPrice);
        if (!Number.isFinite(p) || p <= 0)
          throw new Error("Enter a valid promo price");
        if (p >= priceNumber)
          throw new Error("Promo price must be lower than base price");
        if (!promoStart || !promoEnd)
          throw new Error("Select both promo start and end");
        const sISO = localInputToISO(promoStart)!;
        const eISO = localInputToISO(promoEnd)!;
        if (new Date(eISO).getTime() <= new Date(sISO).getTime())
          throw new Error("Promo end must be after start");
        promo_price_mad = Math.round(p);
        promo_starts_at = sISO;
        promo_ends_at = eISO;
      }

      setSaving(true);

      const updates = {
        title: title.trim(),
        price_mad: Math.round(priceNumber),
        city: city.trim() || null,
        active,
        unavailable, // 👈 NEW
        photos,
        promo_price_mad,
        promo_starts_at,
        promo_ends_at,
        options_config: groups,
        // NOTE: never touch deleted_at here
      };

      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", product.id);

      if (error) throw error;

      toast.success("Product updated ✅");
      router.push("/seller/products");
    } catch (err) {
      toast.error("Failed to save", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // ————————————————————————————
  // Soft delete
  // ————————————————————————————
  async function softDelete() {
    if (!product) return;
    if (!confirm("Remove this product from the store? (soft delete)")) return;

    const { error } = await supabase
      .from("products")
      .update({ active: false, deleted_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      toast.error("Failed to remove", { description: error.message });
    } else {
      toast("Product removed from store");
      router.push("/seller/products");
    }
  }

  if (loading) return <main className="p-4">Loading…</main>;
  if (!product) {
    return (
      <main className="p-4 space-y-3">
        <p>Product not found.</p>
        <Link className="underline text-sm" href="/seller/products">
          Back to products
        </Link>
      </main>
    );
  }

  const removed = !!product.deleted_at; // keep removed tied only to soft-delete

  return (
    <main className="p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit product</h1>
        <div className="flex items-center gap-3">
          <Link className="underline text-sm" href={`/product/${product.id}`}>
            Preview product
          </Link>
          <Link className="underline text-sm" href="/seller/products">
            Back
          </Link>
        </div>
      </header>

      {removed && (
        <div className="rounded-xl border bg-amber-50 text-amber-900 px-4 py-3 text-sm">
          This product is removed from the store. You can still edit its data,
          but customers won’t see it.
        </div>
      )}

      {/* Photos */}
      <section className="space-y-3">
        <label className="block">
          <div className="text-sm mb-1">Photos</div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleSelect}
          />
          {uploading && <div className="text-sm mt-1">Uploading…</div>}
        </label>

        {!!photos.length && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((src, i) => (
              <div
                key={src + i}
                className="relative rounded-lg overflow-hidden"
              >
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
      </section>

      {/* Basics */}
      <div className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm">Title</span>
          <input
            className="w-full rounded-xl border bg-paper px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">Price (MAD)</span>
          <input
            className="w-full rounded-xl border bg-paper px-3 py-2"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm">City</span>
          <input
            className="w-full rounded-xl border bg-paper px-3 py-2"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Tetouan"
          />
        </label>

        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={removed}
            />
            Active (visible in store)
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unavailable}
              onChange={(e) => setUnavailable(e.target.checked)}
              disabled={removed}
            />
            Temporarily unavailable (visible but can’t be purchased)
          </label>
        </div>
      </div>

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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving || uploading}
          className="rounded-xl border px-4 py-2 text-sm bg-paper hover:bg-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {!removed ? (
          <button
            onClick={softDelete}
            className="text-sm underline text-rose-600"
          >
            Remove from store
          </button>
        ) : null}
      </div>
    </main>
  );
}
