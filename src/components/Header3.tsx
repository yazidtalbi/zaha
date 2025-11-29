"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import {
  Home,
  Heart,
  ShoppingBag,
  Store,
  Settings,
  LifeBuoy,
  LogOut,
  LogIn,
  Bell,
  ShoppingCart,
  Package,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

/* =========
   LocalStorage keys (shared with BottomNav)
=========== */
const LS_HAS_SHOP = "zaha_hasShop";
const LS_SHOP_ID = "zaha_shopId";
const LS_SHOP_SLUG = "zaha_shopSlug";

const LS_PROFILE_NAME = "zaha_profileName";
const LS_PROFILE_EMAIL = "zaha_profileEmail";
const LS_PROFILE_AVATAR = "zaha_profileAvatar";

type Mode = "buyer" | "seller" | null;

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const unread = useUnreadNotifications();

  const [menuOpen, setMenuOpen] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);

  // hydrate profile from localStorage
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

  const applyProfileState = useCallback(
    (next: {
      name?: string | null;
      email?: string | null;
      avatar?: string | null;
    }) => {
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

  // initial load
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      const userId = user?.id ?? null;

      setUid(userId);

      if (!userId) {
        setMode(null);
        applyProfileState({
          name: "Account",
          email: null,
          avatar: null,
        });
        return;
      }

      const authEmail = user?.email ?? null;
      const metaName =
        (user?.user_metadata?.full_name as string) ||
        (user?.user_metadata?.name as string) ||
        null;

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url, mode")
        .eq("id", userId)
        .maybeSingle();

      const display =
        (p?.full_name as string) ||
        (p?.username as string) ||
        metaName ||
        "Account";
      const avatar = (p?.avatar_url as string) ?? null;

      setMode((p?.mode as Mode) ?? "buyer");

      applyProfileState({
        name: display,
        email: authEmail,
        avatar,
      });
    })();
  }, [mounted, applyProfileState]);

  // auth change
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
          ...(nextName ? { name: nextName } : {}),
        });

        if (!nextUid) {
          setMode(null);
          return;
        }

        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, username, avatar_url, mode")
          .eq("id", nextUid)
          .maybeSingle();

        if (p) {
          const display =
            (p.full_name as string) ||
            (p.username as string) ||
            nextName ||
            "Account";
          const avatar = (p.avatar_url as string) ?? null;

          setMode((p.mode as Mode) ?? "buyer");
          applyProfileState({
            name: display,
            avatar,
          });
        }
      }
    );

    return () => sub.subscription.unsubscribe();
  }, [mounted, applyProfileState]);

  const logout = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LS_HAS_SHOP);
      localStorage.removeItem(LS_SHOP_ID);
      localStorage.removeItem(LS_SHOP_SLUG);
      localStorage.removeItem(LS_PROFILE_NAME);
      localStorage.removeItem(LS_PROFILE_EMAIL);
      localStorage.removeItem(LS_PROFILE_AVATAR);
    }

    setUid(null);
    setMode(null);
    applyProfileState({
      name: "Account",
      email: null,
      avatar: null,
    });

    await supabase.auth.signOut();
    router.replace("/login");
  };

  const switchMode = async () => {
    if (!uid) return;
    const newMode: Mode = mode === "seller" ? "buyer" : "seller";
    setMode(newMode);

    await supabase.from("profiles").update({ mode: newMode }).eq("id", uid);

    router.push(newMode === "seller" ? "/seller" : "/home");
  };

  const isMarketing = pathname?.startsWith("/marketing");
  if (isMarketing) return null;

  const displayName =
    profileName && profileName !== "Account" && uid
      ? profileName
      : uid
        ? "Account"
        : "Guest";

  const initials = (displayName || "U").slice(0, 2).toUpperCase();
  const homeHref = mode === "seller" ? "/seller" : "/home";

  if (!mounted) {
    return (
      <header className="sticky top-0 z-40   ">
        <div className="mx-auto flex h-14 max-w-screen-sm items-center justify-between  ">
          <div className="w-8 h-8 rounded-full bg-sand/80" />
          <div className="h-4 w-16 rounded bg-sand/80" />
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-sand/80" />
            <div className="w-8 h-8 rounded-full bg-sand/80" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40  ">
      <div className="mx-auto flex h-10 max-w-screen-sm items-center justify-between  ">
        {/* LEFT: Avatar = Menu trigger */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button className="shrink-0">
              <div className="relative">
                <Avatar className="h-9 w-9 ring-1 ring-black/5">
                  {avatarUrl ? (
                    <AvatarImage
                      src={avatarUrl}
                      alt={displayName}
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
                {/* {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-600" />
                )} */}
              </div>
            </button>
          </SheetTrigger>

          <SheetContent side="left" className="w-80 bg-white px-0 pt-4 pb-6">
            <SheetHeader className="px-4">
              <SheetTitle className="text-base font-semibold text-ink">
                Account
              </SheetTitle>
            </SheetHeader>

            {/* Profile summary */}
            <div className="mt-4 flex items-center gap-3 px-4">
              <Avatar className="h-9 w-9 ring-1 ring-black/5">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={displayName}
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
                  {displayName}
                </span>
                <span className="text-xs text-neutral-500 truncate">
                  {email ? email : uid ? "Welcome back" : "Browsing as guest"}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Main links */}
            <nav className="space-y-1 px-2">
              <Link
                href="/home"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                href="/search"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Shop all</span>
              </Link>

              <Link
                href="/favorites"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <Heart className="w-4 h-4" />
                <span>Favorites</span>
              </Link>

              <Link
                href={uid ? "/orders" : "/login"}
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <Package className="w-4 h-4" />
                <span>Orders</span>
              </Link>

              <Link
                href="/cart"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Cart</span>
              </Link>

              {/* <Link
                href="/notifications"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <div className="relative">
                  <Bell className="w-4 h-4" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-600" />
                  )}
                </div>
                <span>Notifications</span>
                {unread > 0 && (
                  <span className="ml-auto rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-600">
                    {unread}
                  </span>
                )}
              </Link> */}
            </nav>

            <Separator className="my-4" />

            {/* Seller / mode switch */}
            <div className="space-y-1 px-2">
              {uid ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    switchMode();
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-xl bg-emerald-50 px-3 text-sm text-emerald-800 hover:bg-emerald-100"
                >
                  <Store className="w-4 h-4" />
                  <span>
                    {mode === "seller"
                      ? "Switch to buyer mode"
                      : "Switch to seller mode"}
                  </span>
                </button>
              ) : (
                <Link
                  href="/login?next=%2Fbecome-seller"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-11 items-center gap-3 rounded-xl bg-emerald-50 px-3 text-sm text-emerald-800 hover:bg-emerald-100"
                >
                  <Store className="w-4 h-4" />
                  <span>Become a Zaha seller</span>
                </Link>
              )}
            </div>

            <Separator className="my-4" />

            {/* Settings & auth */}
            <nav className="space-y-1 px-2">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </Link>

              <Link
                href="/help"
                onClick={() => setMenuOpen(false)}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
              >
                <LifeBuoy className="w-4 h-4" />
                <span>Help &amp; Support</span>
              </Link>

              {uid ? (
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                  }}
                  className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm hover:bg-sand/70"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign in</span>
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* CENTER: Zaha logo / wordmark */}
        <Link
          href={homeHref}
          className="flex-1 text-center text-lg font-semibold tracking-tight text-ink"
        >
          zaha
        </Link>

        {/* RIGHT: Notifications icon */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => router.push("/notifications")}
        >
          <div className="relative">
            <Bell className="w-5 h-5 " />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-600" />
            )}
          </div>
        </Button>
      </div>
    </header>
  );
}
