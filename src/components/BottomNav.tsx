"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, Heart, ShoppingCart, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function clsx(...xs: (string | boolean | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? pathname : "";

  const [uid, setUid] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(
    async (nextUid = uid) => {
      if (!mounted) return;
      if (nextUid) {
        const { count, error } = await supabase
          .from("cart_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", nextUid);
        if (!error) setCartCount(count ?? 0);
      } else {
        try {
          const raw = localStorage.getItem("cart");
          setCartCount(raw ? (JSON.parse(raw)?.length ?? 0) : 0);
        } catch {
          setCartCount(0);
        }
      }
    },
    [mounted, uid]
  );

  // Initial auth read
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const nextUid = data.user?.id ?? null;
      setUid(nextUid);
      await refreshCartCount(nextUid);
    })();
  }, [mounted, refreshCartCount]);

  // Auth events
  useEffect(() => {
    if (!mounted) return;
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUid = session?.user?.id ?? null;
        setUid(nextUid);
        refreshCartCount(nextUid);
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [mounted, refreshCartCount]);

  // Realtime cart (authed)
  useEffect(() => {
    if (!mounted || !uid) return;
    const ch = supabase
      .channel(`cart_count_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${uid}`,
        },
        () => refreshCartCount(uid)
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [mounted, uid, refreshCartCount]);

  // Same-tab local updates
  useEffect(() => {
    if (!mounted) return;
    const onCartChanged = () => refreshCartCount();
    window.addEventListener("cart:changed", onCartChanged);
    return () => window.removeEventListener("cart:changed", onCartChanged);
  }, [mounted, refreshCartCount]);

  // Cross-tab guest updates
  useEffect(() => {
    if (!mounted) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") refreshCartCount();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted, refreshCartCount]);

  const Item = ({
    href,
    label,
    icon: Icon,
    match,
    badge,
  }: {
    href: string;
    label: string;
    icon: any;
    match: string | string[];
    badge?: number;
  }) => {
    const isActive = useMemo(() => {
      if (!mounted) return false;
      return Array.isArray(match)
        ? match.some((m) => path.startsWith(m))
        : path.startsWith(match);
    }, [mounted, match, path]);

    return (
      <Link href={href} className="block">
        <div
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-2 text-xs transition-all duration-200",
            isActive
              ? "text-terracotta font-semibold   rounded-md"
              : "text-gray-500 hover:text-ink"
          )}
        >
          <div className="relative">
            <Icon
              size={20}
              className={clsx(
                "transition-transform duration-200",
                isActive && "scale-110"
              )}
            />
            {!!badge && (
              <span className="absolute -top-1.5 -right-2 grid place-items-center text-[10px] min-w-[16px] h-4 rounded-sm px-1 bg-terracotta text-white">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </div>
          <span>{label}</span>
        </div>
      </Link>
    );
  };

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] bg-white">
      <ul className="max-w-screen-sm mx-auto grid grid-cols-5">
        <li>
          <Item href="/home" label="Home" match="/home" icon={Home} />
        </li>

        {/* Search / Shop (2nd position) */}
        <li>
          <Item href="/search" label="Shop" match={["/search"]} icon={Search} />
        </li>

        <li>
          <Item href="/deals" label="Deals" match="/deals" icon={Tag} />
        </li>
        <li>
          <Item
            href="/favorites"
            label="Favorites"
            match="/favorites"
            icon={Heart}
          />
        </li>
        <li>
          <Item
            href="/cart"
            label="Cart"
            match="/cart"
            icon={ShoppingCart}
            badge={cartCount || undefined}
          />
        </li>
      </ul>
    </nav>
  );
}
