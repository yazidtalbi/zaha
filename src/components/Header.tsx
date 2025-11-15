// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import {
  Menu,
  User2,
  Store,
  Settings as SettingsIcon,
  LogOut,
  ShoppingBag,
  ChevronRight,
  Search,
  Grid2X2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CategoriesStrip from "./home/CategoriesStrip";
import HeroCategoriesStrip from "./home/HeroCategoriesStrip";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

type UserMeta = {
  name?: string;
  picture?: string;
  avatar_url?: string;
  email?: string;
};

function extractAvatarUrl(user: any, profile: Profile | null): string | null {
  const m: UserMeta | undefined = user?.user_metadata;
  const metaPic = m?.picture || m?.avatar_url;

  const identities = (user?.identities ?? []) as any[];
  const idPic =
    identities
      ?.map((id) => id?.identity_data?.picture || id?.identity_data?.avatar_url)
      ?.find(Boolean) || null;

  const prof = profile?.avatar_url || null;
  const url = metaPic || idPic || prof || null;

  if (
    url &&
    /lh3\.googleusercontent\.com/.test(url) &&
    !/[?&](sz|s)=/.test(url)
  ) {
    return `${url}${url.includes("?") ? "&" : "?"}sz=200`;
  }
  return url;
}

export default function Header() {
  const router = useRouter();
  const unread = useUnreadNotifications();

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // — Auth state
  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      setUid(data.user?.id ?? null);
      setEmail(data.user?.email ?? null);
      setUserMeta((data.user?.user_metadata as UserMeta) ?? null);
      setAvatarUrl(extractAvatarUrl(data.user, null));
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!active) return;
      setUid(sess?.user?.id ?? null);
      setEmail(sess?.user?.email ?? null);
      setUserMeta((sess?.user?.user_metadata as UserMeta) ?? null);
      setAvatarUrl(extractAvatarUrl(sess?.user, null));
    });

    return () => {
      active = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  // — Profile row (fallbacks + final avatar selection)
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    let canceled = false;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .eq("id", uid)
        .maybeSingle();

      if (!canceled) {
        const p = (data as Profile) ?? null;
        setProfile(p);
        const { data: u } = await supabase.auth.getUser();
        setAvatarUrl(extractAvatarUrl(u?.user, p));
      }
    })();

    return () => {
      canceled = true;
    };
  }, [uid]);

  // — Display values
  const displayName =
    userMeta?.name ||
    profile?.full_name ||
    (profile?.username ? `@${profile.username}` : "Guest");

  const displayEmail = email || userMeta?.email || "(no email found)";

  const initials = useMemo(() => {
    const seed =
      displayName && displayName !== "Guest"
        ? displayName
        : email || profile?.username || "U";
    return seed
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [displayName, email, profile?.username]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  function MenuSection({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <section className="px-2 py-2">
        <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </div>
        <nav className="mt-1 space-y-1">{children}</nav>
      </section>
    );
  }

  function MenuItem({
    href,
    icon,
    label,
    highlight = false,
  }: {
    href: string;
    icon: React.ReactNode;
    label: string;
    highlight?: boolean;
  }) {
    return (
      <Link
        href={href}
        className={[
          "flex items-center justify-between rounded-md px-3 py-2 transition",
          highlight ? "bg-sand hover:bg-sand/80" : "hover:bg-sand",
        ].join(" ")}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
    );
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-paper/60">
      <div className="pt-[env(safe-area-inset-top)]" />

      <div className=" py-2 md:py-3">
        {/* Row: Browse (mobile) / All categories (desktop) + Search + Avatar */}
        <div className="flex items-center gap-3">
          {/* Mobile: Browse opens bottom sheet */}
          <Sheet>
            {/* <SheetTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full h-11 px-4 md:hidden"
                aria-label="Browse categories"
              >
                <Grid2X2 className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </SheetTrigger> */}

            <SheetContent
              side="bottom"
              className="h-[85vh] p-0 md:hidden"
              aria-describedby={undefined}
            >
              <div className="sticky top-0 bg-paper/80 backdrop-blur border-b">
                <div className="flex items-center justify-between px-4 py-3">
                  <SheetHeader className="p-0">
                    <SheetTitle className="text-base">
                      Browse categories
                    </SheetTitle>
                  </SheetHeader>
                  <Link
                    href="/categories"
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    View all
                  </Link>
                </div>
              </div>

              {/* Scrollable categories content */}
              <div className="overflow-y-auto h-full px-3 pb-6">
                {/* Use your existing component to render many categories */}
                <div className="mt-3">
                  <CategoriesStrip variant="full" title="Popular & all" />
                </div>

                {/* Optional: another dense strip */}
                <div className="mt-4">
                  <Separator />
                  <div className="mt-3">
                    <CategoriesStrip variant="dense" title="More to explore" />
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/categories"
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Open full categories page
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop: direct link to categories page */}
          <Link
            href="/categories"
            className="hidden md:inline-flex items-center gap-2 rounded-full border bg-white h-11 px-4 hover:bg-sand transition"
          >
            <Grid2X2 className="h-4 w-4" />
            <span className="text-sm">All categories</span>
          </Link>

          {/* Search pill — full width */}
          <button
            aria-label="Open search"
            className="flex-1 flex items-center gap-2 rounded-full border bg-white h-11 px-3 active:scale-[0.98] transition"
            onClick={() => router.push("/search")}
          >
            <Search className="h-4 w-4 opacity-60" />
            <span className="text-sm opacity-50 select-none text-left ml-1">
              Search handmade goods…
            </span>
          </button>

          {/* Avatar → You page */}
          {/* <Link
            href="/you"
            aria-label="Open account"
            className="relative rounded-full p-0.5 outline-none focus:outline-none focus:ring-ink/20"
          >
            <Avatar className="h-10 w-10 ring-1 ring-black/5">
              {avatarUrl ? (
                <AvatarImage
                  src={avatarUrl}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <AvatarFallback className="text-sm">{initials}</AvatarFallback>
              )}
            </Avatar>

            {unread > 0 && (
              <span
                className="absolute top-0.5 -left-0 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white"
                aria-hidden="true"
              />
            )}
          </Link> */}
        </div>
      </div>
    </header>
  );
}
