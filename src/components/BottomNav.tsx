// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Tag,
  Heart,
  ShoppingCart,
  Search,
  Package,
  ClipboardList,
  PlusCircle,
  MoreHorizontal,
  Store,
  BarChart3,
  Settings,
  MessageSquareText,
  ChartNoAxesColumnIncreasing,
  ScrollText,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

function clsx(...xs: (string | boolean | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}

type IconType = React.ComponentType<{ size?: number; className?: string }>;

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? (pathname ?? "") : "";
  const isSeller = mounted && path.startsWith("/seller");

  const [uid, setUid] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // Seller: shop link (slug/id)
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopSlug, setShopSlug] = useState<string | null>(null);

  // Sheet state (to auto-close on nav)
  const [menuOpen, setMenuOpen] = useState(false);

  // Close drawer whenever the route changes
  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!mounted || !isSeller) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("shops")
        .select("id, slug")
        .eq("owner", userId)
        .maybeSingle();
      if (data) {
        setShopId(data.id);
        setShopSlug((data as any).slug ?? null);
      }
    })();
  }, [mounted, isSeller]);

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

  // add this small helper near the top of the file
  const norm = (s: string) =>
    s.endsWith("/") && s !== "/" ? s.replace(/\/+$/, "") : s;

  const Item = ({
    href,
    label,
    icon: Icon,
    match,
    badge,
    highlightOnActiveBg = false,
    onClick,
    exact = false, // <— NEW
  }: {
    href: string;
    label: string;
    icon: IconType;
    match: string | string[];
    badge?: number;
    highlightOnActiveBg?: boolean;
    onClick?: () => void;
    exact?: boolean; // <— NEW
  }) => {
    const isActive = useMemo(() => {
      if (!mounted) return false;

      const current = norm(path);

      const matches = (m: string) => {
        const mm = norm(m);
        if (exact) return current === mm; // exact match only
        return current === mm || current.startsWith(mm + "/"); // section match
      };

      return Array.isArray(match) ? match.some(matches) : matches(match);
    }, [mounted, match, path, exact]);

    return (
      <Link href={href} className="block" onClick={onClick}>
        <div
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-2 text-xs transition-all duration-200",
            isActive
              ? "text-terracotta font-semibold"
              : "text-gray-500 hover:text-ink"
          )}
        >
          <div
            className={clsx(
              "relative grid place-items-center w-10 h-9 rounded-lg transition-colors",
              isActive && highlightOnActiveBg
                ? "bg-terracotta/15"
                : "bg-transparent"
            )}
          >
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
          <span className="leading-none">{label}</span>
        </div>
      </Link>
    );
  };

  const CenterAdd = () => (
    <Link href="/seller/sell" className="block translate-y-[-12px]">
      <div className="mx-auto w-12 h-12 rounded-full bg-terracotta text-white grid place-items-center shadow-lg">
        <PlusCircle size={22} />
      </div>
      <div className="mt-1 text-center text-xs font-medium text-terracotta">
        Add
      </div>
    </Link>
  );

  if (!mounted) return null;

  // ---------- SELLER NAV ----------
  if (isSeller) {
    const shopPath = shopSlug
      ? `/shop/${shopSlug}`
      : shopId
        ? `/shop/${shopId}`
        : null;

    return (
      <nav
        className={clsx(
          "fixed bottom-0 inset-x-0 z-50  ",
          // softer, glassy bar with rounded top
          "bg-white",
          "shadow-none"
        )}
      >
        <div className="max-w-screen-sm mx-auto rounded-t-2xl">
          <ul className="grid grid-cols-5 items-end px-2   pb-[env(safe-area-inset-bottom)]">
            <li className="col-span-1">
              <Item
                href="/seller"
                label="Dashboard"
                match="/seller"
                icon={Home}
                highlightOnActiveBg
                exact // <— make Dashboard only active on /seller
              />
            </li>

            <li className="col-span-1">
              <Item
                href="/seller/orders"
                label="Orders"
                match="/seller/orders"
                icon={ScrollText}
                highlightOnActiveBg
              />
            </li>
            <li className="col-span-1">
              <Item
                href="/seller/products"
                label="Products"
                match="/seller/products"
                icon={Package}
                highlightOnActiveBg
              />
            </li>

            {/* Center (+) */}
            {/* <li className="col-span-1 grid place-items-center">
              <CenterAdd />
            </li> */}

            <li className="col-span-1">
              <Item
                href="/seller/analytics"
                label="Analytics"
                match="/seller/analytics"
                icon={ChartNoAxesColumnIncreasing}
                highlightOnActiveBg
              />
            </li>

            {/* More = Sheet trigger */}
            <li className="col-span-1">
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button className="block w-full" aria-label="More">
                    <div className="flex flex-col items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-ink transition">
                      <div className="relative grid place-items-center w-10 h-9 rounded-lg">
                        <MoreHorizontal size={20} />
                      </div>
                      <span className="leading-none">More</span>
                    </div>
                  </button>
                </SheetTrigger>

                {/* Hide default X, add rounded container */}
                <SheetContent
                  side="bottom"
                  className={clsx(
                    "max-w-screen-sm mx-auto",
                    "rounded-t-2xl bg-white shadow-2xl   border-ink/10",
                    "px-0 pt-2 pb-[env(safe-area-inset-bottom)]",
                    "[&_[data-radix-sheet-close]]:hidden"
                  )}
                >
                  {/* grabber */}
                  <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />

                  {/* optional top button */}
                  <div className="px-4 pb-2 flex items-center justify-end">
                    <Link href="/home" onClick={() => setMenuOpen(false)}>
                      <Button className="h-9 px-3 rounded-full bg-terracotta text-white hover:bg-terracotta/90">
                        Switch to buyer
                      </Button>
                    </Link>
                  </div>

                  {/* LISTS */}
                  <div className="px-1">
                    {/* SHOP */}
                    <ul className="grid">
                      <li>
                        <Link
                          href={shopPath ?? "/seller"}
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand transition"
                        >
                          <Store size={20} className="text-ink" />
                          <span className="text-[15px] font-medium text-ink">
                            View my shop
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/seller/reviews"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand transition"
                        >
                          <MessageSquareText size={20} className="text-ink" />
                          <span className="text-[15px] font-medium text-ink">
                            Reviews
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/seller/analytics"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand transition"
                        >
                          <BarChart3 size={20} className="text-ink" />
                          <span className="text-[15px] font-medium text-ink">
                            Analytics
                          </span>
                        </Link>
                      </li>
                    </ul>

                    {/* separator */}
                    <div className="my-2 h-px bg-ink/10" />

                    {/* SETTINGS */}
                    <ul className="grid">
                      <li>
                        <Link
                          href="/seller/settings"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand transition"
                        >
                          <Settings size={20} className="text-ink" />
                          <span className="text-[15px] font-medium text-ink">
                            Shop settings
                          </span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </SheetContent>
              </Sheet>
            </li>
          </ul>
        </div>
      </nav>
    );
  }

  // ---------- BUYER NAV ----------
  return (
    <nav
      className={clsx(
        "fixed bottom-0 inset-x-0 z-50  ",
        "bg-white",
        "shadow-none"
      )}
    >
      <div className="max-w-screen-sm mx-auto rounded-t-2xl">
        <ul className="grid grid-cols-5 px-2  pb-[env(safe-area-inset-bottom)]">
          <li>
            <Item href="/home" label="Home" match="/home" icon={Home} />
          </li>
          <li>
            <Item href="/search" label="Shop" match="/search" icon={Search} />
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
      </div>
    </nav>
  );
}
