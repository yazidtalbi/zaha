"use client";

import * as React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { X, ChevronDown } from "lucide-react";

type OptionValue = { id: string; label: string; price_delta_mad?: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  values: OptionValue[];
};

type Props = {
  group: OptionGroup;
  valueId?: string;
  onChange: (id: string) => void;
};

export function OptionGroupField({ group, valueId, onChange }: Props) {
  const [open, setOpen] = React.useState(false);

  const values = group.values ?? [];
  const manyValues = values.length > 8;

  React.useEffect(() => {
    // default select first if nothing is chosen
    if (!valueId && values.length > 0) {
      onChange(values[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  const current = values.find((v) => v.id === valueId) ?? values[0];

  function renderPriceDelta(v: OptionValue) {
    const d = Number(v.price_delta_mad ?? 0);
    if (!d) return null;
    if (d > 0) return `+ MAD${d}`;
    return `- MAD${Math.abs(d)}`;
  }

  // ---- section-level delta label for the currently selected option ----
  const currentDelta = Number(current?.price_delta_mad ?? 0) || 0;
  const deltaLabel =
    currentDelta > 0
      ? `+ MAD ${currentDelta.toLocaleString("en-US")} to this item`
      : currentDelta < 0
        ? `Saves MAD ${Math.abs(currentDelta).toLocaleString("en-US")} on this item`
        : null;

  /* ---------- CASE 1: <= 8 values → pills directly in the section ---------- */
  if (!manyValues) {
    return (
      <div>
        <div className="relative rounded-2xl px-0">
          {/* SCROLL AREA */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pr-8">
            {values.map((v) => {
              const selected = v.id === current?.id;
              const base =
                "shrink-0 inline-flex items-center justify-center rounded-full px-3 h-9 min-w-9 text-xs sm:text-sm border transition whitespace-nowrap";
              const state = selected
                ? "bg-neutral-900 text-white font-medium"
                : "bg-white text-neutral-900 font-medium";

              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onChange(v.id)}
                  className={`${base} ${state}`}
                >
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          {/* RIGHT FADE HINT (kept commented as you had) */}
          {/* <div className="pointer-events-none absolute inset-y-1 right-0 w-10 bg-gradient-to-l from-neutral-50 to-transparent rounded-tr-2xl rounded-br-2xl" /> */}
        </div>

        {deltaLabel && (
          <div className="mt-2 text-xs text-neutral-500">{deltaLabel}</div>
        )}
      </div>
    );
  }

  /* ---------- CASE 2: many values → beautiful drawer selector ---------- */
  return (
    <>
      {/* trigger row + section-level delta */}
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border border-neutral-200 px-4 py-3 flex items-center justify-between bg-white"
        >
          <span className="text-sm font-medium text-neutral-900">
            {current ? current.label : "Select option"}
          </span>

          <ChevronDown className="h-4 w-4 text-neutral-500" />
        </button>

        {deltaLabel && (
          <div className="mt-2 text-xs text-neutral-500">{deltaLabel}</div>
        )}
      </div>

      {/* bottom drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-3xl border-none max-h-[80vh] overflow-hidden"
        >
          {/* handle + header */}
          <div className="pt-2 pb-3 border-b border-neutral-200">
            <div className="flex items-center justify-center">
              <div className="h-1.5 w-16 rounded-full bg-neutral-200" />
            </div>
            <div className="mt-3 flex items-center px-4">
              <div className="text-base font-semibold flex-1 truncate">
                {group.name}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 w-8 rounded-full border border-neutral-200 grid place-items-center"
              >
                <X className="h-4 w-4 text-neutral-600" />
              </button>
            </div>
          </div>

          {/* options list */}
          <div className="px-4 pb-6 pt-3 max-h-[60vh] overflow-y-auto">
            <div className="flex flex-col gap-2">
              {values.map((v) => {
                const selected = v.id === current?.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onChange(v.id);
                      setOpen(false);
                    }}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left flex items-center justify-between transition",
                      selected
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-900 border-neutral-200 hover:border-neutral-300",
                    ].join(" ")}
                  >
                    {/* Left text */}
                    <span className="text-sm font-medium">{v.label}</span>

                    {/* Right price */}
                    {v.price_delta_mad != null && v.price_delta_mad !== 0 && (
                      <span className="text-sm opacity-80">
                        {renderPriceDelta(v)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
