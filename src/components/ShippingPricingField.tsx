"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Truck, Coins, Check } from "lucide-react";

type ShipMode = "free" | "fees";

export function ShippingPricingField({
  value,
  onChange,
}: {
  value: ShipMode;
  onChange: (v: ShipMode) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Pricing</div>

      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as ShipMode)}
        className="space-y-3"
      >
        {/* Free shipping */}
        <label
          htmlFor="ship-free"
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
            value === "free" ? "border-black" : "border-neutral-200"
          }`}
        >
          {/* Visually hidden actual radio for a11y */}
          <RadioGroupItem id="ship-free" value="free" className="sr-only" />

          {/* Custom check control */}
          <span
            aria-hidden
            className={`mt-1 grid h-4 w-4 place-items-center rounded-full border ${
              value === "free" ? "border-black" : "border-neutral-400"
            }`}
          >
            {value === "free" && <Check className="h-2 w-2" strokeWidth={4} />}
          </span>

          <div className="flex items-start gap-3">
            {/* <div className="rounded-lg border p-2">
              <Truck className="h-5 w-5" />
            </div> */}
            <div>
              <div className="text-[15px] font-medium">Free shipping</div>
              <div className="text-sm text-neutral-600">
                Buyers pay nothing for delivery.
              </div>
            </div>
          </div>
        </label>

        {/* Flat fees */}
        <label
          htmlFor="ship-fees"
          className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
            value === "fees" ? "border-black" : "border-neutral-200"
          }`}
        >
          {/* Visually hidden actual radio for a11y */}
          <RadioGroupItem id="ship-fees" value="fees" className="sr-only" />

          {/* Custom check control */}
          <span
            aria-hidden
            className={`mt-1 grid h-4 w-4 place-items-center rounded-full border ${
              value === "fees" ? "border-black" : "border-neutral-400"
            }`}
          >
            {value === "fees" && <Check className="h-2 w-2" strokeWidth={4} />}
          </span>

          <div className="flex items-start gap-3">
            {/* <div className="rounded-lg border p-2">
              <Coins className="h-5 w-5" />
            </div> */}
            <div>
              <div className="text-[15px] font-medium">+ Fees (flat)</div>
              <div className="text-sm text-neutral-600">
                Charge a single, flat delivery fee.
              </div>
            </div>
          </div>
        </label>
      </RadioGroup>
    </div>
  );
}
