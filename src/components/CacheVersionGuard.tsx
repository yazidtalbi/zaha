// components/CacheVersionGuard.tsx
"use client";

import { useEffect } from "react";

const CURRENT_CACHE_VERSION = "3"; // bump when you change storage formats

const ZahaKeysToWipe = [
  "zaha_hasShop",
  "zaha_shopId",
  "zaha_shopSlug",
  "cart",
  "some_old_cache_key",
  // add ONLY Zaha-specific keys, NEVER supabase keys
];

export default function CacheVersionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const versionKey = "zaha_cache_version";
      const existing = window.localStorage.getItem(versionKey);

      if (existing !== CURRENT_CACHE_VERSION) {
        console.log("[Zaha] Cache version changed, cleaning app keys…");

        ZahaKeysToWipe.forEach((key) => {
          try {
            window.localStorage.removeItem(key);
            window.sessionStorage?.removeItem?.(key);
          } catch (err) {
            console.warn("Failed to remove key:", key, err);
          }
        });

        window.localStorage.setItem(versionKey, CURRENT_CACHE_VERSION);
      }
    } catch (err) {
      console.warn("[Zaha] Cache version check failed:", err);
    }
  }, []);

  return <>{children}</>;
}
