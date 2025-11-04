// app/sell/page.tsx — Product Creation Stepper
"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadCompressedToSupabase } from "@/lib/compressAndUpload"; // ensure this exists
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
// import CategorySheetPicker from "@/components/CategorySheetPicker"; // optional (see StepCategory)

/* ───────────────────────── Helpers ───────────────────────── */
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function moneyToInt(x: string | number | null | undefined) {
  if (x == null || x === "") return null;
  const n =
    typeof x === "number" ? x : parseFloat(x.toString().replace(/,/g, "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/* ───────────────────────── Types ───────────────────────── */
// Keep ALL form state at parent level so steps don't lose it when switching
export type OptionValue = {
  id: string;
  label: string;
  price_delta_mad?: number;
};
export type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};
export type ShippingDetails = {
  mode: "free" | "fees";
  fee_mad: number | null;
  free_over_mad: number | null;
};

type FormState = {
  // Photos
  files: File[];
  uploadedUrls: string[]; // will be filled on save

  // Category
  categoryId: string | null;
  categoryPath?: string | null; // optional pretty path

  // Basics
  title: string;
  price_mad: number | null;
  stock_qty: number | null;

  // Details
  description: string;
  materials: string;
  weight_g: number | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;

  // Shipping
  shipping: ShippingDetails;

  // Options
  optionGroups: OptionGroup[];

  // Personalization
  personalization_enabled: boolean;
  personalization_instructions: string;
  personalization_max_chars: number | null;

  // Promo
  promo_price_mad: number | null;
  promo_starts_at: string | null; // ISO date
  promo_ends_at: string | null; // ISO date
};

/* ───────────────────────── Page ───────────────────────── */
export default function SellPage() {
  const router = useRouter();

  const steps = useMemo(
    () => [
      { key: "photos", label: "Photos" },
      { key: "category", label: "Category" },
      { key: "basics", label: "Basics" },
      { key: "details", label: "Item Details" },
      { key: "shipping", label: "Shipping" },
      { key: "options", label: "Options" },
      { key: "personalization", label: "Personalization" },
      { key: "promo", label: "Promo" },
      { key: "review", label: "Review" },
    ],
    []
  );

  const [current, setCurrent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    files: [],
    uploadedUrls: [],
    categoryId: null,
    categoryPath: null,
    title: "",
    price_mad: null,
    stock_qty: 1,
    description: "",
    materials: "",
    weight_g: null,
    width_cm: null,
    height_cm: null,
    depth_cm: null,
    shipping: { mode: "fees", fee_mad: null, free_over_mad: null },
    optionGroups: [],
    personalization_enabled: false,
    personalization_instructions: "",
    personalization_max_chars: null,
    promo_price_mad: null,
    promo_starts_at: null,
    promo_ends_at: null,
  });

  /* ─────────── Navigation ─────────── */
  const next = useCallback(async () => {
    const ok = await validateStep(current, form);
    if (!ok) return;
    setError(null);
    setCurrent((i) => Math.min(i + 1, steps.length - 1));
  }, [current, form, steps.length]);

  const prev = useCallback(() => {
    setError(null);
    setCurrent((i) => Math.max(i - 1, 0));
  }, []);

  /* ─────────── Save / Submit ─────────── */
  const handleSave = useCallback(async () => {
    setError(null);
    // final validation across all steps
    for (let i = 0; i < steps.length - 1; i++) {
      const ok = await validateStep(i, form);
      if (!ok) {
        setCurrent(i);
        return;
      }
    }

    try {
      setSaving(true);

      // 1) Insert product row
      const { data: user } = await supabase.auth.getUser();
      const ownerId = user.user?.id;
      if (!ownerId) throw new Error("You're not signed in.");

      const insertPayload: any = {
        owner_id: ownerId,
        title: form.title.trim(),
        description: form.description?.trim() || null,
        price_mad: form.price_mad,
        stock_qty: form.stock_qty ?? 0,
        materials: form.materials || null,
        weight_g: form.weight_g,
        width_cm: form.width_cm,
        height_cm: form.height_cm,
        depth_cm: form.depth_cm,
        shipping_mode: form.shipping.mode,
        shipping_fee_mad: form.shipping.fee_mad,
        free_over_mad: form.shipping.free_over_mad,
        personalization_enabled: form.personalization_enabled,
        personalization_instructions: form.personalization_instructions || null,
        personalization_max_chars: form.personalization_max_chars,
        promo_price_mad: form.promo_price_mad,
        promo_starts_at: form.promo_starts_at,
        promo_ends_at: form.promo_ends_at,
      };

      const { data: prodIns, error: prodErr } = await supabase
        .from("products")
        .insert(insertPayload)
        .select("id")
        .single();

      if (prodErr) throw prodErr;
      const productId = prodIns!.id as string;

      // 2) Link category (assuming product_categories join table)
      if (form.categoryId) {
        const { error: relErr } = await supabase
          .from("product_categories")
          .upsert(
            [
              {
                product_id: productId,
                category_id: form.categoryId,
                is_primary: true,
              },
            ],
            {
              onConflict: "product_id,category_id",
            }
          );
        if (relErr) throw relErr;
      }

      // 3) Upload all photos (parallel, keep order)
      const uploadedUrls: string[] = [];
      for (let i = 0; i < form.files.length; i++) {
        const file = form.files[i];
        const up = await uploadCompressedToSupabase(file, {
          bucket: "product-photos",
          path: `${productId}/${Date.now()}_${i}.jpg`,
          quality: 0.8,
          maxWidth: 1600,
        });
        if (!up?.publicUrl) throw new Error("Image upload failed");
        uploadedUrls.push(up.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        const { error: photosErr } = await supabase
          .from("product_photos")
          .insert(
            uploadedUrls.map((url, idx) => ({
              product_id: productId,
              url,
              sort: idx,
            }))
          );
        if (photosErr) throw photosErr;
      }

      // 4) Save options (optional; ensure you have tables product_option_groups & product_option_values)
      if (form.optionGroups.length) {
        // Simplified example; adjust to your schema
        for (const g of form.optionGroups) {
          const { data: groupIns, error: gErr } = await supabase
            .from("product_option_groups")
            .insert({
              product_id: productId,
              name: g.name,
              required: !!g.required,
            })
            .select("id")
            .single();
          if (gErr) throw gErr;
          const groupId = groupIns!.id;
          if (g.values?.length) {
            const { error: vErr } = await supabase
              .from("product_option_values")
              .insert(
                g.values.map((v, idx) => ({
                  group_id: groupId,
                  label: v.label,
                  price_delta_mad: v.price_delta_mad ?? null,
                  sort: idx,
                }))
              );
            if (vErr) throw vErr;
          }
        }
      }

      // 5) Done → redirect to product page
      router.push(`/product/${productId}`);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to save product");
    } finally {
      setSaving(false);
    }
  }, [form, steps.length, router]);

  /* ─────────── UI ─────────── */
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Create a new product</h1>

      {/* Step pill bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {steps.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setCurrent(i)}
            className={clsx(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              i === current
                ? "bg-black text-white border-black"
                : i < current
                  ? "bg-neutral-900/5 border-neutral-300"
                  : "bg-white border-neutral-200 text-neutral-700"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step content — render current only; state is lifted so nothing is lost */}
      <div className="rounded-2xl border p-4 bg-white">
        {current === 0 && (
          <StepPhotos
            files={form.files}
            onFiles={(files) => setForm((f) => ({ ...f, files }))}
          />
        )}
        {current === 1 && (
          <StepCategory
            categoryId={form.categoryId}
            categoryPath={form.categoryPath}
            onPick={(id, path) =>
              setForm((f) => ({ ...f, categoryId: id, categoryPath: path }))
            }
          />
        )}
        {current === 2 && (
          <StepBasics
            title={form.title}
            price_mad={form.price_mad}
            stock_qty={form.stock_qty}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />
        )}
        {current === 3 && (
          <StepDetails
            description={form.description}
            materials={form.materials}
            weight_g={form.weight_g}
            width_cm={form.width_cm}
            height_cm={form.height_cm}
            depth_cm={form.depth_cm}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />
        )}
        {current === 4 && (
          <StepShipping
            shipping={form.shipping}
            onChange={(shipping) => setForm((f) => ({ ...f, shipping }))}
          />
        )}
        {current === 5 && (
          <StepOptions
            groups={form.optionGroups}
            onChange={(groups) =>
              setForm((f) => ({ ...f, optionGroups: groups }))
            }
          />
        )}
        {current === 6 && (
          <StepPersonalization
            enabled={form.personalization_enabled}
            instructions={form.personalization_instructions}
            maxChars={form.personalization_max_chars}
            onChange={(patch) =>
              setForm((f) => ({
                ...f,
                personalization_enabled:
                  patch.enabled ?? f.personalization_enabled,
                personalization_instructions:
                  patch.instructions ?? f.personalization_instructions,
                personalization_max_chars:
                  patch.maxChars ?? f.personalization_max_chars,
              }))
            }
          />
        )}
        {current === 7 && (
          <StepPromo
            promo_price_mad={form.promo_price_mad}
            promo_starts_at={form.promo_starts_at}
            promo_ends_at={form.promo_ends_at}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />
        )}
        {current === 8 && <StepReview form={form} />}
      </div>

      {/* Errors */}
      {error && (
        <div className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Nav buttons */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={prev}
          disabled={current === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>

        {current < steps.length - 1 ? (
          <Button type="button" onClick={next}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Publish"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Validation ───────────────────────── */
async function validateStep(idx: number, f: FormState): Promise<boolean> {
  switch (idx) {
    case 0:
      if (!f.files.length) return false;
      return true;
    case 1:
      if (!f.categoryId) return false;
      return true;
    case 2:
      return !!(f.title?.trim().length >= 6 && f.price_mad && f.price_mad > 0);
    case 3:
      return !!(f.description?.trim().length >= 10);
    case 4:
      if (f.shipping.mode === "fees") {
        return f.shipping.fee_mad != null && f.shipping.fee_mad >= 0;
      }
      return true;
    default:
      return true;
  }
}

/* ───────────────────────── Steps ───────────────────────── */
function StepPhotos({
  files,
  onFiles,
}: {
  files: File[];
  onFiles: (f: File[]) => void;
}) {
  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files ? Array.from(e.target.files) : [];
      if (list.length) onFiles([...(files ?? []), ...list]);
    },
    [files, onFiles]
  );

  const remove = (idx: number) => onFiles(files.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center gap-3">
        <label
          htmlFor="photos"
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer hover:bg-neutral-50"
        >
          <Upload className="h-4 w-4" />
          <span>Add photos</span>
          <input
            id="photos"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onPick}
          />
        </label>
        <div className="text-xs text-neutral-500">
          First photo will be the cover. Drag to reorder (coming soon).
        </div>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {files.map((f, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-lg overflow-hidden border"
            >
              <img
                src={URL.createObjectURL(f)}
                alt={f.name}
                className="object-cover w-full h-full"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-1 right-1 inline-flex items-center justify-center bg-black/70 text-white rounded-full h-7 w-7"
                aria-label="Remove"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-center gap-2 text-neutral-500 border rounded-lg py-10">
          <ImageIcon className="h-5 w-5" />
          <span>No photos yet</span>
        </div>
      )}
    </div>
  );
}

function StepCategory({
  categoryId,
  categoryPath,
  onPick,
}: {
  categoryId: string | null;
  categoryPath?: string | null;
  onPick: (id: string, path?: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-neutral-600">
        Choose a category so buyers can find your item.
      </div>

      {/* If you already have a CategorySheetPicker, plug it here */}
      {/* <CategorySheetPicker value={categoryId} onChange={(id, path) => onPick(id!, path)} /> */}

      {/* Minimal fallback: free input for now */}
      <Label htmlFor="categoryId">Category ID</Label>
      <Input
        id="categoryId"
        placeholder="e.g. 123e4567…"
        value={categoryId ?? ""}
        onChange={(e) => onPick(e.target.value)}
      />
      {categoryPath ? (
        <div className="text-xs text-neutral-500">{categoryPath}</div>
      ) : null}

      <div className="rounded-lg bg-sand p-3 text-sm">
        <div className="font-medium mb-1">Tip</div>
        Pick the most specific secondary category (e.g. “Clothing / Women /
        Dresses”).
      </div>
    </div>
  );
}

function StepBasics({
  title,
  price_mad,
  stock_qty,
  onChange,
}: {
  title: string;
  price_mad: number | null;
  stock_qty: number | null;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Handmade ceramic vase"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <p className="text-xs text-neutral-500 mt-1">
          At least 6 characters. Keep it descriptive and clear.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price (MAD)</Label>
          <Input
            id="price"
            inputMode="decimal"
            placeholder="199"
            value={price_mad ?? ""}
            onChange={(e) =>
              onChange({ price_mad: moneyToInt(e.target.value) })
            }
          />
        </div>
        <div>
          <Label htmlFor="stock">Stock qty</Label>
          <Input
            id="stock"
            inputMode="numeric"
            placeholder="10"
            value={stock_qty ?? ""}
            onChange={(e) =>
              onChange({ stock_qty: Number(e.target.value || 0) })
            }
          />
        </div>
      </div>
    </div>
  );
}

function StepDetails({
  description,
  materials,
  weight_g,
  width_cm,
  height_cm,
  depth_cm,
  onChange,
}: {
  description: string;
  materials: string;
  weight_g: number | null;
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="desc">Description</Label>
        <Textarea
          id="desc"
          placeholder="Tell buyers about the item…"
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
        <p className="text-xs text-neutral-500 mt-1">
          Minimum 10 characters. You can paste line breaks.
        </p>
      </div>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer select-none font-medium">
          Optional: Item specs
        </summary>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label htmlFor="materials">Materials</Label>
            <Input
              id="materials"
              placeholder="Cotton, wood…"
              value={materials}
              onChange={(e) => onChange({ materials: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="weight">Weight (g)</Label>
            <Input
              id="weight"
              inputMode="numeric"
              value={weight_g ?? ""}
              onChange={(e) =>
                onChange({ weight_g: Number(e.target.value || 0) })
              }
            />
          </div>
          <div>
            <Label htmlFor="width">Width (cm)</Label>
            <Input
              id="width"
              inputMode="numeric"
              value={width_cm ?? ""}
              onChange={(e) =>
                onChange({ width_cm: Number(e.target.value || 0) })
              }
            />
          </div>
          <div>
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              inputMode="numeric"
              value={height_cm ?? ""}
              onChange={(e) =>
                onChange({ height_cm: Number(e.target.value || 0) })
              }
            />
          </div>
          <div>
            <Label htmlFor="depth">Depth (cm)</Label>
            <Input
              id="depth"
              inputMode="numeric"
              value={depth_cm ?? ""}
              onChange={(e) =>
                onChange({ depth_cm: Number(e.target.value || 0) })
              }
            />
          </div>
        </div>
      </details>
    </div>
  );
}

function StepShipping({
  shipping,
  onChange,
}: {
  shipping: ShippingDetails;
  onChange: (s: ShippingDetails) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="freeShip"
          checked={shipping.mode === "free"}
          onCheckedChange={(v) =>
            onChange({ ...shipping, mode: v ? "free" : "fees" })
          }
        />
        <Label htmlFor="freeShip">Free shipping</Label>
      </div>

      {shipping.mode === "fees" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="shipFee">Shipping fee (MAD)</Label>
            <Input
              id="shipFee"
              inputMode="numeric"
              value={shipping.fee_mad ?? ""}
              onChange={(e) =>
                onChange({ ...shipping, fee_mad: Number(e.target.value || 0) })
              }
            />
          </div>
          <div>
            <Label htmlFor="freeOver">Free over (MAD)</Label>
            <Input
              id="freeOver"
              inputMode="numeric"
              value={shipping.free_over_mad ?? ""}
              onChange={(e) =>
                onChange({
                  ...shipping,
                  free_over_mad: Number(e.target.value || 0),
                })
              }
            />
          </div>
        </div>
      )}

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer select-none font-medium">
          Optional: More policies
        </summary>
        <p className="text-sm text-neutral-600 mt-2">
          Return policy, handling time, packaging notes… (add your own fields
          later)
        </p>
      </details>
    </div>
  );
}

function StepOptions({
  groups,
  onChange,
}: {
  groups: OptionGroup[];
  onChange: (g: OptionGroup[]) => void;
}) {
  const addGroup = () =>
    onChange([
      ...(groups ?? []),
      {
        id: crypto.randomUUID(),
        name: "New group",
        required: false,
        values: [],
      },
    ]);
  const patchGroup = (id: string, patch: Partial<OptionGroup>) =>
    onChange(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const removeGroup = (id: string) =>
    onChange(groups.filter((g) => g.id !== id));
  const addValue = (gid: string) =>
    patchGroup(gid, {
      values: [
        ...groups.find((g) => g.id === gid)!.values,
        { id: crypto.randomUUID(), label: "Option", price_delta_mad: 0 },
      ],
    });
  const patchValue = (gid: string, vid: string, patch: Partial<OptionValue>) =>
    onChange(
      groups.map((g) =>
        g.id !== gid
          ? g
          : {
              ...g,
              values: g.values.map((v) =>
                v.id === vid ? { ...v, ...patch } : v
              ),
            }
      )
    );
  const removeValue = (gid: string, vid: string) =>
    onChange(
      groups.map((g) =>
        g.id !== gid
          ? g
          : { ...g, values: g.values.filter((v) => v.id !== vid) }
      )
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">Variations / Options</div>
          <p className="text-sm text-neutral-600">
            Add color, size, material… and optional price deltas.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={addGroup}>
          Add group
        </Button>
      </div>

      {groups.length === 0 ? (
        <div className="text-sm text-neutral-500 border rounded-lg p-3">
          No option groups yet.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <Input
                  value={g.name}
                  onChange={(e) => patchGroup(g.id, { name: e.target.value })}
                  className="font-medium"
                />
                <div className="flex items-center gap-2 ml-auto">
                  <Switch
                    checked={!!g.required}
                    onCheckedChange={(v) => patchGroup(g.id, { required: v })}
                    id={`req-${g.id}`}
                  />
                  <Label htmlFor={`req-${g.id}`}>Required</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => removeGroup(g.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {g.values.map((v) => (
                  <div key={v.id} className="grid grid-cols-2 gap-3">
                    <Input
                      value={v.label}
                      onChange={(e) =>
                        patchValue(g.id, v.id, { label: e.target.value })
                      }
                      placeholder="Label (e.g., Red)"
                    />
                    <Input
                      inputMode="decimal"
                      value={v.price_delta_mad ?? 0}
                      onChange={(e) =>
                        patchValue(g.id, v.id, {
                          price_delta_mad: moneyToInt(e.target.value) ?? 0,
                        })
                      }
                      placeholder="Price +/− (MAD)"
                    />
                    <div className="col-span-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => removeValue(g.id, v.id)}
                      >
                        Remove option
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addValue(g.id)}
                >
                  Add value
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepPersonalization({
  enabled,
  instructions,
  maxChars,
  onChange,
}: {
  enabled: boolean;
  instructions: string;
  maxChars: number | null;
  onChange: (patch: {
    enabled?: boolean;
    instructions?: string;
    maxChars?: number | null;
  }) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Switch
          id="perso"
          checked={enabled}
          onCheckedChange={(v) => onChange({ enabled: v })}
        />
        <Label htmlFor="perso">Enable personalization</Label>
      </div>

      {enabled && (
        <div className="grid gap-3">
          <div>
            <Label htmlFor="instr">Instructions for buyer</Label>
            <Textarea
              id="instr"
              value={instructions}
              onChange={(e) => onChange({ instructions: e.target.value })}
              placeholder="e.g., Add a name and a date…"
            />
          </div>
          <div>
            <Label htmlFor="maxc">Max characters</Label>
            <Input
              id="maxc"
              inputMode="numeric"
              value={maxChars ?? ""}
              onChange={(e) =>
                onChange({ maxChars: Number(e.target.value || 0) })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StepPromo({
  promo_price_mad,
  promo_starts_at,
  promo_ends_at,
  onChange,
}: {
  promo_price_mad: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  onChange: (patch: Partial<FormState>) => void;
}) {
  return (
    <div className="grid gap-4">
      <div>
        <Label htmlFor="pp">Promo price (MAD)</Label>
        <Input
          id="pp"
          inputMode="decimal"
          value={promo_price_mad ?? ""}
          onChange={(e) =>
            onChange({ promo_price_mad: moneyToInt(e.target.value) })
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="ps">Starts at</Label>
          <Input
            id="ps"
            type="datetime-local"
            value={promo_starts_at ?? ""}
            onChange={(e) =>
              onChange({ promo_starts_at: e.target.value || null })
            }
          />
        </div>
        <div>
          <Label htmlFor="pe">Ends at</Label>
          <Input
            id="pe"
            type="datetime-local"
            value={promo_ends_at ?? ""}
            onChange={(e) =>
              onChange({ promo_ends_at: e.target.value || null })
            }
          />
        </div>
      </div>

      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer select-none font-medium">
          Optional: Advanced scheduling
        </summary>
        <p className="text-sm text-neutral-600 mt-2">
          You can automate campaign windows later from a Promotions screen.
        </p>
      </details>
    </div>
  );
}

function StepReview({ form }: { form: FormState }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg border p-3">
        <div className="font-medium mb-1">Overview</div>
        <ul className="list-disc ml-5">
          <li>
            <span className="font-medium">Title:</span>{" "}
            {form.title || <em className="text-neutral-500">(missing)</em>}
          </li>
          <li>
            <span className="font-medium">Price:</span>{" "}
            {form.price_mad != null ? (
              `${form.price_mad} MAD`
            ) : (
              <em className="text-neutral-500">(missing)</em>
            )}
          </li>
          <li>
            <span className="font-medium">Category:</span>{" "}
            {form.categoryPath || form.categoryId || (
              <em className="text-neutral-500">(missing)</em>
            )}
          </li>
          <li>
            <span className="font-medium">Photos:</span> {form.files.length}{" "}
            selected
          </li>
        </ul>
      </div>

      <div className="rounded-lg border p-3">
        <div className="font-medium mb-1">Shipping</div>
        <div>
          {form.shipping.mode === "free"
            ? "Free shipping"
            : `Fee: ${form.shipping.fee_mad ?? 0} MAD`}
        </div>
        {form.shipping.free_over_mad != null && (
          <div>Free over: {form.shipping.free_over_mad} MAD</div>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <div className="font-medium mb-1">Variations</div>
        {form.optionGroups.length ? (
          <ul className="list-disc ml-5">
            {form.optionGroups.map((g) => (
              <li key={g.id}>
                {g.name} ({g.required ? "required" : "optional"}) —{" "}
                {g.values.length} values
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-neutral-500">None</div>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <div className="font-medium mb-1">Personalization</div>
        {form.personalization_enabled ? (
          <ul className="list-disc ml-5">
            <li>Enabled</li>
            <li>Max chars: {form.personalization_max_chars ?? "—"}</li>
            <li>Instructions: {form.personalization_instructions || "—"}</li>
          </ul>
        ) : (
          <div className="text-neutral-500">Disabled</div>
        )}
      </div>

      <div className="rounded-lg border p-3">
        <div className="font-medium mb-1">Promo</div>
        {form.promo_price_mad ? (
          <ul className="list-disc ml-5">
            <li>Price: {form.promo_price_mad} MAD</li>
            <li>Starts: {form.promo_starts_at || "—"}</li>
            <li>Ends: {form.promo_ends_at || "—"}</li>
          </ul>
        ) : (
          <div className="text-neutral-500">No promo set</div>
        )}
      </div>
    </div>
  );
}
