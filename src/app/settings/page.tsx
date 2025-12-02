// app/settings/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { uploadCompressedToSupabase } from "@/lib/compressAndUpload";

import {
  Loader2,
  Upload,
  Save,
  LogOut,
  Check,
  AlertCircle,
} from "lucide-react";

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
  email?: string | null;
};

/* =========================
   Helpers
========================= */
const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const isEqual = (a: any, b: any) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn: T,
  ms = 800
) {
  const t = useRef<NodeJS.Timeout | null>(null);
  return useCallback(
    (...args: any[]) => {
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
  return <SettingsInner />;
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

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const dirty = useMemo(() => {
    if (!profile || !initial) return false;
    const comparableCurrent = { ...profile, email };
    const comparableInitial = { ...initial };
    return !isEqual(comparableCurrent, comparableInitial);
  }, [profile, initial, email]);

  /* --- Load user & profile --- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        setAuthLoading(false);
        setLoading(false);
        return;
      }

      setUid(user.id);
      setEmail(user.email ?? null);
      setAuthLoading(false);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const googleAvatar = user.user_metadata?.avatar_url || "";

      const base: Profile = p
        ? {
            id: p.id,
            full_name: p.full_name,
            username: p.username,
            bio: p.bio,
            phone: p.phone,
            city: p.city,
            address: p.address,
            avatar_url: p.avatar_url || googleAvatar,
            language: p.language || "en",
            notif_orders: p.notif_orders ?? true,
            notif_marketing: p.notif_marketing ?? false,
            updated_at: p.updated_at,
            created_at: p.created_at,
            email: user.email ?? null,
          }
        : {
            id: user.id,
            full_name: user.user_metadata?.full_name || "",
            username: "",
            bio: "",
            phone: "",
            city: "",
            address: "",
            avatar_url: googleAvatar,
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

  /* --- Autosave --- */
  const debouncedSave = useDebouncedCallback(async () => {
    if (!dirty) return;
    await handleSave();
  }, 1200);

  useEffect(() => {
    if (!profile || !initial) return;
    debouncedSave();
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

  /* --- Save profile --- */
  const handleSave = useCallback(async () => {
    if (!uid || !profile) return;
    setSaving(true);

    try {
      const payload = {
        id: uid,
        full_name: profile.full_name?.trim() || "",
        username: profile.username?.trim() || null,
        bio: profile.bio?.trim() || null,
        phone: profile.phone?.trim() || null,
        city: profile.city?.trim() || null,
        address: profile.address?.trim() || null,
        avatar_url: profile.avatar_url || null,
        language: profile.language || "en",
        notif_orders: !!profile.notif_orders,
        notif_marketing: !!profile.notif_marketing,
        updated_at: new Date().toISOString(),
      };

      const { data } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select()
        .maybeSingle();

      setInitial(data as Profile);
      toast.success("Saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }, [uid, profile]);

  /* --- Avatar upload (SHOPS bucket) --- */
  const handleAvatarSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.files?.[0];
      if (!raw || !uid) return;

      try {
        const url = await uploadCompressedToSupabase(raw, uid, "shops");

        if (!url) throw new Error("Upload failed");

        const finalUrl = `${url}?v=${Date.now()}`;

        setProfile((p) => (p ? { ...p, avatar_url: finalUrl } : p));
        toast.success("Avatar updated");
      } catch (err) {
        console.error(err);
        toast.error("Avatar upload failed");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [uid]
  );

  /* --- Password --- */
  const handlePasswordChange = useCallback(async () => {
    if (!newPassword || newPassword.length < 6)
      return toast.error("Password too short");

    if (newPassword !== confirm) return toast.error("Passwords do not match");

    setPwSaving(true);
    await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);

    setNewPassword("");
    setConfirm("");
    toast.success("Password updated");
  }, [newPassword, confirm]);

  /* --- Email change --- */
  const handleEmailChange = useCallback(async () => {
    if (!newEmail || newEmail === email)
      return toast.message("Nothing to update");

    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setEmailSaving(false);

    if (error) return toast.error(error.message);

    setEmail(newEmail);
    setNewEmail("");
    toast.success("Verification sent");
  }, [newEmail, email]);

  /* --- Username check --- */
  const checkUsernameAvailability = async (u: string) => {
    if (!u) {
      setUsernameError(null);
      return;
    }
    setUsernameBusy(true);

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", u)
      .limit(1);

    setUsernameBusy(false);

    if (data?.length && data[0].id !== uid)
      setUsernameError("Username already taken");
    else setUsernameError(null);
  };
  const debouncedUsernameCheck = useDebouncedCallback(
    checkUsernameAvailability,
    600
  );

  /* --- Sign out --- */
  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  /* --- Render --- */
  if (authLoading || loading)
    return (
      <main className="p-4">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );

  if (!profile) return <main className="p-4">No profile found.</main>;

  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-28 md:p-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile & Settings</h1>
        <div className="hidden md:flex gap-2">
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
      </header>

      {/* Profile Section */}
      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Profile</h2>

        <div className="grid gap-6 md:grid-cols-[160px_1fr]">
          {/* Avatar */}
          <div className="flex flex-col items-start gap-3">
            <div className="relative size-28 overflow-hidden rounded-lg border bg-muted">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center text-xs text-muted-foreground">
                  No avatar
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 size-4" /> Upload
              </Button>
            </div>
          </div>

          {/* Profile Inputs */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Full name</Label>
              <Input
                value={profile.full_name ?? ""}
                onChange={(e) =>
                  setProfile((p) =>
                    p ? { ...p, full_name: e.target.value } : p
                  )
                }
              />
            </div>

            <div className="grid gap-2">
              <Label>Username</Label>

              <div className="relative">
                <Input
                  value={profile.username ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProfile((p) => (p ? { ...p, username: v } : p));
                    debouncedUsernameCheck(v);
                  }}
                  onBlur={(e) => {
                    const clean = slugify(e.target.value);
                    setProfile((p) => (p ? { ...p, username: clean } : p));
                    debouncedUsernameCheck(clean);
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

              {usernameError && (
                <p className="text-xs text-red-500">{usernameError}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Bio</Label>
              <Textarea
                rows={4}
                value={profile.bio ?? ""}
                onChange={(e) =>
                  setProfile((p) => (p ? { ...p, bio: e.target.value } : p))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <Separator className="my-6" />

      {/* Contact Section */}
      <section className="rounded-2xl border p-4 md:p-6">
        <h2 className="text-lg font-medium">Contact & Address</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input readOnly value={email ?? ""} />

            <div className="flex gap-2 mt-2">
              <Input
                placeholder="New email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleEmailChange}
                disabled={emailSaving || !newEmail}
              >
                {emailSaving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Update
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input
              value={profile.phone ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, phone: e.target.value } : p))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>City</Label>
            <Input
              value={profile.city ?? ""}
              onChange={(e) =>
                setProfile((p) => (p ? { ...p, city: e.target.value } : p))
              }
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label>Address</Label>
            <Input
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

        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Language</Label>
            <Select
              value={profile.language ?? "en"}
              onValueChange={(v) =>
                setProfile((p) => (p ? { ...p, language: v } : p))
              }
            >
              <SelectTrigger>
                <SelectValue />
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
                  Get notifications for your orders.
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
                  Receive news & offers.
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Confirm password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <Button
          className="mt-4"
          onClick={handlePasswordChange}
          disabled={pwSaving || !newPassword}
        >
          {pwSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Update password
        </Button>
      </section>

      {/* Mobile actions */}
      <div className="mt-6 flex justify-end gap-2 md:hidden">
        <Button variant="outline" onClick={signOut}>
          <LogOut className="mr-2 size-4" /> Sign out
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

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between p-3">
            <span className="text-sm">Unsaved changes</span>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => profile && initial && setProfile(initial)}
              >
                Discard
              </Button>

              <Button onClick={handleSave} disabled={saving}>
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
