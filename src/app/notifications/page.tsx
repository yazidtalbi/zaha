// app/notifications/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Info,
  ShoppingBag,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
// If you already have a cn utility, keep your import and delete the fallback below.
// import { cn } from "@/lib/utils";

/* ---------------- types ---------------- */
type NotificationItem = {
  id: string;
  user_id: string;
  type: "order" | "review" | "system" | "promo" | string;
  title: string;
  body?: string | null;
  href?: string | null; // deep link
  created_at: string; // ISO
  read_at?: string | null;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* 1) Auth */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUid(data.user?.id ?? null);
      if (!data.user?.id) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setUid(sess?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  /* 2) Load notifications */
  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, type, title, body, href, created_at, read_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setItems((data as NotificationItem[]) ?? []);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    load();
  }, [uid, load]);

  /* 3) Realtime */
  useEffect(() => {
    if (!uid) return;
    const ch = supabase
      .channel(`notifications_${uid}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${uid}`,
        },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as NotificationItem, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? (payload.new as NotificationItem) : n
              )
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [uid]);

  /* 4) Actions */
  const markAllRead = async () => {
    if (!uid) return;
    const now = new Date().toISOString();
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", uid)
      .is("read_at", null);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now }))
    );
  };

  const markOneRead = async (id: string) => {
    const n = items.find((x) => x.id === id);
    if (!n || n.read_at) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", id);
    if (!error) {
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, read_at: now } : x))
      );
    }
  };

  /* 5) Grouping */
  const grouped = useMemo(() => groupByTime(items), [items]);
  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <main className="mx-auto max-w-screen-sm px-4 pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="gap-1"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </div>

      <Separator />

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="py-2">
          {grouped.today.length > 0 && (
            <Section
              label="Today"
              items={grouped.today}
              onOpen={handleOpen}
              onRead={markOneRead}
            />
          )}
          {grouped.thisWeek.length > 0 && (
            <Section
              label="This week"
              items={grouped.thisWeek}
              onOpen={handleOpen}
              onRead={markOneRead}
            />
          )}
          {grouped.earlier.length > 0 && (
            <Section
              label="Earlier"
              items={grouped.earlier}
              onOpen={handleOpen}
              onRead={markOneRead}
            />
          )}
        </div>
      )}
    </main>
  );

  function handleOpen(n: NotificationItem) {
    if (!n.read_at) markOneRead(n.id);
    if (n.href) {
      if (n.href.startsWith("/")) router.push(n.href);
      else window.location.href = n.href;
    }
  }
}

/* ---------------- UI blocks ---------------- */

function Section({
  label,
  items,
  onOpen,
  onRead,
}: {
  label: string;
  items: NotificationItem[];
  onOpen: (n: NotificationItem) => void;
  onRead: (id: string) => void;
}) {
  return (
    <section className="py-2">
      <h2 className="px-1 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </h2>
      <div className="overflow-hidden rounded-xl ring-1 ring-black/5 bg-white">
        {items.map((n, i) => (
          <div key={n.id}>
            <Row n={n} onOpen={() => onOpen(n)} onRead={() => onRead(n.id)} />
            {i < items.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </section>
  );
}

function Row({ n, onOpen }: { n: NotificationItem; onOpen: () => void }) {
  const Icon = pickIcon(n.type);
  const unread = !n.read_at;
  return (
    <button
      onClick={onOpen}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-sand/60 transition",
        unread && "bg-sand/50"
      )}
    >
      <div className="relative mt-0.5">
        <Icon className="h-5 w-5" />
        {unread && (
          <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-terracotta ring-2 ring-white" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-medium truncate">{n.title}</div>
          <div className="text-xs text-muted-foreground shrink-0">
            {timeAgo(n.created_at)}
          </div>
        </div>
        {n.body ? (
          <div className="mt-0.5 text-[13px] text-neutral-700 line-clamp-2">
            {n.body}
          </div>
        ) : null}
      </div>

      <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-sand">
        <Bell className="h-6 w-6" />
      </div>
      <div className="text-base font-medium">You’re all caught up</div>
      <div className="text-sm text-muted-foreground">No notifications yet.</div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function pickIcon(type: string) {
  switch (type) {
    case "order":
      return ShoppingBag;
    case "review":
      return Star;
    case "system":
    case "promo":
    default:
      return Info;
  }
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  return `${wk}w`;
}

/** Group into Today / This week / Earlier */
function groupByTime(items: NotificationItem[]) {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Start of week (Sunday); if you prefer Monday, adjust getDay logic.
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const today: NotificationItem[] = [];
  const thisWeek: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];

  for (const n of items) {
    const created = new Date(n.created_at);
    if (created >= startOfDay) {
      today.push(n);
    } else if (created >= startOfWeek) {
      thisWeek.push(n);
    } else {
      earlier.push(n);
    }
  }
  return { today, thisWeek, earlier };
}

/** Minimal cn fallback if you don't have one */
function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
