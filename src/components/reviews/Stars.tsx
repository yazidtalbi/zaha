"use client";
import { Star } from "lucide-react";

export function Stars({
  value,
  size = 16,
  showValue = false,
  className = "",
}: {
  value: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const full = Math.floor(value || 0);
  const hasHalf = value - full >= 0.5;
  const empty = 5 - full - (hasHalf ? 1 : 0);
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[...Array(full)].map((_, i) => (
        <Star key={`f${i}`} size={size} className="fill-current" />
      ))}
      {hasHalf && (
        <div className="relative" style={{ width: size, height: size }}>
          <Star size={size} className="absolute left-0 top-0" />
          <div
            className="absolute left-0 top-0 overflow-hidden"
            style={{ width: size / 2 }}
          >
            <Star size={size} className="fill-current" />
          </div>
        </div>
      )}
      {[...Array(empty)].map((_, i) => (
        <Star key={`e${i}`} size={size} />
      ))}
      {showValue && (
        <span className="ml-1 text-sm">{(value || 0).toFixed(2)}</span>
      )}
    </div>
  );
}
