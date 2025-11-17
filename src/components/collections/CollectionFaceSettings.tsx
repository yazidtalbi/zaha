// components/collections/CollectionFaceSettings.tsx
"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type Mode = "auto" | "manual";

type ProductForPicker = {
  id: string;
  title: string;
  thumbnail_url?: string | null;
};

type CollectionFaceValue = {
  mode: Mode;
  productIds: string[]; // up to 3 ids, in order
};

type Props = {
  products: ProductForPicker[]; // products belonging to this collection
  value: CollectionFaceValue;
  onChange: (value: CollectionFaceValue) => void;
};

const MAX_FEATURED = 3;

export function CollectionFaceSettings({ products, value, onChange }: Props) {
  const { mode, productIds } = value;
  const [search, setSearch] = React.useState("");

  const filteredProducts = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => p.title.toLowerCase().includes(term));
  }, [search, products]);

  const selectedProducts = React.useMemo(
    () =>
      productIds
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean) as ProductForPicker[],
    [productIds, products]
  );

  const isSelected = (id: string) => productIds.includes(id);

  const toggleProduct = (id: string) => {
    // remove if already selected
    if (productIds.includes(id)) {
      onChange({
        mode,
        productIds: productIds.filter((pid) => pid !== id),
      });
      return;
    }

    // add if under limit
    if (productIds.length >= MAX_FEATURED) return;

    onChange({
      mode,
      productIds: [...productIds, id],
    });
  };

  const handleModeChange = (nextMode: Mode) => {
    if (nextMode === mode) return;
    onChange({
      mode: nextMode,
      // keep selected ids in case they switch back later
      productIds,
    });
  };

  const removeSelected = (id: string) => {
    onChange({
      mode,
      productIds: productIds.filter((pid) => pid !== id),
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Collection face
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Choose how this collection card looks on Zaha.{" "}
            <span className="hidden sm:inline">
              In manual mode, the first product becomes the big image, followed
              by two smaller tiles.
            </span>
          </p>
        </div>

        <Badge
          variant="outline"
          className="rounded-full border-dashed px-2 py-0.5 text-[11px] font-normal text-neutral-500"
        >
          Optional
        </Badge>
      </div>

      {/* Mode toggle */}
      <RadioGroup
        value={mode}
        onValueChange={(val) => handleModeChange(val as Mode)}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <label
          className={cn(
            "group flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-xs transition",
            mode === "auto"
              ? "border-emerald-500 bg-emerald-50"
              : "border-neutral-200 hover:border-neutral-300"
          )}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="face-auto" value="auto" className="mt-px" />
            <div>
              <span className="text-[13px] font-medium text-neutral-900">
                Auto (recommended)
              </span>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Zaha picks up to 3 items based on popularity or recency so your
                collection always looks fresh.
              </p>
            </div>
          </div>
        </label>

        <label
          className={cn(
            "group flex cursor-pointer flex-col rounded-lg border px-3 py-2 text-xs transition",
            mode === "manual"
              ? "border-emerald-500 bg-emerald-50"
              : "border-neutral-200 hover:border-neutral-300"
          )}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem id="face-manual" value="manual" className="mt-px" />
            <div>
              <span className="text-[13px] font-medium text-neutral-900">
                Manual selection
              </span>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                Pick up to 3 products to showcase. First = main image, 2nd &amp;
                3rd = right tiles.
              </p>
            </div>
          </div>
        </label>
      </RadioGroup>

      {/* Manual picker UI */}
      {mode === "manual" && (
        <div className="space-y-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/70 p-3">
          {/* Selected preview */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-xs font-medium text-neutral-800">
                Featured products
              </Label>
              <p className="mt-1 text-[11px] text-neutral-500">
                {productIds.length}/{MAX_FEATURED} selected &middot; order
                matches the collection card layout.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {selectedProducts.length === 0 && (
                <span className="text-[11px] text-neutral-400">
                  No products selected yet.
                </span>
              )}

              {selectedProducts.map((product, idx) => (
                <span
                  key={product.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] shadow-sm"
                >
                  <span className="h-5 w-5 overflow-hidden rounded-full bg-neutral-100">
                    {product.thumbnail_url ? (
                      <Image
                        src={product.thumbnail_url}
                        alt={product.title}
                        width={20}
                        height={20}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </span>
                  <span className="max-w-[120px] truncate">
                    {idx === 0 ? "Main · " : ""}
                    {idx === 1 ? "Tile 2 · " : ""}
                    {idx === 2 ? "Tile 3 · " : ""}
                    {product.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelected(product.id)}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium text-neutral-800">
                Pick products from this collection
              </Label>
              <span className="text-[11px] text-neutral-500">
                Tap to add or remove
              </span>
            </div>
            <Input
              placeholder="Search in this collection…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Products list */}
          <div className="max-h-64 rounded-md border bg-white overflow-y-auto">
            <div className="divide-y divide-neutral-100">
              {filteredProducts.length === 0 && (
                <div className="px-3 py-6 text-center text-xs text-neutral-400">
                  No products match your search.
                </div>
              )}

              {filteredProducts.map((product) => {
                const selected = isSelected(product.id);
                const disabled = !selected && productIds.length >= MAX_FEATURED;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition",
                      selected ? "bg-emerald-50" : "hover:bg-neutral-50",
                      disabled && "cursor-not-allowed opacity-60"
                    )}
                    disabled={disabled}
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                      {product.thumbnail_url ? (
                        <Image
                          src={product.thumbnail_url}
                          alt={product.title}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-neutral-900">
                        {product.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-neutral-500">
                        {selected
                          ? `Selected · ${productIds.indexOf(product.id) + 1}`
                          : "Tap to feature on the card"}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium",
                        selected
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-neutral-300 bg-white text-neutral-400"
                      )}
                    >
                      {selected ? productIds.indexOf(product.id) + 1 : "+"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {productIds.length >= MAX_FEATURED && (
            <p className="text-[11px] text-emerald-700">
              You reached the limit of {MAX_FEATURED} products. Remove one to
              select another.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
