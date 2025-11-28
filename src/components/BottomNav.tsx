"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Heart,
  ShoppingCart,
  Search,
  Package,
  PlusCircle,
  Store,
  Settings,
  MessageSquareText,
  ScrollText,
  LifeBuoy,
  LogOut,
  LogIn,
  LayoutGrid,
  Eye,
  Share2,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

function clsx(...xs: (string | boolean | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}

type IconType = React.ComponentType<{ size?: number; className?: string }>;

// LocalStorage keys
const LS_HAS_SHOP = "zaha_hasShop";
const LS_SHOP_ID = "zaha_shopId";
const LS_SHOP_SLUG = "zaha_shopSlug";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? (pathname ?? "") : "";
  const isSeller = mounted && path.startsWith("/seller");

  const [uid, setUid] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // shop state
  const [hasShop, setHasShop] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_HAS_SHOP) === "1";
  });

  const [shopId, setShopId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_SHOP_ID) || null;
  });

  const [shopSlug, setShopSlug] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_SHOP_SLUG) || null;
  });

  const [menuOpen, setMenuOpen] = useState(false); // seller "More" sheet

  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
  }, [pathname, menuOpen]);

  const refreshCartCount = useCallback(
    async (nextUid = uid) => {
      if (!mounted) return;
      if (nextUid) {
        const { count } = await supabase
          .from("cart_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", nextUid);
        setCartCount(count ?? 0);
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

  const applyShopState = useCallback(
    (next: { id: string | null; slug: string | null }) => {
      const { id, slug } = next;
      const exists = !!id;
      setHasShop(exists);
      setShopId(id);
      setShopSlug(slug);

      if (typeof window === "undefined") return;

      if (exists) {
        localStorage.setItem(LS_HAS_SHOP, "1");
        localStorage.setItem(LS_SHOP_ID, id!);
        if (slug) localStorage.setItem(LS_SHOP_SLUG, slug);
        else localStorage.removeItem(LS_SHOP_SLUG);
      } else {
        localStorage.removeItem(LS_HAS_SHOP);
        localStorage.removeItem(LS_SHOP_ID);
        localStorage.removeItem(LS_SHOP_SLUG);
      }
    },
    []
  );

  const loadShopForUser = useCallback(
    async (userId: string | null) => {
      if (!userId) {
        applyShopState({ id: null, slug: null });
        return;
      }

      const { data, error } = await supabase
        .from("shops")
        .select("id, handle, title, owner")
        .eq("owner", userId)
        .maybeSingle();

      if (error) {
        console.error("Error loading shop in BottomNav:", error);
        return;
      }

      if (data?.id) {
        applyShopState({
          id: data.id,
          slug: (data as any).handle ?? data.id,
        });
      } else {
        applyShopState({ id: null, slug: null });
      }
    },
    [applyShopState]
  );

  // initial load
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const userId = u?.id ?? null;

      setUid(userId);

      await loadShopForUser(userId);
      await refreshCartCount(userId);
    })();
  }, [mounted, loadShopForUser, refreshCartCount]);

  // seller surface: ensure shop loaded
  useEffect(() => {
    if (!mounted || !isSeller) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      await loadShopForUser(userId);
    })();
  }, [mounted, isSeller, loadShopForUser]);

  // auth change
  useEffect(() => {
    if (!mounted) return;
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUid = session?.user?.id ?? null;
        setUid(nextUid);

        await refreshCartCount(nextUid);
        await loadShopForUser(nextUid);
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [mounted, refreshCartCount, loadShopForUser]);

  // cart realtime + events
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
    return () => {
      supabase.removeChannel(ch);
    };
  }, [mounted, uid, refreshCartCount]);

  useEffect(() => {
    if (!mounted) return;
    const onCartChanged = () => refreshCartCount();
    window.addEventListener("cart:changed", onCartChanged);
    return () => window.removeEventListener("cart:changed", onCartChanged);
  }, [mounted, refreshCartCount]);

  useEffect(() => {
    if (!mounted) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cart") refreshCartCount();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [mounted, refreshCartCount]);

  const norm = (s: string) =>
    s.endsWith("/") && s !== "/" ? s.replace(/\/+$/, "") : s;

  const Item = ({
    href,
    label,
    icon: Icon,
    match,
    badge,
    highlightOnActiveBg = true,
    exact = false,
  }: {
    href: string;
    label: string;
    icon: IconType;
    match: string | string[];
    badge?: number;
    highlightOnActiveBg?: boolean;
    exact?: boolean;
  }) => {
    const isActive = useMemo(() => {
      if (!mounted) return false;
      const current = norm(path);
      const matches = (m: string) => {
        const mm = norm(m);
        if (exact) return current === mm;
        return current === mm || current.startsWith(mm + "/");
      };
      return Array.isArray(match) ? match.some(matches) : matches(match);
    }, [mounted, match, path, exact]);

    return (
      <Link href={href} className="block">
        <div
          className={clsx(
            "flex flex-col items-center justify-center gap-1 py-2 text-xs transition-all duration-200",
            isActive
              ? "text-neutral-700 font-medium"
              : "text-neutral-500 hover:text-ink"
          )}
        >
          <div
            className={clsx(
              "relative grid place-items-center w-14 h-9 rounded-full transition-colors",
              isActive && highlightOnActiveBg
                ? "bg-neutral-100"
                : "bg-transparent"
            )}
          >
            <Icon size={20} className={clsx(isActive && "scale-110")} />
            {!!badge && (
              <span className="absolute -top-1.5 -right-2 grid place-items-center text-[10px] min-w-4 h-4 rounded-sm px-1 bg-[#371837] text-white">
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
    <Link href="/seller/sell" className="block -translate-y-3">
      <div className="mx-auto w-12 h-12 rounded-full bg-[#371837] text-white grid place-items-center shadow-lg">
        <PlusCircle size={22} />
      </div>
      <div className="mt-1 text-center text-xs font-medium text-gray-700">
        Add
      </div>
    </Link>
  );

  const onLogout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_HAS_SHOP);
      localStorage.removeItem(LS_SHOP_ID);
      localStorage.removeItem(LS_SHOP_SLUG);
    }

    applyShopState({ id: null, slug: null });
    setUid(null);

    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!mounted) return null;
  if (path.startsWith("/marketing")) return null;
  if (path === "/") return null;
  // hide nav on specific routes
  if (path.startsWith("/seller/sell")) return null;
  if (path.startsWith("/shop")) return null;
  if (path.startsWith("/seller/edit/")) return null;
  if (path.startsWith("/admin")) return null;
  if (path.startsWith("/become-seller")) return null;

  // ---------- SELLER NAV ----------
  if (isSeller) {
    const shopPath = shopSlug
      ? `/shop/${shopSlug}`
      : shopId
        ? `/shop/${shopId}`
        : null;

    return (
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white shadow-none ">
        <div className="max-w-screen-sm mx-auto rounded-t-2xl">
          <ul className="grid grid-cols-5 items-end px-2 pb-[env(safe-area-inset-bottom)]">
            <li>
              <Item
                href="/seller"
                label="Dashboard"
                match="/seller"
                icon={Home}
                exact
              />
            </li>
            <li>
              <Item
                href="/seller/orders"
                label="Orders"
                match="/seller/orders"
                icon={ScrollText}
              />
            </li>
            <li>
              <Item
                href="/seller/products"
                label="Products"
                match="/seller/products"
                icon={Package}
              />
            </li>
            <li>
              <Item
                href="/seller/analytics"
                label="Analytics"
                match="/seller/analytics"
                icon={ChartNoAxesColumnIncreasing}
              />
            </li>
            <li>
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button className="block w-full">
                    <div className="flex flex-col items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-ink">
                      <div className="grid place-items-center w-10 h-9">
                        <LayoutGrid size={20} strokeWidth={1.5} />
                      </div>
                      <span>More</span>
                    </div>
                  </button>
                </SheetTrigger>

                <SheetContent
                  side="bottom"
                  className="max-w-screen-sm mx-auto rounded-t-2xl bg-white shadow-2xl border-ink/10 px-0 pt-2 pb-[env(safe-area-inset-bottom)]"
                >
                  <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />

                  <div className="px-1 space-y-2">
                    {/* Primary action */}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/home");
                      }}
                      className="w-full h-12 px-4 rounded-2xl flex items-center gap-3 bg-[#371837]/8 hover:bg-[#371837]/12 active:bg-[#371837]/16 text-gray-700"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#371837]/15">
                        <Home size={18} />
                      </span>
                      <span className="text-[15px] font-semibold">
                        Switch to buyer mode
                      </span>
                    </button>

                    <ul className="space-y-1">
                      {shopPath && (
                        <li>
                          <Link
                            href={shopPath}
                            onClick={() => setMenuOpen(false)}
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                          >
                            <Eye size={20} />
                            <div className="flex flex-col">
                              <span className="text-[15px] font-medium">
                                Preview my shop
                              </span>
                              <span className="text-xs text-ink/60">
                                See your shop as buyers do
                              </span>
                            </div>
                          </Link>
                        </li>
                      )}

                      {shopPath && (
                        <li>
                          <button
                            onClick={() => {
                              if (!shopPath) return;
                              const url =
                                typeof window !== "undefined"
                                  ? `${window.location.origin}${shopPath}`
                                  : shopPath;

                              if (navigator.share) {
                                navigator
                                  .share({
                                    title: "My Zaha shop",
                                    url,
                                  })
                                  .catch(() => {});
                              } else if (navigator.clipboard) {
                                navigator.clipboard
                                  .writeText(url)
                                  .then(() => {
                                    toast("Shop link copied", {
                                      description:
                                        "Share it with your customers.",
                                    });
                                  })
                                  .catch(() => {});
                              }
                            }}
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand text-left"
                          >
                            <Share2 size={20} />
                            <div className="flex flex-col">
                              <span className="text-[15px] font-medium">
                                Share my shop
                              </span>
                              <span className="text-xs text-ink/60">
                                Copy or share your shop link
                              </span>
                            </div>
                          </button>
                        </li>
                      )}

                      <li>
                        <Link
                          href="/seller/reviews"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                        >
                          <MessageSquareText size={20} />
                          <span className="text-[15px] font-medium">
                            Reviews
                          </span>
                        </Link>
                      </li>
                    </ul>

                    <div className="my-2 h-px bg-ink/10" />

                    <ul className="space-y-1">
                      <li>
                        <Link
                          href="/seller/settings"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                        >
                          <Settings size={20} />
                          <span className="text-[15px] font-medium">
                            Shop settings
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/help"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                        >
                          <LifeBuoy size={20} />
                          <span className="text-[15px] font-medium">
                            Help &amp; Support
                          </span>
                        </Link>
                      </li>
                      <li>
                        {uid ? (
                          <button
                            onClick={async () => {
                              setMenuOpen(false);
                              await onLogout();
                            }}
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand text-left"
                          >
                            <LogOut size={20} />
                            <span className="text-[15px] font-medium">
                              Logout
                            </span>
                          </button>
                        ) : (
                          <Link
                            href="/login"
                            onClick={() => setMenuOpen(false)}
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                          >
                            <LogIn size={20} />
                            <span className="text-[15px] font-medium">
                              Sign in
                            </span>
                          </Link>
                        )}
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
  const ordersHref = uid ? "/orders" : "/login";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white shadow-xl">
      <div className="max-w-screen-sm mx-auto rounded-t-2xl">
        <ul className="grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
          <li>
            <Item href="/home" label="Home" match="/home" icon={Home} />
          </li>
          <li>
            <Item href="/search" label="Shop" match="/search" icon={Search} />
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
              href={ordersHref}
              label="Orders"
              match="/orders"
              icon={Package}
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
