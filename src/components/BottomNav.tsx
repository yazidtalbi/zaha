// components/BottomNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Tag,
  Heart,
  ShoppingCart,
  Search,
  Package,
  PlusCircle,
  Store,
  Settings,
  MessageSquareText,
  ScrollText,
  Bell,
  User2,
  LifeBuoy,
  LogOut,
  LogIn,
  ShoppingBag,
  LayoutGrid,
  Eye,
  Share2,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { toast } from "sonner";

function clsx(...xs: (string | boolean | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}

type IconType = React.ComponentType<{ size?: number; className?: string }>;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? (pathname ?? "") : "";
  const isSeller = mounted && path.startsWith("/seller");

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("Account");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [cartCount, setCartCount] = useState(0);
  const [hasShop, setHasShop] = useState(false);

  const [shopId, setShopId] = useState<string | null>(null);
  const [shopSlug, setShopSlug] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false); // seller "More" sheet
  const [userSheetOpen, setUserSheetOpen] = useState(false); // buyer "You" sheet

  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
  }, [pathname]);

  // unread notifications (for the avatar dot)
  const unread = useUnreadNotifications();

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

  // initial load: profile + shop + cart
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      setUid(u?.id ?? null);
      setEmail(u?.email ?? null);

      if (u?.id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", u.id)
          .maybeSingle();

        const display =
          (p?.full_name as string) || (p?.username as string) || "Account";
        setProfileName(display);
        setAvatarUrl((p?.avatar_url as string) ?? null);

        const { data: shop } = await supabase
          .from("shops")
          .select("id, slug")
          .eq("owner", u.id)
          .maybeSingle();

        if (shop?.id) {
          setHasShop(true);
          setShopId(shop.id);
          setShopSlug((shop as any).slug ?? null);
        } else {
          setHasShop(false);
          setShopId(null);
          setShopSlug(null);
        }
      } else {
        setHasShop(false);
        setShopId(null);
        setShopSlug(null);
      }

      await refreshCartCount(u?.id ?? null);
    })();
  }, [mounted, refreshCartCount]);

  // if we’re on seller surface, ensure shop id/slug are loaded (for “Preview my shop”)
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
        setHasShop(true);
      } else {
        setHasShop(false);
        setShopId(null);
        setShopSlug(null);
      }
    })();
  }, [mounted, isSeller]);

  // auth change: keep cart + shop in sync (fix for "Become a seller" after login)
  useEffect(() => {
    if (!mounted) return;
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUid = session?.user?.id ?? null;
        setUid(nextUid);
        await refreshCartCount(nextUid);

        if (nextUid) {
          const { data: shop } = await supabase
            .from("shops")
            .select("id, slug")
            .eq("owner", nextUid)
            .maybeSingle();
          if (shop?.id) {
            setHasShop(true);
            setShopId(shop.id);
            setShopSlug((shop as any).slug ?? null);
          } else {
            setHasShop(false);
            setShopId(null);
            setShopSlug(null);
          }
        } else {
          setHasShop(false);
          setShopId(null);
          setShopSlug(null);
        }
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [mounted, refreshCartCount]);

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
    highlightOnActiveBg = true, // <- default ON for all items
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
              ? "text-[#371837] font-semibold"
              : "text-gray-500 hover:text-ink"
          )}
        >
          <div
            className={clsx(
              "relative grid place-items-center w-10 h-9 rounded-lg transition-colors",
              isActive && highlightOnActiveBg
                ? "bg-[#371837]/15"
                : "bg-transparent"
            )}
          >
            <Icon
              size={20}
              strokeWidth={1.75}
              className={clsx(isActive && "scale-110")}
            />
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
      <div className="mt-1 text-center text-xs font-medium text-[#371837]">
        Add
      </div>
    </Link>
  );

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!mounted) return null;
  if (path.startsWith("/marketing")) return null;

  // hide bottom nav on the sell flow
  if (path.startsWith("/seller/sell")) return null;

  // ---------- SELLER NAV ----------
  if (isSeller) {
    const shopPath = shopSlug
      ? `/shop/${shopSlug}`
      : shopId
        ? `/shop/${shopId}`
        : null;

    return (
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white shadow-none">
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
                      className="w-full h-12 px-4 rounded-2xl flex items-center gap-3 bg-[#371837]/8 hover:bg-[#371837]/12 active:bg-[#371837]/16 text-[#371837]"
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
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                              <Eye size={18} />
                            </span>
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
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand text-left"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                              <Share2 size={18} />
                            </span>
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
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                            <MessageSquareText size={18} />
                          </span>
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
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                            <Settings size={18} />
                          </span>
                          <span className="text-[15px] font-medium">
                            Shop settings
                          </span>
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/help"
                          onClick={() => setMenuOpen(false)}
                          className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                            <LifeBuoy size={18} />
                          </span>
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
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand text-left"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                              <LogOut size={18} />
                            </span>
                            <span className="text-[15px] font-medium">
                              Logout
                            </span>
                          </button>
                        ) : (
                          <Link
                            href="/login"
                            onClick={() => setMenuOpen(false)}
                            className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/60 active:bg-sand"
                          >
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sand/80">
                              <LogIn size={18} />
                            </span>
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
  const initials = (profileName || "U").slice(0, 2).toUpperCase();
  const manageStoreLabel = hasShop
    ? "Go to seller mode"
    : "Become a Zaha seller";
  const manageStoreHref = uid
    ? hasShop
      ? "/seller"
      : "/become-seller"
    : "/login?next=%2Fbecome-seller";

  const manageStoreClasses = hasShop
    ? "bg-[#371837]/10 text-[#371837]"
    : "bg-emerald-50 text-emerald-800";

  const ordersHref = uid ? "/orders" : "/login";
  const youHref = uid ? "/you" : "/login";

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white shadow-none">
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
              href="/cart"
              label="Cart"
              match="/cart"
              icon={ShoppingCart}
              badge={cartCount || undefined}
            />
          </li>

          {/* Avatar / More sheet */}
          <li>
            <Sheet open={userSheetOpen} onOpenChange={setUserSheetOpen}>
              <SheetTrigger asChild>
                <button className="block w-full">
                  <div className="flex flex-col items-center justify-center gap-1 py-2 text-xs text-gray-500 hover:text-ink">
                    <div className="relative grid place-items-center w-10 h-9">
                      <Avatar className="h-8 w-8 ring-1 ring-black/5">
                        {avatarUrl ? (
                          <AvatarImage
                            src={avatarUrl}
                            alt={profileName}
                            referrerPolicy="no-referrer"
                            onError={() => setAvatarUrl(null)}
                          />
                        ) : (
                          <AvatarFallback className="text-[11px]">
                            {initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {unread > 0 && (
                        <span className="absolute top-0 -right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                      )}
                    </div>
                    <span className="leading-none">You</span>
                  </div>
                </button>
              </SheetTrigger>

              <SheetContent
                side="bottom"
                className="max-w-screen-sm mx-auto rounded-t-2xl bg-white shadow-2xl border-ink/10 px-0 pt-2 pb-[env(safe-area-inset-bottom)]"
              >
                <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-ink/15" />

                <div className="px-1">
                  <ul>
                    <li>
                      <Link
                        href={youHref}
                        onClick={() => setUserSheetOpen(false)}
                        className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                      >
                        <User2 size={20} />
                        <span className="text-[15px] font-medium">Account</span>
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/notifications"
                        onClick={() => setUserSheetOpen(false)}
                        className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                      >
                        <div className="relative">
                          <Bell size={20} />
                          {unread > 0 && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-600" />
                          )}
                        </div>
                        <span className="text-[15px] font-medium">
                          Notifications
                        </span>
                        {unread > 0 && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                            {unread}
                          </span>
                        )}
                      </Link>
                    </li>

                    <li>
                      <Link
                        href={ordersHref}
                        onClick={() => setUserSheetOpen(false)}
                        className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                      >
                        <ShoppingBag size={20} />
                        <span className="text-[15px] font-medium">
                          Purchases
                        </span>
                      </Link>
                    </li>

                    <li>
                      <Link
                        href="/deals"
                        onClick={() => setUserSheetOpen(false)}
                        className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                      >
                        <Tag size={20} />
                        <span className="text-[15px] font-medium">Deals</span>
                      </Link>
                    </li>

                    <li>
                      <Link
                        href={manageStoreHref}
                        onClick={() => setUserSheetOpen(false)}
                        className={clsx(
                          "w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand",
                          manageStoreClasses
                        )}
                      >
                        <Store size={20} />
                        <span className="text-[15px] font-medium">
                          {manageStoreLabel}
                        </span>
                      </Link>
                    </li>
                  </ul>

                  <div className="my-2 h-px bg-ink/10" />

                  <ul>
                    <li>
                      <Link
                        href="/settings"
                        onClick={() => setUserSheetOpen(false)}
                        className="w-full h-12 px-4 rounded-xl flex items-center gap-3 hover:bg-sand/50 active:bg-sand"
                      >
                        <Settings size={20} />
                        <span className="text-[15px] font-medium">
                          Settings
                        </span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/help"
                        onClick={() => setUserSheetOpen(false)}
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
                            setUserSheetOpen(false);
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
                          onClick={() => setUserSheetOpen(false)}
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
