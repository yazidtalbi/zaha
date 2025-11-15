// app/you/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ChevronLeft,
  ChevronRight,
  User2,
  ShoppingBag,
  LifeBuoy,
  Settings,
  Store,
  LogOut,
  Bell,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-4 active:scale-[0.995] transition border-b last:border-b-0"
    >
      <div className="text-[15px]">{children}</div>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </Link>
  );
}

export default function YouPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasShop, setHasShop] = useState<boolean>(false);
  const unread = useUnreadNotifications();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      const u = data.user;
      setUid(u?.id ?? null);
      setEmail(u?.email ?? null);

      if (u?.id) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .eq("id", u.id)
          .maybeSingle();
        if (mounted) setProfile((p as Profile) ?? null);

        // Does the user own a shop?
        const { data: shop } = await supabase
          .from("shops")
          .select("id")
          .eq("owner", u.id)
          .maybeSingle();
        if (mounted) setHasShop(Boolean(shop?.id));
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const displayName =
    profile?.full_name || profile?.username || (uid ? "Account" : "Guest");

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Seller row destination + label
  const sellerHref = uid
    ? hasShop
      ? "/seller"
      : "/become-seller"
    : "/login?next=%2Fbecome-seller";
  const sellerLabel = hasShop ? "Manage your store" : "Become a Zaha seller";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Safe area top */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
        <div className="h-12 flex items-center gap-3 px-3">
          <button
            className="p-2 -ml-2 rounded-full active:scale-95"
            aria-label="Go back"
            onClick={() =>
              history.length > 1 ? router.back() : router.push("/home")
            }
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold">You</h1>
        </div>
      </header>

      {/* Profile header */}
      <div className="px-4 py-5 flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-1 ring-black/5">
          {profile?.avatar_url ? (
            <AvatarImage
              src={profile.avatar_url}
              alt={displayName}
              referrerPolicy="no-referrer"
            />
          ) : (
            <AvatarFallback>
              {(displayName || "U").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="min-w-0">
          <div className="font-semibold leading-tight truncate">
            {displayName}
          </div>
          <div className="text-sm opacity-60 truncate">
            {uid ? (email ?? "—") : "Not signed in"}
          </div>
        </div>

        <div className="ml-auto">
          {uid ? (
            <Button
              size="sm"
              variant="outline"
              className="rounded-full shadow-none"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          ) : (
            <Link href="/login">
              <Button size="sm" className="rounded-full">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main list */}
      <nav className="bg-card border-y">
        <Row href={uid ? "/profile" : "/login"}>
          <div className="flex items-center gap-3">
            <User2 className="h-5 w-5 opacity-80" />
            <span>Profile</span>
          </div>
        </Row>

        {/* Notifications */}
        <Row href="/notifications">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="h-5 w-5 opacity-80" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-600" />
              )}
            </div>
            <span>Notifications</span>
            {unread > 0 && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">
                {unread}
              </span>
            )}
          </div>
        </Row>

        <Row href={uid ? "/orders" : "/login"}>
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 opacity-80" />
            <span>Purchases</span>
          </div>
        </Row>

        <Row href="/help">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 opacity-80" />
            <span>Help &amp; Support</span>
          </div>
        </Row>

        <Row href="/settings">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 opacity-80" />
            <span>Settings</span>
          </div>
        </Row>
      </nav>

      {/* Seller callout row */}
      <div className="bg-card mt-3">
        <Row href={sellerHref}>
          <div className="flex items-center gap-3">
            <Store className="h-5 w-5 opacity-80" />
            <span>{sellerLabel}</span>
          </div>
        </Row>
      </div>

      {/* Safe area bottom spacing */}
      <div className="pb-[env(safe-area-inset-bottom)] h-3" />
    </div>
  );
}
