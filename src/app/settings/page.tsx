"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, Save, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

// ===== shadcn/ui bits (replace paths if different) =====
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ===== Types matching a typical 'profiles' table =====
// Adjust fields to your exact schema.
type Profile = {
  id: string; // auth user id (uuid)
  full_name: string | null;
  username?: string | null;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  language?: string | null; // e.g. "en", "fr", "ar"
  notif_orders?: boolean | null;
  notif_marketing?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  );
}

function SettingsInner() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);

  // For password change
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUid(user.id);

      // Fetch profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        toast.error("Failed to load profile");
      }

      // If no profile row yet, initialize minimally
      if (!data) {
        setProfile({
          id: user.id,
          full_name: user.user_metadata?.full_name ?? "",
          bio: "",
          phone: "",
          city: "",
          address: "",
          avatar_url: user.user_metadata?.avatar_url ?? null,
          language: "en",
          notif_orders: true,
          notif_marketing: false,
        });
      } else {
        setProfile({
          id: data.id,
          full_name: data.full_name ?? "",
          username: data.username ?? "",
          bio: data.bio ?? "",
          phone: data.phone ?? "",
          city: data.city ?? "",
          address: data.address ?? "",
          avatar_url: data.avatar_url ?? "",
          language: data.language ?? "en",
          notif_orders: data.notif_orders ?? true,
          notif_marketing: data.notif_marketing ?? false,
          updated_at: data.updated_at ?? null,
          created_at: data.created_at ?? null,
        });
      }

      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!uid || !profile) return;
    setSaving(true);
    const payload = {
      id: uid,
      full_name: (profile.full_name ?? "").trim(),
      username: (profile.username ?? "").trim() || null,
      bio: (profile.bio ?? "").trim() || null,
      phone: (profile.phone ?? "").trim() || null,
      city: (profile.city ?? "").trim() || null,
      address: (profile.address ?? "").trim() || null,
      avatar_url: profile.avatar_url ?? null,
      language: profile.language ?? "en",
      notif_orders: !!profile.notif_orders,
      notif_marketing: !!profile.notif_marketing,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    setSaving(false);

    if (error) {
      toast.error("Couldn’t save settings");
      return;
    }
    toast.success("Settings saved ✅");
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    // Basic guard: < 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }

    const ext = file.name.split(".").pop() || "png";
    const path = `avatars/${uid}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      toast.error("Avatar upload failed");
      return;
    }

    // Get public URL (or use RLS-signed URLs if preferred)
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub?.publicUrl;

    if (!url) {
      toast.error("Couldn’t resolve avatar URL");
      return;
    }

    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    toast.success("Avatar updated");
  }

  async function handlePasswordChange() {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);

    if (error) {
      toast.error(error.message || "Couldn’t change password");
      return;
    }
    setNewPassword("");
    setConfirm("");
    toast.success("Password updated ✅");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading settings…
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="p-4">
        <p className="text-sm text-muted-foreground">No profile found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Profile & Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal info, preferences, and security.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This information appears on your orders and messages.
        </p>

        <div className="grid gap-6 md:grid-cols-[160px_1fr]">
          {/* Avatar */}
          <div className="flex flex-col items-start gap-3">
            <div className="size-28 overflow-hidden rounded-full border bg-muted relative">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <div className="size-full grid place-items-center text-xs text-muted-foreground">
                  No avatar
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              <Button
                variant="secondary"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 size-4" />
                Upload
              </Button>
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                placeholder="Your name"
                value={profile.full_name ?? ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p ? { ...p, full_name: e.target.value } : p
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="e.g. yazid"
                value={profile.username ?? ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p ? { ...p, username: e.target.value } : p
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="A short description about you"
                value={profile.bio ?? ""}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, bio: e.target.value } : p))
                }
                rows={4}
              />
            </div>
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Contact & Address</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Used for delivery and seller contact.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              placeholder="+212 ..."
              value={profile.phone ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, phone: e.target.value } : p))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="Tetouan"
              value={profile.city ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, city: e.target.value } : p))
              }
            />
          </div>

          <div className="md:col-span-2 grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="Street, building, apartment"
              value={profile.address ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, address: e.target.value } : p))
              }
            />
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Preferences</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Language and notifications.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select
              value={profile.language ?? "en"}
              onValueChange={(val) =>
                setProfile((p) => (p ? { ...p, language: val } : p))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4">
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="font-medium">Order updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notifications about order status.
                </p>
              </div>
              <Switch
                checked={!!profile.notif_orders}
                onCheckedChange={(v) =>
                  setProfile((p) => (p ? { ...p, notif_orders: v } : p))
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="font-medium">Marketing</p>
                <p className="text-sm text-muted-foreground">
                  Receive promotions and news.
                </p>
              </div>
              <Switch
                checked={!!profile.notif_marketing}
                onCheckedChange={(v) =>
                  setProfile((p) => (p ? { ...p, notif_marketing: v } : p))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Security</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Change your account password.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={handlePasswordChange}
            disabled={pwSaving || !newPassword}
          >
            {pwSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Update password
          </Button>
        </div>
      </section>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save changes
        </Button>
      </div>
    </main>
  );
}
