"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type Collection = {
  id: string;
  title: string;
  cover_url: string | null;
  shop_id: string;
};

export default function SellerCollectionsPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [rows, setRows] = useState<Collection[]>([]);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user.id)
        .maybeSingle();
      if (!shop) {
        setLoading(false);
        return;
      }
      setShopId(shop.id);
      await load(shop.id);
    })();
  }, []);

  async function load(sid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("collections")
      .select("id,title,cover_url,shop_id")
      .eq("shop_id", sid)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setRows((data as any[]) ?? []);
    setLoading(false);
  }

  async function create() {
    if (!shopId || !title.trim()) return;
    setBusy("new");
    const { error } = await supabase
      .from("collections")
      .insert({
        shop_id: shopId,
        title: title.trim(),
        cover_url: cover || null,
      });
    if (error) toast.error(error.message);
    else {
      toast.success("Collection created ✅");
      setTitle("");
      setCover("");
      await load(shopId);
    }
    setBusy(null);
  }

  async function remove(id: string) {
    if (!shopId) return;
    if (
      !confirm(
        "Delete this collection? Items remain, only grouping is removed."
      )
    )
      return;
    setBusy(id);
    const { error } = await supabase.from("collections").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast("🗑️ Collection deleted");
      await load(shopId);
    }
    setBusy(null);
  }

  if (loading) return <main className="p-4">Loading…</main>;
  if (!shopId) return <main className="p-4">You don’t have a shop yet.</main>;

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Collections</h1>
        <Link href="/seller/products" className="text-xs underline">
          Back to products
        </Link>
      </header>

      <div className="rounded-2xl border bg-sand p-4 space-y-2">
        <div className="text-sm font-medium">Create new</div>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g., Embroidered Hat)"
            className="flex-1 border rounded-lg px-3 h-10 bg-white"
          />
          <input
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            placeholder="Cover image URL (optional)"
            className="flex-1 border rounded-lg px-3 h-10 bg-white"
          />
          <button
            onClick={create}
            disabled={busy === "new" || !title.trim()}
            className="rounded-lg border px-3 h-10 bg-paper hover:bg-white text-sm"
          >
            {busy === "new" ? "Saving…" : "Add"}
          </button>
        </div>
      </div>

      {!rows.length ? (
        <div className="rounded-2xl border bg-sand p-6 text-sm text-ink/70">
          No collections yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 border rounded-xl p-3 bg-sand"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-white">
                {c.cover_url ? (
                  <img
                    src={c.cover_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="grid place-items-center w-full h-full text-[10px] text-ink/40">
                    No image
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{c.title}</div>
              </div>
              <button
                onClick={() => remove(c.id)}
                disabled={busy === c.id}
                className="text-xs underline text-rose-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
