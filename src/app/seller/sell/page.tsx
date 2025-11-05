// app/sell/page.tsx
"use client";

import React, { memo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { uploadCompressedToSupabase } from "@/lib/compressAndUpload";
import { Switch } from "@/components/ui/switch";
import CategorySheetPicker from "@/components/listing/CategorySheetPicker";

/* ---------------- Helpers ---------------- */
function clsx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
function uid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}
function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, 40))
    .slice(0, 7);
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

/* ---------------- Types ---------------- */
type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type ShippingDetails = {
  mode: "free" | "fees";
  estimate_days_min: number | null;
  estimate_days_max: number | null;
  fee_mad: number | null;
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
  ships_from: string | null;
  ships_to: string[];
  materials: string[];
  returns: "accepted" | "not_accepted";
  shipping?: ShippingDetails | null;
};

/* ---------------- Constants ---------------- */
const MAX_PHOTOS = 5;
const LIMITS = {
  optionGroupName: 60,
  optionValueLabel: 60,
  persoInstr: 300,
};

/* ---------------- STEP COMPONENTS ---------------- */

const Step1Identity = memo(function Step1Identity({
  photos,
  uploading,
  onSelect,
  onRemove,
  title,
  setTitle,
  categoryId,
  categoryPath,
  onCategoryChange,
}: any) {
  return (
    <section className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          Photos <span className="text-red-500">*</span>
        </span>
      </label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={onSelect}
        disabled={photos.length >= MAX_PHOTOS}
        className="block text-sm"
      />
      {uploading && <div className="text-sm mt-1">Uploading...</div>}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {photos.map((src: string, i: number) => (
            <div key={src + i} className="relative rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="w-full h-28 object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 text-xs bg-black/70 text-white px-2 py-1 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium">
          Title <span className="text-red-500">*</span>
        </span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
          maxLength={100}
        />
      </label>

      <div>
        <span className="text-sm font-medium">
          Category <span className="text-red-500">*</span>
        </span>
        <CategorySheetPicker
          title={title}
          value={categoryId}
          onChange={onCategoryChange}
        />
        {categoryPath && (
          <div className="text-xs text-neutral-600 mt-1">
            Selected: {categoryPath}
          </div>
        )}
      </div>
    </section>
  );
});

const Step2Metadata = memo(function Step2Metadata({
  keywordsInput,
  setKeywordsInput,
  description,
  setDescription,
  city,
  setCity,
}: any) {
  return (
    <section className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Keywords</span>
        <input
          value={keywordsInput}
          onChange={(e) => setKeywordsInput(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
          placeholder="poster, handmade, gift"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
          rows={5}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">
          City <span className="text-red-500">*</span>
        </span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
          placeholder="Casablanca"
        />
      </label>
    </section>
  );
});

const Step3Pricing = memo(function Step3Pricing({
  price,
  setPrice,
  promoOn,
  setPromoOn,
  promoPrice,
  setPromoPrice,
  promoStart,
  setPromoStart,
  promoEnd,
  setPromoEnd,
}: any) {
  return (
    <section className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          Base Price (MAD) <span className="text-red-500">*</span>
        </span>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
          min={0}
        />
      </label>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Promo</span>
        <Switch checked={promoOn} onCheckedChange={setPromoOn} />
      </div>

      {promoOn && (
        <div className="space-y-3 pl-2 border-l">
          <label className="block">
            <span className="text-sm font-medium">Promo Price (MAD)</span>
            <input
              type="number"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Start</span>
            <input
              type="datetime-local"
              value={promoStart}
              onChange={(e) => setPromoStart(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 bg-white"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">End</span>
            <input
              type="datetime-local"
              value={promoEnd}
              onChange={(e) => setPromoEnd(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 bg-white"
            />
          </label>
        </div>
      )}
    </section>
  );
});

/* ---------------------------------------------
   STEP 4: Customization (Options + Personalization)
---------------------------------------------- */
type Step4CustomizationProps = {
  optionsOn: boolean;
  setOptionsOn: (v: boolean) => void;
  personalizationOn: boolean;
  setPersonalizationOn: (v: boolean) => void;

  groups: OptionGroup[];
  addGroup: () => void;
  removeGroup: (id: string) => void;
  setGroupName: (id: string, name: string) => void;
  toggleRequired: (id: string) => void;
  addValue: (groupId: string) => void;
  removeValue: (groupId: string, valueId: string) => void;
  updateValue: (
    groupId: string,
    valueId: string,
    patch: Partial<OptionValue>
  ) => void;

  persoInstr: string;
  setPersoInstr: (v: string) => void;
  persoMax: string;
  setPersoMax: (v: string) => void;
};

const Step4Customization = memo(function Step4Customization({
  optionsOn,
  setOptionsOn,
  personalizationOn,
  setPersonalizationOn,
  groups,
  addGroup,
  removeGroup,
  setGroupName,
  toggleRequired,
  addValue,
  removeValue,
  updateValue,
  persoInstr,
  setPersoInstr,
  persoMax,
  setPersoMax,
}: Step4CustomizationProps) {
  return (
    <section className="space-y-6">
      {/* Options */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Options</div>
          <Switch checked={optionsOn} onCheckedChange={setOptionsOn} />
        </div>

        {optionsOn && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                Create dropdowns like <b>Size</b> or <b>Color</b>. Each value
                may change the price.
              </p>
              <button
                type="button"
                onClick={addGroup}
                className="text-sm rounded bg-black text-white px-3 py-1.5"
              >
                + Add option group
              </button>
            </div>

            {groups.length === 0 ? (
              <div className="text-sm text-neutral-500">No groups yet.</div>
            ) : (
              groups.map((g) => (
                <div key={g.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={g.name}
                      onChange={(e) =>
                        setGroupName(
                          g.id,
                          e.target.value.slice(0, LIMITS.optionGroupName)
                        )
                      }
                      className="flex-1 rounded border px-3 py-2 bg-white"
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
                      <div
                        key={v.id}
                        className="grid grid-cols-5 gap-2 items-center"
                      >
                        <input
                          className="col-span-3 rounded border px-3 py-2 bg-white"
                          value={v.label}
                          onChange={(e) =>
                            updateValue(g.id, v.id, {
                              label: e.target.value.slice(
                                0,
                                LIMITS.optionValueLabel
                              ),
                            })
                          }
                          placeholder="Option label (e.g., M - Hoodie)"
                          maxLength={LIMITS.optionValueLabel}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          className="col-span-1 rounded border px-3 py-2 bg-white"
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
              ))
            )}
          </div>
        )}
      </div>

      {/* Personalization */}
      <div className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Personalization</div>
          <Switch
            checked={personalizationOn}
            onCheckedChange={setPersonalizationOn}
          />
        </div>

        {personalizationOn && (
          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="text-sm mb-1">
                Buyer instructions (shown in sheet)
              </div>
              <textarea
                className="w-full rounded border px-3 py-2 bg-white"
                value={persoInstr}
                onChange={(e) =>
                  setPersoInstr(e.target.value.slice(0, LIMITS.persoInstr))
                }
                placeholder={`Tell the buyer what to write (e.g., "Enter the name to engrave…")`}
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
                className="w-full rounded border px-3 py-2 bg-white"
                value={persoMax}
                onChange={(e) => setPersoMax(e.target.value)}
                inputMode="numeric"
                placeholder="e.g., 80"
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
});

const Step5Details = memo(function Step5Details({
  itemType,
  setItemType,
  width,
  setWidth,
  height,
  setHeight,
  weight,
  setWeight,
  shipsFrom,
  setShipsFrom,
  shipsTo,
  setShipsTo,
  materials,
  setMaterials,
  returns,
  setReturns,
}: any) {
  return (
    <section className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Item Type</span>
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
        >
          <option value="physical">Physical</option>
          <option value="digital">Digital</option>
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <input
          placeholder="Width (cm)"
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          placeholder="Height (cm)"
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          placeholder="Weight (kg)"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>
      <input
        placeholder="Ships from"
        value={shipsFrom}
        onChange={(e) => setShipsFrom(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />
      <input
        placeholder="Ships to (comma separated)"
        value={shipsTo}
        onChange={(e) => setShipsTo(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />
      <input
        placeholder="Materials"
        value={materials}
        onChange={(e) => setMaterials(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      />
      <label className="block">
        <span className="text-sm font-medium">Returns</span>
        <select
          value={returns}
          onChange={(e) => setReturns(e.target.value)}
          className="mt-1 w-full border rounded px-3 py-2 bg-white"
        >
          <option value="accepted">Accepted</option>
          <option value="not_accepted">Not accepted</option>
        </select>
      </label>
    </section>
  );
});

const Step6Shipping = memo(function Step6Shipping({
  shipMode,
  setShipMode,
  shipFee,
  setShipFee,
  estDaysMin,
  setEstDaysMin,
  estDaysMax,
  setEstDaysMax,
  shipCOD,
  setShipCOD,
  shipPickup,
  setShipPickup,
  shipTracking,
  setShipTracking,
  shipNotes,
  setShipNotes,
}: any) {
  return (
    <section className="space-y-4">
      <select
        value={shipMode}
        onChange={(e) => setShipMode(e.target.value)}
        className="border rounded px-3 py-2 w-full"
      >
        <option value="free">Free shipping</option>
        <option value="fees">Shipping with fees</option>
      </select>

      {shipMode === "fees" && (
        <input
          type="number"
          placeholder="Fee (MAD)"
          value={shipFee}
          onChange={(e) => setShipFee(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <input
          placeholder="Min days"
          type="number"
          value={estDaysMin}
          onChange={(e) => setEstDaysMin(e.target.value)}
          className="border rounded px-3 py-2"
        />
        <input
          placeholder="Max days"
          type="number"
          value={estDaysMax}
          onChange={(e) => setEstDaysMax(e.target.value)}
          className="border rounded px-3 py-2"
        />
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shipCOD}
            onChange={(e) => setShipCOD(e.target.checked)}
          />
          COD
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shipPickup}
            onChange={(e) => setShipPickup(e.target.checked)}
          />
          Pickup
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={shipTracking}
            onChange={(e) => setShipTracking(e.target.checked)}
          />
          Tracking
        </label>
      </div>

      <textarea
        placeholder="Shipping notes"
        value={shipNotes}
        onChange={(e) => setShipNotes(e.target.value)}
        className="border rounded px-3 py-2 w-full"
        rows={3}
      />
    </section>
  );
});

const Step7Review = memo(function Step7Review({ all }: any) {
  return (
    <section className="space-y-4 text-sm">
      <div className="font-medium text-base">Review before publishing</div>
      <div className="grid gap-3">
        {all.photos.length > 0 && (
          <div>
            <div className="font-medium mb-1">Photos</div>
            <div className="grid grid-cols-3 gap-2">
              {all.photos.map((src: string, i: number) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="rounded-md object-cover w-full h-28"
                />
              ))}
            </div>
          </div>
        )}
        <div>
          <b>Title:</b> {all.title}
        </div>
        <div>
          <b>Category:</b> {all.categoryPath || "—"}
        </div>
        <div>
          <b>City:</b> {all.city}
        </div>
        <div>
          <b>Keywords:</b> {all.keywordsInput}
        </div>
        <div>
          <b>Description:</b> {all.description || "—"}
        </div>
        <div>
          <b>Base Price:</b> {all.price} MAD
        </div>
        {all.promoOn && (
          <div>
            <b>Promo:</b> {all.promoPrice} MAD ({all.promoStart} →{" "}
            {all.promoEnd})
          </div>
        )}
        <div>
          <b>Options Enabled:</b> {all.optionsOn ? "Yes" : "No"}
          {all.optionsOn && all.groups?.length > 0 && (
            <ul className="list-disc ml-5 mt-1">
              {all.groups.map((g: OptionGroup) => (
                <li key={g.id}>
                  <span className="font-medium">{g.name}</span> (
                  {g.required ? "required" : "optional"}):{" "}
                  {g.values.map((v) => v.label).join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <b>Personalization:</b> {all.personalizationOn ? "Yes" : "No"}
          {all.personalizationOn && (
            <div className="mt-1">
              <div>
                <b>Instructions:</b> {all.persoInstr || "—"}
              </div>
              <div>
                <b>Max chars:</b> {all.persoMax || "—"}
              </div>
            </div>
          )}
        </div>
        <div>
          <b>Item Type:</b> {all.itemType}
        </div>
        <div>
          <b>Ships From:</b> {all.shipsFrom}
        </div>
        <div>
          <b>Ships To:</b> {all.shipsTo}
        </div>
        <div>
          <b>Materials:</b> {all.materials}
        </div>
        <div>
          <b>Returns:</b> {all.returns}
        </div>
      </div>
    </section>
  );
});

function SegmentedStepperHeader({
  steps, // full steps array INCLUDING the "review" step
  current, // 0-based index (includes review)
  labels, // array of labels for the first 6 visual steps
  partial = 1, // fill of current pill
}: {
  steps: { key: string; label: string }[];
  current: number;
  labels: string[];
  partial?: number;
}) {
  const total = Math.max(1, steps.length - 1);
  const visualIdx = Math.min(current, total - 1);

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-2xl px-4 pt-3">
        <div className="text-sm text-neutral-700 mb-2">
          Step {visualIdx + 1} of {total} —{" "}
          {labels[visualIdx] ?? steps[visualIdx].label}
        </div>

        <div className="flex items-center gap-4">
          {Array.from({ length: total }).map((_, i) => {
            const past = i < visualIdx;
            const isCurrent = i === visualIdx;
            return (
              <div
                key={i}
                className="relative h-[6px] flex-1 rounded-full bg-neutral-200 overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-black transition-[width] duration-300"
                  style={{
                    width: past
                      ? "100%"
                      : isCurrent
                        ? `${Math.round(partial * 100)}%`
                        : "0%",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 border-b" />
    </div>
  );
}

/* ---------------- PAGE ---------------- */

export default function SellPage() {
  const router = useRouter();

  const steps = [
    { key: "identity", label: "Photos, Title, Category" },
    { key: "metadata", label: "Keywords, Description, City" },
    { key: "pricing", label: "Pricing" },
    { key: "custom", label: "Customization" },
    { key: "details", label: "Item Details" },
    { key: "shipping", label: "Shipping" },
    { key: "review", label: "Review" },
  ];

  const [current, setCurrent] = useState(0);
  const atFirst = current === 0;
  const atLast = current === steps.length - 1;

  /* --- State --- */
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryPath, setCategoryPath] = useState("");

  const [keywordsInput, setKeywordsInput] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");

  const [price, setPrice] = useState("");
  const [promoOn, setPromoOn] = useState(false);
  const [promoPrice, setPromoPrice] = useState("");
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");

  // Customization toggles
  const [optionsOn, setOptionsOn] = useState(false);
  const [personalizationOn, setPersonalizationOn] = useState(false);

  // Options builder state + CRUD
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

  // Personalization fields
  const [persoInstr, setPersoInstr] = useState("");
  const [persoMax, setPersoMax] = useState("");

  // Details
  const [itemType, setItemType] = useState("physical");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [shipsFrom, setShipsFrom] = useState("");
  const [shipsTo, setShipsTo] = useState("");
  const [materials, setMaterials] = useState("");
  const [returns, setReturns] = useState("accepted");

  // Shipping
  const [shipMode, setShipMode] = useState("free");
  const [shipFee, setShipFee] = useState("");
  const [estDaysMin, setEstDaysMin] = useState("");
  const [estDaysMax, setEstDaysMax] = useState("");
  const [shipCOD, setShipCOD] = useState(false);
  const [shipPickup, setShipPickup] = useState(false);
  const [shipTracking, setShipTracking] = useState(true);
  const [shipNotes, setShipNotes] = useState("");

  /* --- Handlers --- */
  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    if (photos.length >= MAX_PHOTOS) return alert("Max photos reached");

    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const urls = await Promise.all(
        picked
          .slice(0, MAX_PHOTOS - photos.length)
          .map((f) => uploadCompressedToSupabase(f, user.id, "products"))
      );
      setPhotos((p) => [...p, ...urls.filter(Boolean)]);
    } finally {
      setUploading(false);
    }
  };
  const removePhoto = (i: number) =>
    setPhotos((p) => p.filter((_, j) => j !== i));
  const onCategoryChange = (id: string | null, path: string) => {
    setCategoryId(id);
    setCategoryPath(path);
  };

  const goPrev = () => !atFirst && setCurrent((c) => c - 1);
  const goNext = () => !atLast && setCurrent((c) => c + 1);

  /* --- Rendering --- */
  const stepProps = {
    photos,
    uploading,
    onSelect: handleSelect,
    onRemove: removePhoto,
    title,
    setTitle,
    categoryId,
    categoryPath,
    onCategoryChange,
    keywordsInput,
    setKeywordsInput,
    description,
    setDescription,
    city,
    setCity,
    price,
    setPrice,
    promoOn,
    setPromoOn,
    promoPrice,
    setPromoPrice,
    promoStart,
    setPromoStart,
    promoEnd,
    setPromoEnd,
    optionsOn,
    setOptionsOn,
    personalizationOn,
    setPersonalizationOn,

    // Options builder
    groups,
    addGroup,
    removeGroup,
    setGroupName,
    toggleRequired,
    addValue,
    removeValue,
    updateValue,

    // Personalization
    persoInstr,
    setPersoInstr,
    persoMax,
    setPersoMax,

    // Details
    itemType,
    setItemType,
    width,
    setWidth,
    height,
    setHeight,
    weight,
    setWeight,
    shipsFrom,
    setShipsFrom,
    shipsTo,
    setShipsTo,
    materials,
    setMaterials,
    returns,
    setReturns,

    // Shipping
    shipMode,
    setShipMode,
    shipFee,
    setShipFee,
    estDaysMin,
    setEstDaysMin,
    estDaysMax,
    setEstDaysMax,
    shipCOD,
    setShipCOD,
    shipPickup,
    setShipPickup,
    shipTracking,
    setShipTracking,
    shipNotes,
    setShipNotes,
  };

  const all = { ...stepProps };

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-6">
      <SegmentedStepperHeader
        steps={steps}
        current={current}
        labels={[
          "Photos, Title, Category",
          "Keywords, Description, City",
          "Pricing",
          "Customization",
          "Item Details",
          "Shipping",
        ]}
      />

      {/* Step content */}
      {steps[current].key === "identity" && <Step1Identity {...stepProps} />}
      {steps[current].key === "metadata" && <Step2Metadata {...stepProps} />}
      {steps[current].key === "pricing" && <Step3Pricing {...stepProps} />}
      {steps[current].key === "custom" && <Step4Customization {...stepProps} />}
      {steps[current].key === "details" && <Step5Details {...stepProps} />}
      {steps[current].key === "shipping" && <Step6Shipping {...stepProps} />}
      {steps[current].key === "review" && <Step7Review all={all} />}

      {/* Nav buttons */}
      <div className="flex justify-between border-t pt-4">
        <button
          onClick={goPrev}
          disabled={atFirst}
          className="px-4 py-2 rounded border disabled:opacity-40"
        >
          Back
        </button>
        <button
          onClick={goNext}
          disabled={atLast}
          className="px-4 py-2 rounded bg-black text-white"
        >
          {atLast ? "Publish" : "Next"}
        </button>
      </div>
    </main>
  );
}
