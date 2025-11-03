"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, Heart, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function clsx(...xs: (string | boolean | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export default function BottomNav() {
  const pathname = usePathname(); // call unconditionally
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? pathname : "";

  const [uid, setUid] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // store state
  const [storeAvatar, setStoreAvatar] = useState<string | null>(null);
  const [storeChecked, setStoreChecked] = useState(false); // "we know if a store exists for this uid"
  const fetchingStoreRef = useRef<string | null>(null); // avoid duplicate fetches

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
          setCartCount(raw ? JSON.parse(raw)?.length ?? 0 : 0);
        } catch {
          setCartCount(0);
        }
      }
    },
    [mounted, uid]
  );

  const fetchStoreFor = useCallback(
    async (ownerId: string) => {
      if (!mounted) return;
      if (fetchingStoreRef.current === ownerId) return;
      fetchingStoreRef.current = ownerId;
      try {
        const { data, error } = await supabase
          .from("shops")
          .select("avatar_url")
          .eq("owner", ownerId)
          .maybeSingle();
        if (!error) {
          setStoreAvatar(data?.avatar_url ?? null);
          setStoreChecked(true);
        }
      } finally {
        fetchingStoreRef.current = null;
      }
    },
    [mounted]
  );

  // Initial auth read
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const nextUid = data.user?.id ?? null;
      setUid(nextUid);
      await refreshCartCount(nextUid);

      if (nextUid) {
        setStoreChecked(false); // we'll determine it now
        fetchStoreFor(nextUid);
      } else {
        // guest: no store
        setStoreAvatar(null);
        setStoreChecked(true);
      }
    })();
  }, [mounted, refreshCartCount, fetchStoreFor]);

  // Auth events — react only to specific events
  useEffect(() => {
    if (!mounted) return;

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const nextUid = session?.user?.id ?? null;
        setUid(nextUid);
        refreshCartCount(nextUid);

        if (event === "SIGNED_OUT") {
          // hard reset for guests
          setStoreAvatar(null);
          setStoreChecked(true); // known: no store
          return;
        }

        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          // Keep current avatar to avoid flicker, just ensure we know the state
          if (nextUid) {
            setStoreChecked((checked) => checked || false);
            // Optionally refresh avatar in background (don’t unset while fetching)
            fetchStoreFor(nextUid);
          } else {
            setStoreAvatar(null);
            setStoreChecked(true);
          }
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, [mounted, refreshCartCount, fetchStoreFor]);

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
    image,
  }: {
    href: string;
    label: string;
    icon?: any;
    match: string | string[];
    badge?: number;
    image?: string | null;
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
            "flex flex-col items-center justify-center gap-1 py-2 text-xs",
            isActive && "text-ink font-medium"
          )}
        >
          <div className="relative">
            {image ? (
              <img
                src={image}
                alt="Store"
                className={clsx(
                  "w-5 h-5 rounded-sm object-cover ring-1 ring-border transition-all",
                  isActive && "ring-terracotta scale-105"
                )}
              />
            ) : (
              Icon && <Icon size={20} />
            )}
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

  // Render the Store tab only when we *know* the state (no flicker)
  const showStore = mounted && storeChecked && !!uid && !!storeAvatar;

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)] bg-white">
      <ul
        className={clsx(
          "max-w-screen-sm mx-auto grid",
          showStore ? "grid-cols-5" : "grid-cols-4"
        )}
      >
        <li>
          <Item href="/home" label="Home" match="/home" icon={Home} />
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
        {showStore && (
          <li>
            <Item
              href="/seller"
              label="Store"
              match="/seller"
              image={storeAvatar}
            />
          </li>
        )}
      </ul>
    </nav>
  );
}
