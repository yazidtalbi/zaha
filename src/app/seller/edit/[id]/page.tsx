// app/seller/edit/[id]/page.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { toast } from "sonner";

/* -------------------------------------------
   Types
------------------------------------------- */
type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type ShippingDetails = {
  mode: "free" | "fees";
  fee_mad: number | null;
  free_over_mad: number | null;
  estimate_days_min: number | null;
  estimate_days_max: number | null;
  cod: boolean;
  pickup: boolean;
  tracking: boolean;
  notes: string | null;
};

type ItemDetails = {
  type: "physical" | "digital";
  width_cm: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  personalizable: boolean;
  ships_from: string | null;
  ships_to: string[];
  materials: string[];
  returns: "accepted" | "not_accepted";
  shipping?: ShippingDetails | null;
};

type ProductRow = {
  id: string;
  title: string;
  keywords?: string | null; // NEW
  description?: string | null; // NEW
  price_mad: number;
  city: string | null;
  active: boolean;
  photos: string[] | null;
  shop_id: string;
  shop_owner?: string;
  promo_price_mad: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  options_config: OptionGroup[] | null;
  personalization_enabled?: boolean;
  personalization_instructions?: string | null;
  personalization_max_chars?: number | null;
  item_details?: ItemDetails | null;
};

/* -------------------------------------------
   Limits & utils
------------------------------------------- */
const LIMITS = {
  title: 100,
  keywordMax: 7,
  keywordLen: 40,
  description: 2000,
  city: 60,
  shipsFrom: 60,
  shipsTo: 200,
  materials: 200,
  shipNotes: 500,
  persoInstr: 300,
  optionGroupName: 60,
  optionValueLabel: 60,
};

function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function toISO(dtLocal: string): string | null {
  if (!dtLocal) return null;
  const ms = Date.parse(dtLocal.replace(" ", "T"));
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, LIMITS.keywordLen))
    .slice(0, LIMITS.keywordMax);
}

function joinKeywordsForDB(ks: string[]): string {
  return ks.join(", ");
}

/* -------------------------------------------
   Page
------------------------------------------- */
export default function SellerEditPage() {
  return (
    <RequireAuth>
      <EditInner />
    </RequireAuth>
  );
}

function EditInner() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const pid = (id ?? "").toString().trim();

  /* ---------------- State ---------------- */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Basics
  const [title, setTitle] = useState("");
  const [keywordsInput, setKeywordsInput] = useState(""); // NEW (raw input)
  const [keywordsCount, setKeywordsCount] = useState(0); // NEW (live count)
  const [description, setDescription] = useState(""); // NEW
  const [price, setPrice] = useState<string>("");
  const [city, setCity] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [active, setActive] = useState(true);

  // Options
  const [groups, setGroups] = useState<OptionGroup[]>([]);

  // Personalization
  const [persoEnabled, setPersoEnabled] = useState(false);
  const [persoInstr, setPersoInstr] = useState("");
  const [persoMax, setPersoMax] = useState<string>("");

  // Promo
  const [promoPrice, setPromoPrice] = useState<string>("");
  const [promoStart, setPromoStart] = useState<string>("");
  const [promoEnd, setPromoEnd] = useState<string>("");

  // Item Details
  const [itemType, setItemType] = useState<"physical" | "digital">("physical");
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [shipsFrom, setShipsFrom] = useState("");
  const [shipsTo, setShipsTo] = useState("");
  const [materials, setMaterials] = useState("");
  const [returns, setReturns] = useState<"accepted" | "not_accepted">(
    "not_accepted"
  );

  // Shipping (simplified)
  const [shipMode, setShipMode] = useState<"free" | "fees">("free");
  const [shipFee, setShipFee] = useState<string>("");
  const [shipFreeOver, setShipFreeOver] = useState<string>("");
  const [estDaysMin, setEstDaysMin] = useState<string>("");
  const [estDaysMax, setEstDaysMax] = useState<string>("");
  const [shipCOD, setShipCOD] = useState(false);
  const [shipPickup, setShipPickup] = useState(false);
  const [shipTracking, setShipTracking] = useState(true);
  const [shipNotes, setShipNotes] = useState("");

  /* ---------------- Load product ---------------- */
  useEffect(() => {
    if (!pid) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", pid)
        .maybeSingle<ProductRow>();

      if (error || !data) {
        toast.error(error?.message || "Product not found");
        setLoading(false);
        return;
      }

      // Basics
      setTitle((data.title ?? "").slice(0, LIMITS.title));
      setPrice(String(data.price_mad ?? ""));
      setCity((data.city ?? "").slice(0, LIMITS.city));
      setPhotos(Array.isArray(data.photos) ? data.photos.filter(Boolean) : []);
      setActive(Boolean(data.active));

      // NEW: keywords & description
      const kwRaw = (data.keywords ?? "").toString();
      setKeywordsInput(kwRaw);
      setKeywordsCount(parseKeywords(kwRaw).length);
      setDescription((data.description ?? "").slice(0, LIMITS.description));

      // Options
      setGroups(Array.isArray(data.options_config) ? data.options_config : []);

      // Personalization
      setPersoEnabled(Boolean(data.personalization_enabled));
      setPersoInstr(
        (data.personalization_instructions ?? "").slice(0, LIMITS.persoInstr)
      );
      setPersoMax(
        data.personalization_max_chars != null
          ? String(data.personalization_max_chars)
          : ""
      );

      // Promo
      setPromoPrice(
        data.promo_price_mad != null ? String(data.promo_price_mad) : ""
      );
      setPromoStart(
        data.promo_starts_at
          ? new Date(data.promo_starts_at).toISOString().slice(0, 16)
          : ""
      );
      setPromoEnd(
        data.promo_ends_at
          ? new Date(data.promo_ends_at).toISOString().slice(0, 16)
          : ""
      );

      // Item details + shipping
      const d: ItemDetails = (data.item_details as any) ?? ({} as any);

      setItemType(d.type === "digital" ? "digital" : "physical");
      setWidth(d.width_cm != null ? String(d.width_cm) : "");
      setHeight(d.height_cm != null ? String(d.height_cm) : "");
      setWeight(d.weight_kg != null ? String(d.weight_kg) : "");
      setShipsFrom(
        (d.ships_from ?? data.city ?? "").slice(0, LIMITS.shipsFrom)
      );
      setShipsTo(
        Array.isArray(d.ships_to)
          ? d.ships_to.join(", ").slice(0, LIMITS.shipsTo)
          : ""
      );
      setMaterials(
        Array.isArray(d.materials)
          ? d.materials.join(", ").slice(0, LIMITS.materials)
          : ""
      );
      setReturns(
        d.returns === "accepted" || d.returns === "not_accepted"
          ? d.returns
          : "not_accepted"
      );

      const s: ShippingDetails | null = (d.shipping as any) ?? null;
      setShipMode(s?.mode === "fees" ? "fees" : "free");
      setShipFee(s?.fee_mad != null ? String(s.fee_mad) : "");
      setShipFreeOver(s?.free_over_mad != null ? String(s.free_over_mad) : "");
      setEstDaysMin(
        s?.estimate_days_min != null ? String(s.estimate_days_min) : ""
      );
      setEstDaysMax(
        s?.estimate_days_max != null ? String(s.estimate_days_max) : ""
      );
      setShipCOD(Boolean(s?.cod));
      setShipPickup(Boolean(s?.pickup));
      setShipTracking(s?.tracking ?? true);
      setShipNotes((s?.notes ?? "").slice(0, LIMITS.shipNotes));

      setLoading(false);
    })();
  }, [pid]);

  /* ---------------- Photos ---------------- */
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
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  /* ---------------- Options helpers ---------------- */
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
    setGroups((gs) =>
      gs.map((g) =>
        g.id === id ? { ...g, name: name.slice(0, LIMITS.optionGroupName) } : g
      )
    );
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
                v.id === valueId
                  ? {
                      ...v,
                      ...patch,
                      label:
                        patch.label !== undefined
                          ? patch.label.slice(0, LIMITS.optionValueLabel)
                          : v.label,
                    }
                  : v
              ),
            }
          : g
      )
    );
  }

  /* ---------------- Keywords live enforcement ---------------- */
  useEffect(() => {
    const ks = parseKeywords(keywordsInput);
    setKeywordsCount(ks.length);
    const normalized = joinKeywordsForDB(ks);
    const tokens = keywordsInput
      .split(",")
      .filter((t) => t.trim().length > 0).length;
    if (tokens > LIMITS.keywordMax || keywordsInput.length > 400) {
      setKeywordsInput(normalized);
    }
  }, [keywordsInput]);

  /* ---------------- Save ---------------- */
  async function handleSave() {
    try {
      const base = Number(price);
      if (!title.trim()) throw new Error("Title is required");
      if (title.trim().length > LIMITS.title)
        throw new Error(`Title must be ≤ ${LIMITS.title} characters`);
      if (!Number.isFinite(base) || base <= 0)
        throw new Error("Enter a valid price");
      if (!photos.length) throw new Error("Add at least one photo");

      // enforce keywords
      const kw = parseKeywords(keywordsInput);
      if (kw.length > LIMITS.keywordMax)
        throw new Error(`Use at most ${LIMITS.keywordMax} keywords`);

      // validate options
      for (const g of groups) {
        if (!g.name.trim()) throw new Error("Option group needs a name");
        if (g.name.length > LIMITS.optionGroupName)
          throw new Error(
            `Option group names must be ≤ ${LIMITS.optionGroupName} chars`
          );
        if (!g.values.length)
          throw new Error(`"${g.name}" needs at least one value`);
        for (const v of g.values) {
          if (!v.label.trim())
            throw new Error(`A value in "${g.name}" is missing a label`);
          if (v.label.length > LIMITS.optionValueLabel)
            throw new Error(
              `Option value labels must be ≤ ${LIMITS.optionValueLabel} chars`
            );
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
        if (persoInstr.length > LIMITS.persoInstr)
          throw new Error(
            `Personalization instructions must be ≤ ${LIMITS.persoInstr} chars`
          );
        personalization_instructions = persoInstr.trim();
        personalization_max_chars = Math.round(max);
      } else {
        personalization_enabled = false;
        personalization_instructions = null;
        personalization_max_chars = null;
      }

      // quick field lengths
      if (description.length > LIMITS.description)
        throw new Error(`Description must be ≤ ${LIMITS.description} chars`);
      if (city.length > LIMITS.city)
        throw new Error(`City must be ≤ ${LIMITS.city} chars`);
      if (shipsFrom.length > LIMITS.shipsFrom)
        throw new Error(`"Ships from" must be ≤ ${LIMITS.shipsFrom} chars`);
      if (shipsTo.length > LIMITS.shipsTo)
        throw new Error(`"Ships to" must be ≤ ${LIMITS.shipsTo} chars`);
      if (materials.length > LIMITS.materials)
        throw new Error(`Materials must be ≤ ${LIMITS.materials} chars`);
      if (shipNotes.length > LIMITS.shipNotes)
        throw new Error(`Shipping notes must be ≤ ${LIMITS.shipNotes} chars`);

      // shipping JSON
      const shipping: ShippingDetails = {
        mode: shipMode,
        fee_mad: shipMode === "fees" ? (shipFee ? Number(shipFee) : 0) : null,
        free_over_mad: shipFreeOver ? Number(shipFreeOver) : null,
        estimate_days_min: estDaysMin ? Number(estDaysMin) : null,
        estimate_days_max: estDaysMax ? Number(estDaysMax) : null,
        cod: shipCOD,
        pickup: shipPickup,
        tracking: shipTracking,
        notes: shipNotes.trim() || null,
      };

      // item_details JSON
      const item_details: ItemDetails = {
        type: itemType,
        width_cm: width ? Number(width) : null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        personalizable: personalization_enabled,
        ships_from: shipsFrom || city || null,
        ships_to: shipsTo
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        materials: materials
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        returns,
        shipping,
      };

      setSaving(true);

      const payload = {
        title: title.trim(),
        keywords: kw.length ? joinKeywordsForDB(kw) : null, // NEW
        description: description.trim() || null, // NEW
        price_mad: Math.round(base),
        city: city.trim() || null,
        active,
        photos,
        // promo
        promo_price_mad,
        promo_starts_at,
        promo_ends_at,
        // options
        options_config: groups,
        // personalization
        personalization_enabled,
        personalization_instructions,
        personalization_max_chars,
        // details
        item_details,
      };

      const { data, error } = await supabase
        .from("products")
        .update(payload)
        .eq("id", pid)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      toast.success("Product updated");
      if (data?.id) router.push(`/product/${data.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /* ---------------- Render ---------------- */
  if (!pid) return <main className="p-4">Invalid product</main>;
  if (loading) return <main className="p-4">Loading…</main>;

  return (
    <main className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit item</h1>
        <Link href={`/product/${pid}`} className="text-sm underline">
          View product
        </Link>
      </div>

      {/* Active toggle */}
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />
        Active (visible in shop & search)
      </label>

      {/* Photos */}
      <label className="block">
        <div className="text-sm mb-1">Photos</div>
        <input type="file" accept="image/*" multiple onChange={handleSelect} />
        {uploading && <div className="text-sm mt-1">Uploading…</div>}
      </label>

      {!!photos.length && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((src, i) => (
            <div key={src + i} className="relative rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-28 object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute top-1 right-1 rounded bg-black/60 text-white text-xs px-2 py-1"
                aria-label="Remove photo"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Title */}
      <label className="block">
        <div className="text-sm mb-1">Title</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, LIMITS.title))}
          className="w-full rounded border px-3 py-2"
          placeholder="Handmade clay cup"
          maxLength={LIMITS.title}
        />
        <div className="text-xs text-neutral-500 mt-1">
          {title.length}/{LIMITS.title}
        </div>
      </label>

      {/* Keywords */}
      <label className="block">
        <div className="text-sm mb-1">Keywords / Tags</div>
        <input
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="The Great Wave, Hokusai, Japanese Art, Poster"
        />
        <div className="text-xs text-neutral-500 mt-1">
          {keywordsCount}/{LIMITS.keywordMax} tags (each ≤ {LIMITS.keywordLen}{" "}
          chars)
        </div>
        <p className="text-xs text-neutral-500">
          Separate with commas — shown beneath the title on product page.
        </p>
      </label>

      {/* Description */}
      <label className="block">
        <div className="text-sm mb-1">Description</div>
        <textarea
          value={description}
          onChange={(e) =>
            setDescription(e.target.value.slice(0, LIMITS.description))
          }
          className="w-full rounded border px-3 py-2"
          placeholder="Write anything — new lines, emojis, etc. ✨"
          rows={5}
          maxLength={LIMITS.description}
        />
        <div className="text-xs text-neutral-500 mt-1">
          {description.length}/{LIMITS.description}
        </div>
      </label>

      {/* Price */}
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

      {/* City */}
      <label className="block">
        <div className="text-sm mb-1">
          City{" "}
          <span className="text-neutral-500">(used for search filters)</span>
        </div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value.slice(0, LIMITS.city))}
          className="w-full rounded border px-3 py-2"
          placeholder="Tetouan"
          maxLength={LIMITS.city}
        />
        <div className="text-xs text-neutral-500 mt-1">
          {city.length}/{LIMITS.city}
        </div>
      </label>

      {/* ——————————— Item Details ——————————— */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="text-sm font-medium">Item Details</div>

        <div>
          <div className="text-sm mb-1">Item type</div>
          <select
            value={itemType}
            onChange={(e) =>
              setItemType(e.target.value as "physical" | "digital")
            }
            className="w-full rounded border px-3 py-2"
          >
            <option value="physical">Physical item</option>
            <option value="digital">Digital download</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm mb-1">Width (cm)</div>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </label>
          <label className="block">
            <div className="text-sm mb-1">Height (cm)</div>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded border px-3 py-2"
            />
          </label>
        </div>

        <label className="block">
          <div className="text-sm mb-1">Weight (kg)</div>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />
        </label>

        {/* Ships from (buyer-facing) */}
        <label className="block">
          <div className="text-sm mb-1">
            Ships from{" "}
            <span className="text-neutral-500">(shown to buyers)</span>
          </div>
          <input
            value={shipsFrom}
            onChange={(e) =>
              setShipsFrom(e.target.value.slice(0, LIMITS.shipsFrom))
            }
            className="w-full rounded border px-3 py-2"
            placeholder="Casablanca"
            maxLength={LIMITS.shipsFrom}
          />
          <div className="text-xs text-neutral-500 mt-1">
            {shipsFrom.length}/{LIMITS.shipsFrom}
          </div>
        </label>

        {/* Ships to */}
        <label className="block">
          <div className="text-sm mb-1">Only ships to (comma separated)</div>
          <input
            value={shipsTo}
            onChange={(e) =>
              setShipsTo(e.target.value.slice(0, LIMITS.shipsTo))
            }
            className="w-full rounded border px-3 py-2"
            placeholder="Casablanca, Rabat, Marrakech"
            maxLength={LIMITS.shipsTo}
          />
          <div className="text-xs text-neutral-500 mt-1">
            {shipsTo.length}/{LIMITS.shipsTo}
          </div>
        </label>

        {/* Materials */}
        <label className="block">
          <div className="text-sm mb-1">Materials</div>
          <input
            value={materials}
            onChange={(e) =>
              setMaterials(e.target.value.slice(0, LIMITS.materials))
            }
            className="w-full rounded border px-3 py-2"
            placeholder="Wood, Bamboo, Plastics, Electronics"
            maxLength={LIMITS.materials}
          />
          <div className="text-xs text-neutral-500 mt-1">
            {materials.length}/{LIMITS.materials}
          </div>
        </label>

        {/* Returns */}
        <label className="block">
          <div className="text-sm mb-1">Returns & exchanges</div>
          <select
            value={returns}
            onChange={(e) =>
              setReturns(e.target.value as "accepted" | "not_accepted")
            }
            className="w-full rounded border px-3 py-2"
          >
            <option value="accepted">Accepted</option>
            <option value="not_accepted">Not accepted</option>
          </select>
        </label>
      </div>

      {/* ——————————— Shipping (simplified) ——————————— */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="text-sm font-medium">Shipping</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <div className="text-sm mb-1">Pricing</div>
            <select
              value={shipMode}
              onChange={(e) => setShipMode(e.target.value as "free" | "fees")}
              className="w-full rounded border px-3 py-2"
            >
              <option value="free">Free shipping</option>
              <option value="fees">+ Fees (flat)</option>
            </select>
          </label>

          {shipMode === "fees" && (
            <label className="block">
              <div className="text-sm mb-1">Flat fee (MAD)</div>
              <input
                type="number"
                min={0}
                value={shipFee}
                onChange={(e) => setShipFee(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder="e.g., 29"
              />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="block">
            <div className="text-sm mb-1">Free over (MAD)</div>
            <input
              type="number"
              min={0}
              value={shipFreeOver}
              onChange={(e) => setShipFreeOver(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="optional"
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">Estimate (min days)</div>
            <input
              type="number"
              min={0}
              value={estDaysMin}
              onChange={(e) => setEstDaysMin(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g., 3"
            />
          </label>

          <label className="block">
            <div className="text-sm mb-1">Estimate (max days)</div>
            <input
              type="number"
              min={0}
              value={estDaysMax}
              onChange={(e) => setEstDaysMax(e.target.value)}
              className="w-full rounded border px-3 py-2"
              placeholder="e.g., 7"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shipCOD}
              onChange={(e) => setShipCOD(e.target.checked)}
            />
            Cash on delivery (COD)
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shipPickup}
              onChange={(e) => setShipPickup(e.target.checked)}
            />
            Pickup available
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={shipTracking}
              onChange={(e) => setShipTracking(e.target.checked)}
            />
            Tracking provided
          </label>
        </div>

        <label className="block">
          <div className="text-sm mb-1">Shipping notes / policy (optional)</div>
          <textarea
            className="w-full rounded border px-3 py-2"
            value={shipNotes}
            onChange={(e) =>
              setShipNotes(e.target.value.slice(0, LIMITS.shipNotes))
            }
            rows={3}
            placeholder="Packaging care, cut-off time, carrier, etc."
            maxLength={LIMITS.shipNotes}
          />
          <div className="text-xs text-neutral-500 mt-1">
            {shipNotes.length}/{LIMITS.shipNotes}
          </div>
        </label>
      </div>

      {/* ——————————— Options Builder ——————————— */}
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
                maxLength={LIMITS.optionGroupName}
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
                    maxLength={LIMITS.optionValueLabel}
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

      {/* ——————————— Promo ——————————— */}
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
          If you set a promo price, both start and end are required.
        </p>
      </div>

      {/* ——————————— Personalization ——————————— */}
      <div className="rounded-xl border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Personalization</div>
        </div>

        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={persoEnabled}
            onChange={(e) => setPersoEnabled(e.target.checked)}
          />
          Enable
        </label>

        {persoEnabled && (
          <>
            <label className="block">
              <div className="text-sm mb-1">
                Buyer instructions (shown in sheet)
              </div>
              <textarea
                className="w-full rounded border px-3 py-2"
                value={persoInstr}
                onChange={(e) =>
                  setPersoInstr(e.target.value.slice(0, LIMITS.persoInstr))
                }
                placeholder="Tell the buyer what to write (e.g., 'Enter the name to engrave…')"
                rows={3}
                maxLength={LIMITS.persoInstr}
              />
              <div className="text-xs text-neutral-500 mt-1">
                {persoInstr.length}/{LIMITS.persoInstr}
              </div>
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
          </>
        )}
      </div>

      <div className="flex gap-8">
        <button
          onClick={handleSave}
          disabled={saving || uploading}
          className="flex-1 rounded-xl px-4 py-3 bg-black text-white font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <Link
          href={`/product/${pid}`}
          className="flex-1 text-center rounded-xl px-4 py-3 border font-medium"
        >
          Cancel
        </Link>
      </div>
    </main>
  );
}
