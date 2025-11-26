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

// Keys for localStorage
const LS_HAS_SHOP = "zaha_hasShop";
const LS_SHOP_ID = "zaha_shopId";
const LS_SHOP_SLUG = "zaha_shopSlug";

// NEW – cache profile locally as well
const LS_PROFILE_NAME = "zaha_profileName";
const LS_PROFILE_EMAIL = "zaha_profileEmail";
const LS_PROFILE_AVATAR = "zaha_profileAvatar";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const path = mounted ? (pathname ?? "") : "";
  const isSeller = mounted && path.startsWith("/seller");

  const [uid, setUid] = useState<string | null>(null);

  // hydrate profile info instantly from localStorage
  const [email, setEmail] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_PROFILE_EMAIL) || null;
  });

  const [profileName, setProfileName] = useState<string>(() => {
    if (typeof window === "undefined") return "Account";
    return localStorage.getItem(LS_PROFILE_NAME) || "Account";
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LS_PROFILE_AVATAR) || null;
  });

  const [cartCount, setCartCount] = useState(0);

  // --- SHOP STATE (with localStorage-backed initial values) ---
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
  const [userSheetOpen, setUserSheetOpen] = useState(false); // buyer "You" sheet

  useEffect(() => {
    if (menuOpen) setMenuOpen(false);
  }, [pathname, menuOpen]);

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

  // helper: update local profile state + localStorage in one place
  const applyProfileState = useCallback(
    (next: {
      name?: string | null;
      email?: string | null;
      avatar?: string | null;
    }) => {
      // localStorage sync
      if (typeof window !== "undefined") {
        if (next.name !== undefined) {
          if (next.name && next.name !== "Account") {
            localStorage.setItem(LS_PROFILE_NAME, next.name);
          } else {
            localStorage.removeItem(LS_PROFILE_NAME);
          }
        }

        if (next.email !== undefined) {
          if (next.email) {
            localStorage.setItem(LS_PROFILE_EMAIL, next.email);
          } else {
            localStorage.removeItem(LS_PROFILE_EMAIL);
          }
        }

        if (next.avatar !== undefined) {
          if (next.avatar) {
            localStorage.setItem(LS_PROFILE_AVATAR, next.avatar);
          } else {
            localStorage.removeItem(LS_PROFILE_AVATAR);
          }
        }
      }

      // React state
      if (next.name !== undefined) {
        setProfileName(next.name || "Account");
      }
      if (next.email !== undefined) {
        setEmail(next.email ?? null);
      }
      if (next.avatar !== undefined) {
        setAvatarUrl(next.avatar ?? null);
      }
    },
    []
  );

  // helper: update shop state + localStorage in one place
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

  // helper: load shop for current user (one shop per user)
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
        // don’t wipe existing cached state on error
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

  // initial load: profile + shop + cart
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      const userId = u?.id ?? null;

      setUid(userId);

      const emailFromAuth = u?.email ?? null;
      const metaName =
        (u?.user_metadata?.full_name as string) ||
        (u?.user_metadata?.name as string) ||
        null;

      if (userId) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url")
          .eq("id", userId)
          .maybeSingle();

        const display =
          (p?.full_name as string) ||
          (p?.username as string) ||
          metaName ||
          "Account";
        const avatar = (p?.avatar_url as string) ?? null;

        applyProfileState({
          name: display,
          email: emailFromAuth,
          avatar,
        });
      } else {
        applyProfileState({
          name: "Account",
          email: null,
          avatar: null,
        });
      }

      // This will refresh the cached shop info, but UI already has last-known
      await loadShopForUser(userId);
      await refreshCartCount(userId);
    })();
  }, [mounted, loadShopForUser, refreshCartCount, applyProfileState]);

  // if we’re on seller surface, ensure shop id/slug are loaded (for “Preview my shop”)
  useEffect(() => {
    if (!mounted || !isSeller) return;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id ?? null;
      await loadShopForUser(userId);
    })();
  }, [mounted, isSeller, loadShopForUser]);

  // auth change: keep cart + shop + profile in sync
  useEffect(() => {
    if (!mounted) return;
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const nextUid = session?.user?.id ?? null;
        setUid(nextUid);

        const nextEmail = session?.user?.email ?? null;
        const nextName =
          (session?.user?.user_metadata?.full_name as string) ||
          (session?.user?.user_metadata?.name as string) ||
          undefined;

        applyProfileState({
          email: nextEmail,
          // only override name if we actually have one
          ...(nextName ? { name: nextName } : {}),
        });

        await refreshCartCount(nextUid);
        await loadShopForUser(nextUid);
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [mounted, refreshCartCount, loadShopForUser, applyProfileState]);

  // whenever the buyer drawer opens, re-check if user has a shop (keeps cache fresh)
  useEffect(() => {
    if (!mounted || !userSheetOpen || !uid) return;
    loadShopForUser(uid);
  }, [mounted, userSheetOpen, uid, loadShopForUser]);

  // listen for app-level event (from onboarding) to instantly update nav
  useEffect(() => {
    if (!mounted) return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const id = detail.id ?? null;
      const slug = detail.slug ?? null;
      if (!id) return;
      applyShopState({ id, slug });
    };

    window.addEventListener("shop:updated", handler as EventListener);
    return () =>
      window.removeEventListener("shop:updated", handler as EventListener);
  }, [mounted, applyShopState]);

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
    // clear cached data
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_HAS_SHOP);
      localStorage.removeItem(LS_SHOP_ID);
      localStorage.removeItem(LS_SHOP_SLUG);
      localStorage.removeItem(LS_PROFILE_NAME);
      localStorage.removeItem(LS_PROFILE_EMAIL);
      localStorage.removeItem(LS_PROFILE_AVATAR);
    }

    applyShopState({ id: null, slug: null });
    applyProfileState({ name: "Account", email: null, avatar: null });
    setUid(null);

    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (!mounted) return null;
  if (path.startsWith("/marketing")) return null;
  if (path === "/") return null;
  // hide bottom nav on the sell flow
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
    ? "bg-[#371837]/10 text-gray-700"
    : "bg-emerald-50 text-emerald-800";

  const ordersHref = uid ? "/orders" : "/login";
  const youHref = uid ? "/you" : "/login";

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
                            onError={() => {
                              applyProfileState({ avatar: null });
                            }}
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

                {/* header with name + email */}
                <div className="px-4 pb-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9 ring-1 ring-black/5">
                    {avatarUrl ? (
                      <AvatarImage
                        src={avatarUrl}
                        alt={profileName}
                        referrerPolicy="no-referrer"
                        onError={() => {
                          applyProfileState({ avatar: null });
                        }}
                      />
                    ) : (
                      <AvatarFallback className="text-[11px]">
                        {initials}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">
                      {profileName}
                    </span>
                    {email && (
                      <span className="text-xs text-neutral-500 truncate">
                        {email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="my-1 h-px bg-ink/10" />

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
