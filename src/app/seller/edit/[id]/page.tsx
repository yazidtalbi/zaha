// app/seller/edit/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { v4 as uuidv4 } from "uuid";

import {
  ChevronLeft,
  Trash2,
  MoveLeft,
  MoveRight,
  Play,
  Pencil,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CategorySheetPicker from "@/components/listing/CategorySheetPicker";
import EstimateDays from "@/components/EstimateDays";
import { ShippingPricingField } from "@/components/ShippingPricingField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ---------------- Types (same as create) ---------------- */
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
  keywords: string | null;
  description: string | null;
  price_mad: number;
  city: string | null;
  active: boolean;
  photos: string[];
  shop_id: string;
  shop_owner: string;

  promo_price_mad: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;

  options_config: OptionGroup[] | null;

  personalization_enabled: boolean | null;
  personalization_instructions: string | null;
  personalization_max_chars: number | null;

  item_details: ItemDetails | null;

  video_url: string | null;
  video_poster_url: string | null;
};

/* ---------------- Limits & helpers ---------------- */
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
const MAX_PHOTOS = 5;

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
function toISO(dtLocal: string): string | null {
  if (!dtLocal) return null;
  const ms = Date.parse(dtLocal.replace(" ", "T"));
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/* ---------------- Page ---------------- */
export default function EditProductPage() {
  const { id: productId } = useParams<{ id: string }>();
  const router = useRouter();

  /* ---------- Basics ---------- */
  const [title, setTitle] = useState("");
  const [keywordsInput, setKeywordsInput] = useState("");
  const [keywordsCount, setKeywordsCount] = useState(0);
  const [description, setDescription] = useState("");

  const [price, setPrice] = useState<string>("");
  const [city, setCity] = useState("");
  const [active, setActive] = useState<boolean>(true);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState<string>("");

  /* ---------- Media ---------- */
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPosterUrl, setVideoPosterUrl] = useState<string | null>(null);

  /* ---------- Promo ---------- */
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [promoPrice, setPromoPrice] = useState<string>("");
  const [promoStart, setPromoStart] = useState<string>("");
  const [promoEnd, setPromoEnd] = useState<string>("");

  /* ---------- Options ---------- */
  const [groups, setGroups] = useState<OptionGroup[]>([]);

  /* ---------- Personalization ---------- */
  const [persoEnabled, setPersoEnabled] = useState(false);
  const [persoInstr, setPersoInstr] = useState("");
  const [persoMax, setPersoMax] = useState<string>("");

  /* ---------- Item Details ---------- */
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

  const [shipMode, setShipMode] = useState<"free" | "fees">("free");
  const [shipFee, setShipFee] = useState<string>("");
  const [shipFreeOver, setShipFreeOver] = useState<string>("");
  const [estDaysMin, setEstDaysMin] = useState<string>("");
  const [estDaysMax, setEstDaysMax] = useState<string>("");
  const [shipCOD, setShipCOD] = useState(false);
  const [shipPickup, setShipPickup] = useState(false);
  const [shipTracking, setShipTracking] = useState(true);
  const [shipNotes, setShipNotes] = useState("");

  /* ---------- UI ---------- */
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  /* ---------- Load existing product (RLS-safe) ---------- */
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace(`/login?next=/seller/edit/${productId}`);
          return;
        }

        const { data: p, error: selErr } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .eq("shop_owner", user.id) // align with RLS
          .maybeSingle();

        if (selErr) console.error("products select error:", selErr);
        if (!p) {
          alert("Product not found or you don’t have access.");
          router.replace("/seller/products");
          return;
        }
        const prod = p as ProductRow;

        // basics
        setTitle(prod.title ?? "");
        setDescription(prod.description ?? "");
        setPrice(String(prod.price_mad ?? ""));
        setCity(prod.city ?? "");
        setActive(!!prod.active);

        // keywords
        setKeywordsInput(prod.keywords ?? "");
        setKeywordsCount(parseKeywords(prod.keywords ?? "").length);

        // media
        setPhotos(Array.isArray(prod.photos) ? prod.photos : []);
        setVideoUrl(prod.video_url ?? null);
        setVideoPosterUrl(prod.video_poster_url ?? null);

        // promo
        const promoOn =
          !!prod.promo_price_mad ||
          !!prod.promo_starts_at ||
          !!prod.promo_ends_at;
        setPromoEnabled(promoOn);
        setPromoPrice(prod.promo_price_mad ? String(prod.promo_price_mad) : "");
        setPromoStart(
          prod.promo_starts_at
            ? new Date(prod.promo_starts_at).toISOString().slice(0, 16)
            : ""
        );
        setPromoEnd(
          prod.promo_ends_at
            ? new Date(prod.promo_ends_at).toISOString().slice(0, 16)
            : ""
        );

        // options
        setGroups(prod.options_config ?? []);

        // personalization
        setPersoEnabled(!!prod.personalization_enabled);
        setPersoInstr(prod.personalization_instructions ?? "");
        setPersoMax(
          prod.personalization_max_chars
            ? String(prod.personalization_max_chars)
            : ""
        );

        // details + shipping
        const d = prod.item_details ?? null;
        if (d) {
          setItemType(d.type ?? "physical");
          setWidth(d.width_cm != null ? String(d.width_cm) : "");
          setHeight(d.height_cm != null ? String(d.height_cm) : "");
          setWeight(d.weight_kg != null ? String(d.weight_kg) : "");
          setShipsFrom(d.ships_from ?? "");
          setShipsTo((d.ships_to ?? []).join(", "));
          setMaterials((d.materials ?? []).join(", "));
          setReturns(d.returns ?? "not_accepted");

          const s = d.shipping ?? null;
          if (s) {
            setShipMode(s.mode ?? "free");
            setShipFee(s.fee_mad != null ? String(s.fee_mad) : "");
            setShipFreeOver(
              s.free_over_mad != null ? String(s.free_over_mad) : ""
            );
            setEstDaysMin(
              s.estimate_days_min != null ? String(s.estimate_days_min) : ""
            );
            setEstDaysMax(
              s.estimate_days_max != null ? String(s.estimate_days_max) : ""
            );
            setShipCOD(!!s.cod);
            setShipPickup(!!s.pickup);
            setShipTracking(!!s.tracking);
            setShipNotes(s.notes ?? "");
          }
        }

        // primary category
        const { data: pc, error: pcErr } = await supabase
          .from("product_categories")
          .select("category_id")
          .eq("product_id", productId)
          .eq("is_primary", true)
          .maybeSingle();
        if (pcErr) console.error("product_categories error:", pcErr);
        if (pc?.category_id) setCategoryId(pc.category_id);

        setLoaded(true);
      } catch (e) {
        console.error("Edit load fatal error:", e);
        alert("Couldn’t load this product.");
        router.replace("/seller/products");
      }
    })();
  }, [productId, router]);

  /* ---------- Live keyword normalization ---------- */
  useEffect(() => {
    const ks = parseKeywords(keywordsInput);
    setKeywordsCount(ks.length);
    const normalized = joinKeywordsForDB(ks);
    const currentTokens = keywordsInput.split(",").filter(Boolean).length;
    if (currentTokens > LIMITS.keywordMax || keywordsInput.length > 400) {
      setKeywordsInput(normalized);
    }
  }, [keywordsInput]);

  /* ---------- Options CRUD ---------- */
  function addGroup() {
    setGroups((gs) => [
      ...gs,
      {
        id: uuidv4(),
        name: "Size",
        required: true,
        values: [{ id: uuidv4(), label: "S", price_delta_mad: 0 }],
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
                { id: uuidv4(), label: "New option", price_delta_mad: 0 },
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

  /* ---------- Save (UPDATE) ---------- */
  async function handleSave() {
    try {
      const base = Number(price);

      if (!title.trim()) throw new Error("Title is required");
      if (title.trim().length > LIMITS.title)
        throw new Error(`Title must be ≤ ${LIMITS.title} characters`);
      if (!Number.isFinite(base) || base <= 0)
        throw new Error("Enter a valid price");
      if (!photos.length) throw new Error("Add at least one photo");
      if (!categoryId) throw new Error("Please select a category.");

      const kw = parseKeywords(keywordsInput);
      if (kw.length > LIMITS.keywordMax)
        throw new Error(`Use at most ${LIMITS.keywordMax} keywords`);

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
          ) {
            throw new Error(`Invalid price delta in "${g.name}"`);
          }
        }
      }

      // promo
      let promo_price_mad: number | null = null;
      let promo_starts_at: string | null = null;
      let promo_ends_at: string | null = null;

      if (promoEnabled) {
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

      const personalization_enabled = !!persoEnabled;
      let personalization_instructions: string | null = null;
      let personalization_max_chars: number | null = null;

      if (personalization_enabled) {
        const max = Number(persoMax);
        if (!Number.isFinite(max) || max <= 0)
          throw new Error("Enter a valid max characters for personalization");
        if (!persoInstr.trim())
          throw new Error("Add buyer instructions for personalization");
        if (persoInstr.length > LIMITS.persoInstr)
          throw new Error(
            `Personalization instructions must be ≤ ${LIMITS.persoInstr} chars`
          );
        personalization_instructions = persoInstr.trim();
        personalization_max_chars = Math.round(max);
      }

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

      const shipping: ShippingDetails = {
        mode: shipMode,
        fee_mad: shipMode === "fees" ? (shipFee ? Number(shipFee) : 0) : null,
        free_over_mad: shipFreeOver ? Number(shipFreeOver) : null,
        estimate_days_min: estDaysMin !== "" ? Number(estDaysMin) : null,
        estimate_days_max: estDaysMax !== "" ? Number(estDaysMax) : null,
        cod: shipCOD,
        pickup: shipPickup,
        tracking: shipTracking,
        notes: shipNotes.trim() || null,
      };

      const item_details: ItemDetails = {
        type: itemType,
        width_cm: width !== "" ? Number(width) : null,
        height_cm: height !== "" ? Number(height) : null,
        weight_kg: weight !== "" ? Number(weight) : null,
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

      // Ensure owner (align with RLS)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // UPDATE products
      const { error: updErr } = await supabase
        .from("products")
        .update({
          title: title.trim(),
          keywords: kw.length ? joinKeywordsForDB(kw) : null,
          description: description.trim() || null,
          price_mad: Math.round(Number(price)),
          city: city.trim() || null,
          active: active,
          photos,
          promo_price_mad,
          promo_starts_at,
          promo_ends_at,
          options_config: groups,
          personalization_enabled,
          personalization_instructions,
          personalization_max_chars,
          item_details,
          video_url: videoUrl ?? null,
          video_poster_url: videoPosterUrl ?? null,
        })
        .eq("id", productId)
        .eq("shop_owner", user.id);

      if (updErr) throw updErr;

      // Upsert primary category mapping
      if (categoryId) {
        const { error: catErr } = await supabase
          .from("product_categories")
          .upsert(
            [
              {
                product_id: productId,
                category_id: categoryId,
                is_primary: true,
              },
            ],
            { onConflict: "product_id,category_id" }
          );
        if (catErr) throw catErr;
      }

      alert("Changes saved.");
      router.push(`/product/${productId}`);
    } catch (err) {
      console.error(err);
      alert((err as Error).message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Photo helpers ---------- */
  function removePhoto(i: number) {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (!loaded) {
    return (
      <main className="min-h-[100dvh] grid place-items-center">
        <div className="text-sm text-neutral-600">Loading…</div>
      </main>
    );
  }

  return (
    <main
      className="min-h-[100dvh] flex flex-col bg-white text-ink overflow-hidden
                 [--h-header:56px] [--h-footer:80px]"
    >
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white h-[var(--h-header)] border-b">
        <div className="mx-auto max-w-2xl h-full flex items-center justify-between px-2">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-neutral-100"
            aria-label="Back"
          >
            <ChevronLeft size={26} strokeWidth={2.5} />
          </button>

          <div className="text-sm font-medium">Edit product</div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">Active</span>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto
                   pt-[var(--h-header)]
                   pb-[calc(var(--h-footer)+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto w-full max-w-2xl px-4 py-6">
          <Accordion
            type="multiple"
            defaultValue={["media", "basics"]}
            className="space-y-3"
          >
            {/* MEDIA */}
            <AccordionItem
              value="media"
              className="rounded-xl border bg-white px-4"
            >
              <AccordionTrigger className="py-4 text-base font-medium">
                Photos & Video
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Photos</div>
                  <div className="text-xs text-neutral-600">
                    {photos.length}/{MAX_PHOTOS}
                  </div>
                </div>

                {!!photos.length && (
                  <div className="grid grid-cols-3 gap-3">
                    {photos.map((src, i) => (
                      <div
                        key={src + i}
                        className="relative rounded-xl overflow-hidden border bg-white group"
                        draggable
                        onDragStart={() => setDragFrom(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragFrom === null || dragFrom === i) return;
                          setPhotos((prev) => {
                            const copy = [...prev];
                            const [m] = copy.splice(dragFrom, 1);
                            copy.splice(i, 0, m);
                            return copy;
                          });
                          setDragFrom(null);
                        }}
                        title="Drag to reorder"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className="w-full h-32 object-cover"
                        />

                        {i === 0 && (
                          <div className="absolute left-1 top-1 rounded-md bg-ink text-white text-[10px] px-1.5 py-0.5">
                            Cover
                          </div>
                        )}

                        {i !== 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setPhotos((prev) => {
                                const copy = [...prev];
                                const [m] = copy.splice(i, 1);
                                copy.unshift(m);
                                return copy;
                              })
                            }
                            className="absolute right-1 top-1 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] shadow-sm opacity-0 group-hover:opacity-100 transition"
                          >
                            Make cover
                          </button>
                        )}

                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs"
                              onClick={() =>
                                i > 0 &&
                                setPhotos((prev) => {
                                  const copy = [...prev];
                                  const [m] = copy.splice(i, 1);
                                  copy.splice(i - 1, 0, m);
                                  return copy;
                                })
                              }
                              aria-label="Move left"
                            >
                              <MoveLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs"
                              onClick={() =>
                                i < photos.length - 1 &&
                                setPhotos((prev) => {
                                  const copy = [...prev];
                                  const [m] = copy.splice(i, 1);
                                  copy.splice(i + 1, 0, m);
                                  return copy;
                                })
                              }
                              aria-label="Move right"
                            >
                              <MoveRight className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="rounded-md bg-white/90 px-1.5 py-0.5 text-xs"
                            aria-label="Remove photo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Video preview (display-only) */}
                <div className="rounded-xl border bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Video (optional)</div>
                    <div className="text-xs text-neutral-600">Preview</div>
                  </div>
                  {!videoUrl ? (
                    <p className="text-xs text-neutral-600 mt-2">
                      No video attached to this listing.
                    </p>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border bg-white w-36 mt-2">
                      <div className="w-full aspect-[9/12] overflow-hidden">
                        <img
                          src={videoPosterUrl || "/placeholder.svg"}
                          alt="Video poster"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 grid place-items-center pointer-events-none">
                        <div className="rounded-full bg-black/70 p-1.5">
                          <Play className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* BASICS */}
            <AccordionItem
              value="basics"
              className="rounded-xl border bg-white px-4"
            >
              <AccordionTrigger className="py-4 text-base font-medium">
                Basics
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <label htmlFor="title" className="block text-sm">
                  Title
                  <input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                    maxLength={LIMITS.title}
                  />
                </label>

                <label className="block">
                  <div className="text-sm mb-1">Category</div>
                  <CategorySheetPicker
                    title={title}
                    value={categoryId}
                    onChange={(id, path) => {
                      setCategoryId(id);
                      setCategoryPath(path);
                    }}
                  />
                </label>

                <label className="block">
                  <div className="text-sm mb-1">Base Price (MAD)</div>
                  <input
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                    inputMode="numeric"
                  />
                </label>

                <label className="block">
                  <div className="text-sm mb-1">Keywords / Tags</div>
                  <input
                    value={keywordsInput}
                    onChange={(e) => setKeywordsInput(e.target.value)}
                    className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                    placeholder="The Great Wave, Hokusai, Japanese Art, Poster"
                  />
                  <div className="text-xs text-neutral-500 mt-1">
                    {keywordsCount}/{LIMITS.keywordMax} tags (each ≤{" "}
                    {LIMITS.keywordLen} chars)
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="text-neutral-500">Category</div>
                  <div className="text-right">{categoryPath || "—"}</div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* DETAILS */}
            <AccordionItem
              value="details"
              className="rounded-xl border bg-white px-4"
            >
              <AccordionTrigger className="py-4 text-base font-medium">
                Details
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-6">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value.slice(0, LIMITS.description)
                      )
                    }
                    placeholder="Describe the item. Materials, story, process…"
                    rows={5}
                    className="rounded-lg shadow-none"
                  />
                  <div className="text-xs text-neutral-500 text-right">
                    {description.length}/{LIMITS.description}
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-4 bg-white">
                  <div className="text-sm font-medium">Item Details</div>

                  <div className="space-y-1">
                    <Label>Item type</Label>
                    <select
                      value={itemType}
                      onChange={(e) =>
                        setItemType(e.target.value as "physical" | "digital")
                      }
                      className="w-full rounded-lg border px-3 py-3 bg-white"
                    >
                      <option value="physical">Physical item</option>
                      <option value="digital">Digital download</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Width (cm)</Label>
                      <Input
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        type="number"
                        className="rounded-lg shadow-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Height (cm)</Label>
                      <Input
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        type="number"
                        className="rounded-lg shadow-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Weight (kg)</Label>
                    <Input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      type="number"
                      className="rounded-lg shadow-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>
                      Ships from{" "}
                      <span className="text-neutral-500">
                        (shown to buyers)
                      </span>
                    </Label>
                    <Input
                      value={shipsFrom}
                      onChange={(e) =>
                        setShipsFrom(e.target.value.slice(0, LIMITS.shipsFrom))
                      }
                      placeholder="Casablanca"
                      className="rounded-lg shadow-none"
                    />
                    <div className="text-xs text-neutral-500 text-right">
                      {shipsFrom.length}/{LIMITS.shipsFrom}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Only ships to (comma separated)</Label>
                    <Input
                      value={shipsTo}
                      onChange={(e) =>
                        setShipsTo(e.target.value.slice(0, LIMITS.shipsTo))
                      }
                      placeholder="Casablanca, Rabat, Marrakech"
                      className="rounded-lg shadow-none"
                    />
                    <div className="text-xs text-neutral-500 text-right">
                      {shipsTo.length}/{LIMITS.shipsTo}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Materials</Label>
                    <Input
                      value={materials}
                      onChange={(e) =>
                        setMaterials(e.target.value.slice(0, LIMITS.materials))
                      }
                      placeholder="Wood, Bamboo, Cotton"
                      className="rounded-lg shadow-none"
                    />
                    <div className="text-xs text-neutral-500 text-right">
                      {materials.length}/{LIMITS.materials}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Returns & exchanges</Label>
                    <select
                      value={returns}
                      onChange={(e) =>
                        setReturns(
                          e.target.value as "accepted" | "not_accepted"
                        )
                      }
                      className="w-full rounded-lg border px-3 py-3 bg-white"
                    >
                      <option value="accepted">Accepted</option>
                      <option value="not_accepted">Not accepted</option>
                    </select>
                  </div>
                </div>

                {/* Shipping */}
                <div className="border rounded-lg p-4 space-y-4 bg-white">
                  <div className="text-sm font-medium">Shipping</div>

                  <ShippingPricingField
                    value={shipMode}
                    onChange={setShipMode}
                  />

                  {shipMode === "fees" && (
                    <div className="space-y-1">
                      <Label>Flat fee (MAD)</Label>
                      <Input
                        value={shipFee}
                        onChange={(e) => setShipFee(e.target.value)}
                        type="number"
                        className="rounded-lg shadow-none"
                        placeholder="e.g., 29"
                      />
                    </div>
                  )}

                  {shipMode === "free" && (
                    <div className="space-y-1">
                      <Label>Free over (MAD)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={shipFreeOver}
                        onChange={(e) => setShipFreeOver(e.target.value)}
                        className="rounded-lg shadow-none"
                        placeholder="optional"
                        inputMode="numeric"
                      />
                    </div>
                  )}

                  <EstimateDays
                    min={0}
                    max={60}
                    valueMin={Number(estDaysMin || 0)}
                    valueMax={Number(estDaysMax || 0)}
                    onChange={({ min, max }) => {
                      setEstDaysMin(String(min));
                      setEstDaysMax(String(max));
                    }}
                  />

                  <div className="grid gap-3 text-sm">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cod">Cash on delivery (COD)</Label>
                      <Switch
                        id="cod"
                        checked={shipCOD}
                        onCheckedChange={setShipCOD}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pickup">Pickup available</Label>
                      <Switch
                        id="pickup"
                        checked={shipPickup}
                        onCheckedChange={setShipPickup}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tracking">Tracking provided</Label>
                      <Switch
                        id="tracking"
                        checked={shipTracking}
                        onCheckedChange={setShipTracking}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Shipping notes (optional)</Label>
                    <Textarea
                      value={shipNotes}
                      onChange={(e) =>
                        setShipNotes(e.target.value.slice(0, LIMITS.shipNotes))
                      }
                      rows={3}
                      className="rounded-lg shadow-none"
                    />
                    <div className="text-xs text-neutral-500 text-right">
                      {shipNotes.length}/{LIMITS.shipNotes}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* OPTIONS */}
            <AccordionItem
              value="options"
              className="rounded-xl border bg-white px-4"
            >
              <AccordionTrigger className="py-4 text-base font-medium">
                Options (custom dropdowns)
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-neutral-700">
                    Add groups like <b>Size</b> or <b>Fabric Color</b>.
                  </div>
                  <Button
                    type="button"
                    onClick={addGroup}
                    className="rounded-lg bg-black text-white hover:bg-black/90"
                    size="sm"
                  >
                    + Add group
                  </Button>
                </div>

                {!groups.length && (
                  <p className="text-sm text-neutral-600">
                    No option groups yet.
                  </p>
                )}

                {groups.map((g, gi) => (
                  <div key={g.id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-neutral-700">
                        Option {gi + 1}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeGroup(g.id)}
                        className="rounded-lg h-10 w-10"
                        aria-label="Remove group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Group name</Label>
                      <Input
                        value={g.name}
                        onChange={(e) => setGroupName(g.id, e.target.value)}
                        className="rounded-lg"
                        placeholder="e.g., Size"
                        maxLength={LIMITS.optionGroupName}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Label htmlFor={`req-${g.id}`} className="text-sm">
                        Required
                      </Label>
                      <Switch
                        id={`req-${g.id}`}
                        checked={g.required ?? true}
                        onCheckedChange={() => toggleRequired(g.id)}
                      />
                    </div>

                    {/* Header */}
                    <div className="grid grid-cols-5 gap-2 text-[13px] text-neutral-500 mb-1">
                      <div className="col-span-3">Name</div>
                      <div className="col-span-1">Added price</div>
                      <div className="col-span-1" />
                    </div>

                    <div className="space-y-2">
                      {g.values.map((v) => (
                        <div
                          key={v.id}
                          className="grid grid-cols-5 gap-2 items-center"
                        >
                          <Input
                            className="col-span-3 rounded-lg h-10"
                            value={v.label}
                            onChange={(e) =>
                              updateValue(g.id, v.id, { label: e.target.value })
                            }
                            placeholder="Option label (e.g., M - Hoodie)"
                            maxLength={LIMITS.optionValueLabel}
                          />
                          <Input
                            type="number"
                            inputMode="numeric"
                            className="col-span-1 rounded-lg h-10"
                            value={String(v.price_delta_mad ?? 0)}
                            onChange={(e) =>
                              updateValue(g.id, v.id, {
                                price_delta_mad: Number(e.target.value || 0),
                              })
                            }
                            placeholder="Δ"
                            title="Price delta relative to base price."
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeValue(g.id, v.id)}
                            className="col-span-1 rounded-lg bg-red-400 h-10 w-10"
                            aria-label="Remove value"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={() => addValue(g.id)}
                      size="sm"
                      className="rounded-lg bg-neutral-100 text-neutral-900 hover:bg-neutral-200"
                      variant="secondary"
                    >
                      + Add value
                    </Button>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* PERSONALIZATION */}
            <AccordionItem
              value="personalization"
              className="rounded-xl border bg-white px-4"
            >
              <AccordionTrigger className="py-4 text-base font-medium">
                Personalization
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Enable</div>
                  <Switch
                    id="perso-switch"
                    checked={persoEnabled}
                    onCheckedChange={setPersoEnabled}
                  />
                </div>

                {persoEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Buyer instructions</Label>
                      <Textarea
                        className="rounded-lg shadow-none"
                        value={persoInstr}
                        onChange={(e) =>
                          setPersoInstr(
                            e.target.value.slice(0, LIMITS.persoInstr)
                          )
                        }
                        placeholder="Tell the buyer what to write (e.g., 'Enter the name to engrave…')"
                        rows={3}
                        maxLength={LIMITS.persoInstr}
                      />
                      <div className="text-xs text-neutral-500">
                        {persoInstr.length}/{LIMITS.persoInstr}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Max characters</Label>
                      <Input
                        type="number"
                        min={1}
                        className="rounded-lg"
                        value={persoMax}
                        onChange={(e) => setPersoMax(e.target.value)}
                        inputMode="numeric"
                        placeholder="e.g., 80"
                      />
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* PROMO */}
            <AccordionItem
              value="promo"
              className="rounded-xl border bg-white px-4"
            >
              <AccordionTrigger className="py-4 text-base font-medium">
                Promo
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Enable promo</div>
                  <Switch
                    id="promo-switch"
                    checked={promoEnabled}
                    onCheckedChange={setPromoEnabled}
                  />
                </div>

                {promoEnabled && (
                  <>
                    <label className="block">
                      <div className="text-sm mb-1">Promo Price (MAD)</div>
                      <input
                        type="number"
                        min={0}
                        value={promoPrice}
                        onChange={(e) => setPromoPrice(e.target.value)}
                        className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
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
                          className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                        />
                      </label>

                      <label className="block">
                        <div className="text-sm mb-1">Promo ends</div>
                        <input
                          type="datetime-local"
                          value={promoEnd}
                          onChange={(e) => setPromoEnd(e.target.value)}
                          className="w-full rounded-lg shadow-none border px-3 py-3 bg-white"
                        />
                      </label>
                    </div>
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Bottom sticky actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t h-[var(--h-footer)]">
        <div className="mx-auto max-w-2xl px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-full bg-black text-white py-3 text-center font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </main>
  );
}
