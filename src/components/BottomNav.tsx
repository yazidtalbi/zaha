"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Tag, Heart, ShoppingCart, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function clsx(...xs: (string | boolean | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

export default function BottomNav() {
  const pathname = usePathname();

  const [cartCount, setCartCount] = useState(0);
  const [uid, setUid] = useState<string | null>(null);

  // 1) Auth -> set uid
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUid(data.user?.id ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setUid(sess?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) Initial count load (Supabase if logged in; localStorage fallback if logged out)
  useEffect(() => {
    const load = async () => {
      if (uid) {
        const { count, error } = await supabase
          .from("cart_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);

        if (!error) setCartCount(count ?? 0);
      } else {
        // logged out: fallback to localStorage
        try {
          const raw = localStorage.getItem("cart");
          setCartCount(raw ? JSON.parse(raw)?.length ?? 0 : 0);
        } catch {
          setCartCount(0);
        }
      }
    };
    load();
  }, [uid]);

  // 3) Realtime subscription for this user's cart rows
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`cart_count_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `user_id=eq.${uid}`,
        },
        async () => {
          const { count } = await supabase
            .from("cart_items")
            .select("id", { count: "exact", head: true })
            .eq("user_id", uid);
          setCartCount(count ?? 0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid]);

  // 4) Also listen to an optional custom event (if you dispatch it after add/remove)
  useEffect(() => {
    const bump = () => {
      // quick refresh without waiting for realtime round-trip
      if (!uid) {
        try {
          const raw = localStorage.getItem("cart");
          setCartCount(raw ? JSON.parse(raw)?.length ?? 0 : 0);
        } catch {}
      } else {
        supabase
          .from("cart_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid)
          .then(({ count }) => setCartCount(count ?? 0));
      }
    };
    window.addEventListener("cart:changed", bump);
    return () => window.removeEventListener("cart:changed", bump);
  }, [uid]);

  const Item = ({
    href,
    label,
    icon: Icon,
    match,
    onClick,
    badge,
  }: {
    href?: string;
    label: string;
    icon: any;
    match: string | string[];
    onClick?: () => void;
    badge?: number;
  }) => {
    const isActive = useMemo(() => {
      return Array.isArray(match)
        ? match.some((m) => pathname.startsWith(m))
        : pathname.startsWith(match);
    }, [match, pathname]);

    const content = (
      <div
        className={clsx(
          "flex flex-col items-center justify-center gap-1 py-2 text-xs",
          isActive && "text-ink font-medium"
        )}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="relative">
          <Icon size={20} />
          {!!badge && (
            <span className="absolute -top-1.5 -right-2 grid place-items-center text-[10px] min-w-[16px] h-4 rounded-full px-1 bg-terracotta text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <span>{label}</span>
      </div>
    );

    return href ? (
      <Link href={href} className="block">
        {content}
      </Link>
    ) : (
      <button onClick={onClick} className="block w-full">
        {content}
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-paper/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-6 max-w-screen-sm mx-auto">
        <li>
          <Item href="/home" label="Home" icon={Home} match="/home" />
        </li>
        <li>
          <Item href="/deals" label="Deals" icon={Tag} match="/deals" />
        </li>
        <li>
          <Item
            href="/favorites"
            label="Favorites"
            icon={Heart}
            match="/favorites"
          />
        </li>
        <li>
          <Item
            href="/cart"
            label="Cart"
            icon={ShoppingCart}
            match="/cart"
            badge={cartCount || undefined}
          />
        </li>

        {/* Separator */}
        <li className="w-px bg-zinc-300/50 mx-1" aria-hidden="true" />

        <li>
          <Item
            href="/seller"
            label="Store"
            icon={Store}
            match={["/seller", "/seller"]}
          />
        </li>
      </ul>
    </nav>
  );
}
