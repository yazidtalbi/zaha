// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import {
  Menu,
  Bell,
  User2,
  Store,
  LogOut,
  ShoppingBag,
  Heart,
  Home,
  LayoutDashboard,
  Settings,
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

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  mode: "buyer" | "seller" | null;
};

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const [profile, setProfile] = useState<Profile | null>(null);

  // Fetch user profile
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) return setProfile(null);

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username, mode")
        .eq("id", user.id)
        .single();

      setProfile(prof);
    })();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/login");
  };

  const switchMode = async () => {
    if (!profile) return;
    const newMode = profile.mode === "seller" ? "buyer" : "seller";
    setProfile({ ...profile, mode: newMode });

    await supabase
      .from("profiles")
      .update({ mode: newMode })
      .eq("id", profile.id);
    router.refresh();
  };

  // Mode aware home route
  const homeHref = profile?.mode === "seller" ? "/seller" : "/";

  return (
    <header className="sticky top-0 z-40 bg-white border-b shadow-sm h-14 flex items-center px-4">
      {/* LEFT: Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="mr-2">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <SheetHeader>
            <SheetTitle>Zaha Menu</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 text-lg">
              <Home className="w-5 h-5" />
              Home
            </Link>
            <Link href="/search" className="flex items-center gap-3 text-lg">
              <ShoppingBag className="w-5 h-5" />
              Shop
            </Link>
            <Link href="/favorites" className="flex items-center gap-3 text-lg">
              <Heart className="w-5 h-5" />
              Favorites
            </Link>

            <Separator className="my-3" />

            {/* Seller Mode Links */}
            {profile?.mode === "seller" && (
              <>
                <Link
                  href="/seller"
                  className="flex items-center gap-3 text-lg"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  Seller Dashboard
                </Link>
                <Link
                  href="/seller/products"
                  className="flex items-center gap-3 text-lg"
                >
                  <Store className="w-5 h-5" />
                  My Products
                </Link>
              </>
            )}

            <Separator className="my-3" />

            <Button variant="outline" className="w-full" onClick={switchMode}>
              Switch to {profile?.mode === "seller" ? "Buyer" : "Seller"} mode
            </Button>

            <Separator className="my-3" />

            <Button variant="destructive" className="w-full" onClick={logout}>
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* CENTER: Logo */}
      <Link href={homeHref} className="mx-auto font-semibold text-lg">
        Zaha
      </Link>

      {/* RIGHT: Notifications + Avatar */}
      <div className="flex items-center gap-2">
        <Link href="/notifications">
          <Bell className="w-6 h-6" />
        </Link>

        <Link href="/account" className="ml-1">
          <Avatar className="h-8 w-8 border">
            <AvatarImage src={profile?.avatar_url ?? ""} />
            <AvatarFallback>
              <User2 className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
}
