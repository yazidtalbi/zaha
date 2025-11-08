// app/settings/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";

import {
  Loader2,
  Upload,
  Save,
  LogOut,
  Check,
  AlertCircle,
} from "lucide-react";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

/* =========================
   Types
========================= */
type Profile = {
  id: string;
  full_name: string | null;
  username?: string | null;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  language?: string | null;
  notif_orders?: boolean | null;
  notif_marketing?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
  email?: string | null; // derived from auth
};

/* =========================
   Utils
========================= */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const isEqual = (a: unknown, b: unknown) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

// Client-side image resize to keep uploads light
async function resizeImage(file: File, maxSize = 1024): Promise<Blob> {
  const img = document.createElement("img");
  const reader = new FileReader();

  const dataUrl: string = await new Promise((res, rej) => {
    reader.onerror = () => rej("read error");
    reader.onload = () => res(String(reader.result));
    reader.readAsDataURL(file);
  });

  await new Promise((res, rej) => {
    img.onerror = () => rej("image error");
    img.onload = () => res(null);
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);

  const type = file.type || "image/jpeg";
  const quality = type.includes("png") ? 0.92 : 0.85;

  const blob: Blob = await new Promise((res) =>
    canvas.toBlob((b) => res(b as Blob), type, quality)
  );
  return blob;
}

// Simple debounce
function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  ms = 800
) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => fn(...args), ms);
    },
    [fn, ms]
  );
}

/* =========================
   Page
========================= */
export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsInner />
    </RequireAuth>
  );
}

function SettingsInner() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [initial, setInitial] = useState<Profile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  // Username availability
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const dirty = useMemo(() => {
    if (!profile || !initial) return false;
    const comparableCurrent = { ...profile, email };
    const comparableInitial = { ...initial };
    return !isEqual(comparableCurrent, comparableInitial);
  }, [profile, initial, email]);

  /* ------------ Load auth + profile ------------ */
  useEffect(() => {
    (async () => {
      setAuthLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        setAuthLoading(false);
        setLoading(false);
        return;
      }
      setUid(user.id);
      setEmail(user.email ?? null);
      setAuthLoading(false);

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) toast.error("Failed to load profile");

      const base: Profile = data
        ? {
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
            email: user.email ?? null,
          }
        : {
            id: user.id,
            full_name: user.user_metadata?.full_name ?? "",
            username: "",
            bio: "",
            phone: "",
            city: "",
            address: "",
            avatar_url: user.user_metadata?.avatar_url ?? "",
            language: "en",
            notif_orders: true,
            notif_marketing: false,
            email: user.email ?? null,
          };

      setProfile(base);
      setInitial(base);
      setLoading(false);
    })();
  }, []);

  /* ------------ Autosave (debounced) ------------ */
  const debouncedSave = useDebouncedCallback(async () => {
    if (!uid || !profile) return;
    if (!dirty) return;
    await handleSave();
  }, 1200);

  useEffect(() => {
    if (!profile || !initial) return;
    debouncedSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.full_name,
    profile?.bio,
    profile?.language,
    profile?.notif_marketing,
    profile?.notif_orders,
    profile?.city,
    profile?.address,
    profile?.phone,
    profile?.avatar_url,
    profile?.username,
  ]);

  /* ------------ Actions ------------ */
  const handleSave = useCallback(async () => {
    if (!uid || !profile) return;
    setSaving(true);
    try {
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

      const { error, data } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      if (error) throw error;

      const merged = { ...(profile as Profile), ...(data ?? {}) };
      setInitial(merged);
      toast.success("Settings saved ✅");
    } catch (e: any) {
      toast.error("Couldn’t save settings");
    } finally {
      setSaving(false);
    }
  }, [uid, profile]);

  const handleAvatarSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.files?.[0];
      if (!raw || !uid) return;

      if (raw.size > 8 * 1024 * 1024) {
        toast.error("Image too large (max 8MB)");
        return;
      }
      try {
        const blob = await resizeImage(raw, 1024);
        const extGuess =
          raw.name.split(".").pop()?.toLowerCase() ||
          (raw.type.includes("png") ? "png" : "jpg");
        const key = `avatars/${uid}-${Date.now()}.${extGuess}`;

        const { error: upErr } = await supabase.storage
          .from("avatars")
          .upload(key, blob, {
            upsert: false,
            contentType: raw.type || "image/jpeg",
          });
        if (upErr) throw upErr;

        const { data: pub } = supabase.storage
          .from("avatars")
          .getPublicUrl(key);
        const url = pub?.publicUrl;
        if (!url) throw new Error("No public URL");

        // cache-bust
        const finalUrl = `${url}?v=${Date.now()}`;
        setProfile((p) => (p ? { ...p, avatar_url: finalUrl } : p));
        toast.success("Avatar updated");
      } catch {
        toast.error("Avatar upload failed");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [uid]
  );

  const handlePasswordChange = useCallback(async () => {
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
  }, [newPassword, confirm]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  }, [router]);

  async function checkUsernameAvailability(name: string) {
    if (!name) {
      setUsernameError(null);
      return;
    }
    setUsernameBusy(true);
    setUsernameError(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", name)
      .limit(1);

    setUsernameBusy(false);
    if (error) return; // silent
    const taken = !!(data && data.length && data[0]?.id !== uid);
    setUsernameError(taken ? "Username is already taken" : null);
  }
  const debouncedUsernameCheck = useDebouncedCallback(
    checkUsernameAvailability,
    600
  );

  const handleEmailChange = useCallback(async () => {
    if (!newEmail || newEmail === email) {
      toast.message("Nothing to change");
      return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);
    if (error) {
      toast.error(error.message || "Couldn’t update email");
      return;
    }
    toast.success("Verification email sent. Please confirm to finish.");
    setEmail(newEmail);
    setNewEmail("");
  }, [newEmail, email]);

  /* ------------ Render ------------ */
  if (authLoading || loading) {
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
    <main className="mx-auto w-full max-w-3xl p-4 pb-28 md:p-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Profile & Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your info, preferences, and security.
          </p>
        </div>
        <div className="hidden gap-2 md:flex">
          <Button variant="outline" onClick={signOut} aria-label="Sign out">
            <LogOut className="mr-2 size-4" />
            Sign out
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !!usernameError}
            aria-label="Save settings"
          >
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Profile */}
      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          This shows on your orders and messages.
        </p>

        <div className="grid gap-6 md:grid-cols-[160px_1fr]">
          {/* Avatar */}
          <div className="flex flex-col items-start gap-3">
            <div className="relative size-28 overflow-hidden rounded-lg border bg-muted">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <div className="grid size-full place-items-center text-xs text-muted-foreground">
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
                size="sm"
                onClick={() => fileRef.current?.click()}
                aria-label="Upload avatar"
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
              <div className="relative">
                <Input
                  id="username"
                  placeholder="e.g. yazid"
                  value={profile.username ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProfile((p) => (p ? { ...p, username: value } : p));
                    setUsernameError(null);
                    debouncedUsernameCheck(value);
                  }}
                  onBlur={(e) => {
                    const s = slugify(e.target.value);
                    setProfile((p) => (p ? { ...p, username: s } : p));
                    if (s) debouncedUsernameCheck(s);
                  }}
                />
                {usernameBusy ? (
                  <Loader2 className="absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : usernameError ? (
                  <AlertCircle className="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-red-500" />
                ) : profile.username ? (
                  <Check className="absolute right-2 top-1/2 size-4 -translate-y-1/2 text-green-600" />
                ) : null}
              </div>
              {usernameError ? (
                <p className="text-xs text-red-600">{usernameError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Letters & numbers only. We’ll slug it automatically.
                </p>
              )}
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

      {/* Contact */}
      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Contact & Address</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Used for delivery and seller contact.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email ?? ""} readOnly />
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="New email (optional)"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleEmailChange}
                disabled={emailSaving || !newEmail}
                aria-label="Update email"
              >
                {emailSaving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Changing email sends a verification link.
            </p>
          </div>

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

          <div className="grid gap-2 md:col-span-2">
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

      {/* Preferences */}
      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Preferences</h2>
        <p className="mb-4 text-sm text-muted-foreground">
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

      {/* Security */}
      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Security</h2>
        <p className="mb-4 text-sm text-muted-foreground">
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

      {/* Bottom actions (mobile) */}
      <div className="mt-6 flex justify-end gap-2 md:hidden">
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 size-4" />
          Sign out
        </Button>
        <Button onClick={handleSave} disabled={saving || !!usernameError}>
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save
        </Button>
      </div>

      {/* Sticky Save Bar when there are unsaved changes */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex size-2 rounded-lg bg-amber-500" />
              You have unsaved changes
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setProfile(initial!)}>
                Discard
              </Button>
              <Button onClick={handleSave} disabled={saving || !!usernameError}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
