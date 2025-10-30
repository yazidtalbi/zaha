"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (!user) {
    return (
      <main className="p-4">
        <h1 className="text-xl font-semibold mb-2">Account</h1>
        <p className="text-sm text-ink/70">You’re not signed in.</p>
        <a href="/login" className="underline text-sm">
          Go to login
        </a>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Account</h1>
      <div className="rounded-xl bg-sand p-3">
        <div className="text-sm">Email: {user.email}</div>
        <div className="text-sm">ID: {user.id}</div>
      </div>
      <button
        className="rounded-xl px-4 py-3 bg-terracotta text-white"
        onClick={() =>
          supabase.auth.signOut().then(() => (location.href = "/"))
        }
      >
        Sign out
      </button>
    </main>
  );
}
