"use client";

import { useEffect, useState } from "react";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import { Input } from "@/components/ui/input";

type Props = {
  min?: number; // absolute min for the slider
  max?: number; // absolute max for the slider
  valueMin: number; // current min days
  valueMax: number; // current max days
  onChange: (v: { min: number; max: number }) => void;
};

export default function EstimateDays({
  min = 0,
  max = 60,
  valueMin,
  valueMax,
  onChange,
}: Props) {
  const [vals, setVals] = useState<[number, number]>([
    Math.max(min, Math.min(valueMin, valueMax)),
    Math.min(max, Math.max(valueMin, valueMax)),
  ]);

  // keep internal state in sync with parent
  useEffect(() => {
    setVals([
      Math.max(min, Math.min(valueMin, valueMax)),
      Math.min(max, Math.max(valueMin, valueMax)),
    ]);
  }, [valueMin, valueMax, min, max]);

  const commit = (next: [number, number]) => {
    // clamp + order
    const a = Math.max(min, Math.min(next[0], max));
    const b = Math.max(min, Math.min(next[1], max));
    const ordered: [number, number] = a <= b ? [a, b] : [b, a];
    setVals(ordered);
    onChange({ min: ordered[0], max: ordered[1] });
  };

  return (
    <div className="space-y-3 ">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Estimate (days)</div>
        <div className="text-sm text-neutral-600">
          {vals[0]}–{vals[1]} days
        </div>
      </div>

      <RangeSlider
        min={min}
        max={max}
        step={1}
        value={vals}
        onInput={(next: number | number[]) => commit(next as [number, number])}
        className="w-full estimate-slider"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1">
          <div className="text-sm">Min days</div>
          <Input
            className="rounded-lg"
            type="number"
            min={min}
            max={vals[1]}
            value={vals[0]}
            onChange={(e) => {
              const v = Number(e.target.value || min);
              commit([v, vals[1]]);
            }}
          />
        </label>

        <label className="space-y-1">
          <div className="text-sm">Max days</div>
          <Input
            className="rounded-lg"
            type="number"
            min={vals[0]}
            max={max}
            value={vals[1]}
            onChange={(e) => {
              const v = Number(e.target.value || max);
              commit([vals[0], v]);
            }}
          />
        </label>
      </div>

      {/* Minimal, no-shadow styling override for the library */}
      <style jsx global>{`
        .estimate-slider {
          --rs-handle-size: 18px;
          --rs-track-height: 8px;
        }
        .estimate-slider .range-slider__range {
          background: #111; /* active track */
          border-radius: 9999px;
          box-shadow: none;
        }
        .estimate-slider .range-slider__thumb {
          width: var(--rs-handle-size);
          height: var(--rs-handle-size);
          background: #fff;
          border: 2px solid #111;
          box-shadow: none; /* no shadows */
        }
        .estimate-slider .range-slider__track {
          background: #e5e5e5; /* inactive track */
          border-radius: 9999px;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
