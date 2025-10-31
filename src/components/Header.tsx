// src/components/Header.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, User2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
};

export default function Header() {
  const [uid, setUid] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // ————————————————————————————
  // 1) Auth state
  // ————————————————————————————
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

  // ————————————————————————————
  // 2) Load profile
  // ————————————————————————————
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, username")
        .eq("id", uid)
        .maybeSingle();
      setProfile((data as Profile) ?? null);
    })();
  }, [uid]);

  // ————————————————————————————
  // Helpers
  // ————————————————————————————
  const initials = (profile?.full_name ?? profile?.username ?? "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Redirect target
  const accountHref = uid ? "/settings" : "/login";

  return (
    <header className="sticky top-0 z-40 border-b bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/60">
      <div className="pt-[env(safe-area-inset-top)]" />
      <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center gap-3">
        {/* Search link */}
        <Link
          href="/search"
          className="group relative flex-1"
          aria-label="Search"
        >
          <div className="absolute inset-y-0 left-3 flex items-center">
            <Search
              size={18}
              className="opacity-60 group-hover:opacity-100 transition-opacity"
            />
          </div>
          <div className="block w-full rounded-full bg-white pl-10 pr-4 py-3 text-sm text-neutral-500 shadow-sm ring-1 ring-black/5 group-hover:ring-black/10 transition">
            Search for something special
          </div>
        </Link>

        {/* Avatar → redirect to /settings */}
        <Link
          href={accountHref}
          className="shrink-0 rounded-full ring-1 ring-black/5 hover:ring-black/10 transition"
          aria-label={uid ? "Open settings" : "Login"}
        >
          {profile?.avatar_url ? (
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name ?? "Profile"}
              />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-9 w-9 grid place-items-center rounded-full bg-white">
              <User2 size={18} className="opacity-80" />
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
