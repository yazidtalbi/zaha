// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Bell,
  Menu,
  User2,
  Store,
  Settings as SettingsIcon,
  LogOut,
  ShoppingBag,
  ChevronRight,
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
  // 1) direct metadata
  const m: UserMeta | undefined = user?.user_metadata;
  const metaPic = m?.picture || m?.avatar_url;

  // 2) identities (google often here)
  const identities = (user?.identities ?? []) as any[];
  const idPic =
    identities
      ?.map((id) => id?.identity_data?.picture || id?.identity_data?.avatar_url)
      ?.find(Boolean) || null;

  // 3) profile row fallback
  const prof = profile?.avatar_url || null;

  const url = metaPic || idPic || prof || null;

  // If it's a Google photo without size, add one (Google supports ?sz=)
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

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
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
      // temporary avatar until profile loads
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

        // recompute avatar with profile available
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

  return (
    <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-paper/60">
      <div className="pt-[env(safe-area-inset-top)]" />
      <div className="mx-auto max-w-screen-sm px-3 py-2">
        <div className="grid grid-cols-3 items-center">
          {/* Left: Hamburger */}
          <div className="justify-self-start">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6 text-ink" strokeWidth={1.75} />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="w-[88vw] sm:w-96 p-0">
                <div className="px-4 pt-5 pb-4">
                  <SheetHeader className="items-start">
                    <SheetTitle className="sr-only">Account menu</SheetTitle>
                  </SheetHeader>

                  {/* Profile row */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-1 ring-black/5">
                      {avatarUrl ? (
                        <AvatarImage
                          src={avatarUrl}
                          alt={displayName}
                          referrerPolicy="no-referrer"
                          onError={() => setAvatarUrl(null)} // fallback if broken
                        />
                      ) : (
                        <AvatarFallback className="text-sm">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="min-w-0">
                      {uid ? (
                        <Link
                          href="/profile"
                          className="block font-semibold truncate hover:underline"
                        >
                          {displayName}
                        </Link>
                      ) : (
                        <Link
                          href="/login"
                          className="block font-semibold truncate text-terracotta hover:underline"
                        >
                          Guest
                        </Link>
                      )}
                      <div className="text-xs text-muted-foreground truncate">
                        {uid ? displayEmail : "Not signed in"}
                      </div>
                    </div>
                  </div>

                  {/* Buyer / Seller segmented buttons */}
                  <div className="mt-4 flex items-center gap-3">
                    <Button
                      variant={role === "buyer" ? "default" : "outline"}
                      className="rounded-full px-6"
                      onClick={() => setRole("buyer")}
                    >
                      Buyer
                    </Button>
                    <Button
                      variant={role === "seller" ? "default" : "outline"}
                      className="rounded-full px-6"
                      onClick={() => setRole("seller")}
                    >
                      Seller
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Menu items */}
                <nav className="px-2 py-2">
                  <MenuItem
                    href={uid ? "/profile" : "/login"}
                    icon={<User2 className="h-5 w-5" />}
                    label="My Profile"
                  />
                  <MenuItem
                    href={uid ? "/orders" : "/login"}
                    icon={<ShoppingBag className="h-5 w-5" />}
                    label="My Orders"
                  />
                  <MenuItem
                    href={uid ? "/seller" : "/login"}
                    icon={<Store className="h-5 w-5" />}
                    label="My Store"
                  />
                  <MenuItem
                    href="/settings"
                    icon={<SettingsIcon className="h-5 w-5" />}
                    label="Settings"
                  />
                </nav>

                <Separator />

                {/* Logout */}
                <div className="px-2 py-3">
                  {uid ? (
                    <button
                      onClick={logout}
                      className="w-full flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-sand transition"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Logout</span>
                      </div>
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="w-full flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-sand transition"
                    >
                      <div className="flex items-center gap-3">
                        <LogOut className="h-5 w-5" />
                        <span className="font-medium">Login</span>
                      </div>
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Center: Brand */}
          <div className="justify-self-center">
            <Link
              href="/home"
              className="font-semibold tracking-tight text-2xl"
              aria-label="Zaha home"
            >
              zaha
            </Link>
          </div>

          {/* Right: Alerts */}
          <div className="justify-self-end">
            <Link href="/notifications" aria-label="Notifications">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full flex items-center justify-center"
              >
                <Bell className="h-7 w-7 text-ink" strokeWidth={1.75} />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function MenuItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-3 py-3 hover:bg-sand transition"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-[15px]">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 opacity-60" />
    </Link>
  );
}
