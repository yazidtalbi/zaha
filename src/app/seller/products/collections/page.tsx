// app/seller/products/collections.tsx
"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  ImagePlus,
  Search as SearchIcon,
  Loader2,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";

import {
  Sheet,
  SheetContent,
  SheetHeader as SheetHead,
  SheetTitle as SheetT,
  SheetFooter as SheetF,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical } from "lucide-react";

type Collection = {
  id: string;
  title: string;
  cover_url: string | null;
  shop_id: string;
  created_at?: string;
};

type WithCount = Collection & { items_count?: number };

const PAGE_SIZE = 20;

function CollectionItemsDrawer({
  open,
  onOpenChange,
  collection,
  shopId,
  allCollections,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  collection: { id: string; title: string } | null;
  shopId: string;
  allCollections: { id: string; title: string }[];
}) {
  // NOTE: This assumes products have FK products.collection_id -> collections.id.
  // If you use a M2M table (product_collections), replace the load/mutate queries accordingly.

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const PAGE = 24;

  useEffect(() => {
    if (!open || !collection) return;
    setItems([]);
    setPage(1);
    setSelected({});
    void loadPage(collection.id, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collection?.id]);

  async function loadPage(cid: string, pageNum = 1, replace = false) {
    setLoading(true);
    const from = (pageNum - 1) * PAGE;
    const to = from + PAGE - 1;

    let query = supabase
      .from("products")
      .select("id,title,price_mad,photos,collection_id,position", {
        count: "estimated",
      })
      .eq("shop_id", shopId)
      .eq("collection_id", cid)
      .order("position", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    if (q.trim()) {
      // simple title search (adjust to your FTS strategy if you have one)
      query = query.ilike("title", `%${q.trim()}%`);
    }

    const { data, error, count } = await query.range(from, to);
    if (error) console.error(error);
    setItems((prev) => (replace ? (data ?? []) : [...prev, ...(data ?? [])]));
    setHasMore((count ?? 0) > to + 1);
    setPage(pageNum);
    setLoading(false);
  }

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([id]) => id),
    [selected]
  );
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.id] = checked;
    setSelected(next);
  };

  function thumbOf(it: any) {
    const p =
      Array.isArray(it.photos) && it.photos.length ? it.photos[0] : null;
    return p || "/placeholder.svg";
  }

  async function moveOne(productId: string, toCollectionId: string | null) {
    setBusyIds((m) => ({ ...m, [productId]: true }));
    const { error } = await supabase
      .from("products")
      .update({ collection_id: toCollectionId })
      .eq("id", productId);
    if (error) toast.error(error.message);
    else {
      setItems((prev) => prev.filter((x) => x.id !== productId)); // remove from current drawer list
      toast.success(toCollectionId ? "Item moved" : "Item unassigned");
    }
    setBusyIds((m) => ({ ...m, [productId]: false }));
  }

  async function bulkMove(toCollectionId: string | null) {
    if (!selectedIds.length) return;
    const { error } = await supabase
      .from("products")
      .update({ collection_id: toCollectionId })
      .in("id", selectedIds);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((x) => !selectedIds.includes(x.id)));
    setSelected({});
    toast.success(toCollectionId ? "Items moved" : "Items unassigned");
  }

  async function removeFromCollection(productId: string) {
    await moveOne(productId, null);
  }
  async function bulkRemove() {
    await bulkMove(null);
  }

  // Optional: simple drag-reorder (requires a 'position' column)
  const dragging = useRef<string | null>(null);
  function onDragStart(e: React.DragEvent, id: string) {
    dragging.current = id;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    const dragId = dragging.current;
    if (!dragId || dragId === overId) return;
    const a = items.findIndex((x) => x.id === dragId);
    const b = items.findIndex((x) => x.id === overId);
    if (a === -1 || b === -1) return;
    const next = items.slice();
    const [moved] = next.splice(a, 1);
    next.splice(b, 0, moved);
    setItems(next);
  }
  async function onDragEnd() {
    if (!items.length) return;
    dragging.current = null;
    // Persist new order if you have 'position'
    const updates = items.map((it, idx) => ({ id: it.id, position: idx + 1 }));
    const { error } = await supabase.from("products").upsert(updates);
    if (error) toast.error("Failed to save order");
    else toast.success("Order saved");
  }

  const moveTargets = useMemo(
    () => [
      { id: "none", title: "Unassigned" },
      ...allCollections.filter((c) => c.id !== collection?.id),
    ],
    [allCollections, collection?.id]
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-0">
        <div className="sticky top-0 z-10 border-b bg-white">
          <div className="px-4 py-3">
            <SheetHead>
              <SheetT>
                {collection ? `Items in “${collection.title}”` : "Items"}
              </SheetT>
            </SheetHead>

            {/* Top toolbar */}
            <div className="mt-2 flex flex-col md:flex-row md:items-center gap-2">
              <div className="flex items-center gap-3 text-sm">
                <Checkbox
                  checked={
                    items.length > 0 && selectedIds.length === items.length
                  }
                  onCheckedChange={(v) => toggleAll(!!v)}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-ink/70">
                  Select all
                </label>
                <span className="text-ink/50">•</span>
                <span className="text-ink/70">
                  {selectedIds.length} selected
                </span>
              </div>

              <div className="flex-1" />

              <div className="flex gap-2">
                {/* Bulk move */}
                <Select
                  onValueChange={(v) => bulkMove(v === "none" ? null : v)}
                >
                  <SelectTrigger className="h-9 w-40">
                    <SelectValue placeholder="Move to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {moveTargets.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-9"
                  onClick={bulkRemove}
                  disabled={!selectedIds.length}
                >
                  Remove from this
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-2">
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  // reload from page 1
                  if (collection) void loadPage(collection.id, 1, true);
                }}
                placeholder="Search in this collection…"
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="p-4">
          {loading && items.length === 0 ? (
            <div className="text-sm text-ink/60">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-ink/60">No items here.</div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 p-3 bg-white"
                  draggable
                  onDragStart={(e) => onDragStart(e, it.id)}
                  onDragOver={(e) => onDragOver(e, it.id)}
                  onDragEnd={onDragEnd}
                >
                  <button className="p-1 rounded hover:bg-gray-50 cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4 text-ink/40" />
                  </button>

                  <Checkbox
                    checked={!!selected[it.id]}
                    onCheckedChange={(v) =>
                      setSelected((m) => ({ ...m, [it.id]: !!v }))
                    }
                  />

                  <div className="w-14 h-14 rounded-md overflow-hidden border shrink-0 bg-white">
                    <img
                      src={thumbOf(it)}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-xs text-ink/60">
                      {it.price_mad} MAD
                    </div>
                  </div>

                  {/* Classify (move) */}
                  <div className="w-[180px]">
                    <Select
                      defaultValue={collection?.id ?? "none"}
                      onValueChange={(v) =>
                        moveOne(it.id, v === "none" ? null : v)
                      }
                      disabled={!!busyIds[it.id]}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {allCollections.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="ghost"
                    className="h-9"
                    onClick={() => removeFromCollection(it.id)}
                    disabled={!!busyIds[it.id]}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {hasMore && (
            <div className="mt-3">
              <Button
                variant="outline"
                onClick={() =>
                  collection && loadPage(collection.id, page + 1, false)
                }
              >
                Load more
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function SellerCollectionsPage() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const [shopId, setShopId] = useState<string | null>(null);
  const [rows, setRows] = useState<WithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // create form
  const [newTitle, setNewTitle] = useState("");
  const [newCoverUrl, setNewCoverUrl] = useState("");
  const [newCoverFile, setNewCoverFile] = useState<File | null>(null);
  const [busyCreate, setBusyCreate] = useState(false);

  // search/sort
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"new" | "az">("new");

  // edit dialog
  const [editing, setEditing] = useState<WithCount | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [busyEdit, setBusyEdit] = useState(false);

  // delete
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);

  const [drawer, setDrawer] = useState<{
    open: boolean;
    collection: WithCount | null;
  }>({
    open: false,
    collection: null,
  });

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: shop, error } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user.id)
        .maybeSingle();
      if (error) console.error(error);
      if (!shop) {
        setLoading(false);
        return;
      }
      setShopId(shop.id);
    })();
  }, []);

  useEffect(() => {
    if (!shopId) return;
    void load(shopId, 1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  // realtime updates
  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel("collections-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collections",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRows((prev) => [
              { ...(payload.new as Collection), items_count: 0 },
              ...prev,
            ]);
            // refresh count for the inserted one
            void refreshCounts([(payload.new as Collection).id]);
          } else if (payload.eventType === "UPDATE") {
            setRows((prev) =>
              prev.map((r) =>
                r.id === (payload.new as any).id
                  ? { ...(payload.new as any), items_count: r.items_count }
                  : r
              )
            );
          } else if (payload.eventType === "DELETE") {
            setRows((prev) =>
              prev.filter((r) => r.id !== (payload.old as any).id)
            );
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  async function load(sid: string, pageNum = 1, replace = false) {
    setLoading(true);
    const from = (pageNum - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("collections")
      .select("id,title,cover_url,shop_id,created_at", { count: "estimated" })
      .eq("shop_id", sid)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) console.error(error);
    const arr = ((data as Collection[]) ?? []).map((c) => ({
      ...c,
      items_count: undefined,
    }));
    setRows((prev) => (replace ? arr : [...prev, ...arr]));
    setHasMore((count ?? 0) > to + 1);
    setPage(pageNum);
    setLoading(false);

    // fetch counts for these collections
    void refreshCounts(arr.map((c) => c.id));
  }

  // Counts products per collection (FK: products.collection_id)
  async function refreshCounts(collectionIds: string[]) {
    // naive but reliable: one HEAD count query per collection
    // (OK for small/medium N; switch to a view/RPC if you need bulk)
    const updates = await Promise.allSettled(
      collectionIds.map(async (cid) => {
        const { count, error } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("collection_id", cid)
          .eq("active", true); // optional filter if you only want active items
        if (error) throw error;
        return { cid, count: count ?? 0 };
      })
    );

    const map: Record<string, number> = {};
    for (const u of updates) {
      if (u.status === "fulfilled") {
        map[u.value.cid] = u.value.count;
      }
    }
    if (Object.keys(map).length) {
      setRows((prev) =>
        prev.map((r) =>
          map[r.id] !== undefined ? { ...r, items_count: map[r.id] } : r
        )
      );
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = !needle
      ? rows
      : rows.filter((r) => r.title.toLowerCase().includes(needle));
    if (sort === "az") {
      out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    } else {
      out = [...out].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      );
    }
    return out;
  }, [rows, q, sort]);

  async function handleUploadToStorage(file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${shopId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("collection-covers")
      .upload(path, file, { upsert: false });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage
      .from("collection-covers")
      .getPublicUrl(path);
    return pub?.publicUrl ?? null;
  }

  async function create() {
    if (!shopId) return;
    const title = newTitle.trim();
    if (!title) return;

    setBusyCreate(true);
    try {
      let coverUrl = newCoverUrl.trim() || null;
      if (newCoverFile) {
        coverUrl = await handleUploadToStorage(newCoverFile);
      }
      const optimistic: WithCount = {
        id: `temp-${crypto.randomUUID()}`,
        title,
        cover_url: coverUrl,
        shop_id: shopId,
        created_at: new Date().toISOString(),
        items_count: 0,
      };
      setRows((prev) => [optimistic, ...prev]);

      const { data, error } = await supabase
        .from("collections")
        .insert({ shop_id: shopId, title, cover_url: coverUrl })
        .select("id,title,cover_url,shop_id,created_at")
        .single();

      if (error) {
        setRows((prev) => prev.filter((r) => r.id !== optimistic.id));
        throw error;
      }
      setRows((prev) => [
        { ...(data as Collection), items_count: 0 },
        ...prev.filter((r) => r.id !== optimistic.id),
      ]);
      setNewTitle("");
      setNewCoverUrl("");
      setNewCoverFile(null);
      toast.success("Collection created ✅");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create collection");
    } finally {
      setBusyCreate(false);
    }
  }

  function startEdit(c: WithCount) {
    setEditing(c);
    setEditTitle(c.title);
    setEditCoverUrl(c.cover_url || "");
    setEditCoverFile(null);
  }

  async function saveEdit() {
    if (!editing) return;
    setBusyEdit(true);
    const original = editing;
    const updated: WithCount = {
      ...editing,
      title: editTitle.trim() || editing.title,
      cover_url: editCoverUrl.trim() || null,
    };

    try {
      setRows((prev) => prev.map((r) => (r.id === original.id ? updated : r)));

      let coverUrl = editCoverUrl.trim() || null;
      if (editCoverFile) {
        coverUrl = await handleUploadToStorage(editCoverFile);
        updated.cover_url = coverUrl;
        setRows((prev) =>
          prev.map((r) => (r.id === original.id ? { ...updated } : r))
        );
      }

      const { error } = await supabase
        .from("collections")
        .update({ title: updated.title, cover_url: coverUrl })
        .eq("id", original.id);

      if (error) {
        setRows((prev) =>
          prev.map((r) => (r.id === original.id ? original : r))
        );
        throw error;
      }
      toast.success("Collection updated ✨");
      setEditing(null);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to update");
    } finally {
      setBusyEdit(false);
    }
  }

  async function remove(id: string) {
    if (!shopId) return;
    if (
      !confirm(
        "Delete this collection? Items remain; only grouping is removed."
      )
    ) {
      return;
    }
    setBusyDeleteId(id);
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== id));

    try {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", id);
      if (error) {
        setRows(prev);
        throw error;
      }
      toast("🗑️ Collection deleted");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to delete");
    } finally {
      setBusyDeleteId(null);
    }
  }

  if (loading && !shopId) return <main className="p-4">Loading…</main>;
  if (!shopId) return <main className="p-4">You don’t have a shop yet.</main>;

  return (
    <main className="p-4 space-y-5">
      {/* Header (breadcrumb + dashboard title) */}
      <div className="flex flex-col gap-3">
        <nav className="text-xs text-ink/60 flex items-center gap-2">
          <Link href="/seller/products" className="hover:underline">
            Products
          </Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="text-ink">Collections</span>
        </nav>

        <DashboardHeader
          title="Collections"
          subtitle="Manage your collections"
          withDivider={false}
          withBackButton={false}
        />
      </div>

      {/* Create new (no sand bg) */}
      <section className="rounded-2xl border bg-white p-4 space-y-3">
        <div className="text-sm font-medium flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create new
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.2fr_auto] gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="rounded-lg"
            placeholder="Title (e.g., Embroidered Hat)"
          />
          <div className="flex gap-2">
            <Input
              value={newCoverUrl}
              onChange={(e) => setNewCoverUrl(e.target.value)}
              placeholder="Cover image URL (optional)"
              className="flex-1 rounded-lg"
            />
            <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border bg-white hover:bg-gray-50 text-sm cursor-pointer">
              <Upload className="h-4 w-4" />
              <span>File</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setNewCoverFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button
            onClick={create}
            disabled={busyCreate || !newTitle.trim()}
            className="md:justify-self-end"
          >
            {busyCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
          </Button>
        </div>

        {/* Bottom Drawer: Collection Items */}
        <CollectionItemsDrawer
          open={drawer.open}
          onOpenChange={(v) => setDrawer((d) => ({ ...d, open: v }))}
          collection={drawer.collection}
          shopId={shopId!}
          allCollections={rows}
        />

        {(newCoverUrl || newCoverFile) && (
          <div className="flex items-center gap-3 text-xs text-ink/70">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border">
              <img
                src={
                  newCoverFile ? URL.createObjectURL(newCoverFile) : newCoverUrl
                }
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <span>Preview</span>
          </div>
        )}
      </section>

      {/* Toolbar */}
      <section className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search collections…"
            className="pl-9"
          />
          <SearchIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/50" />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sort" className="text-xs text-ink/60">
            Sort
          </Label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="h-10 rounded-lg border bg-white px-2 text-sm"
          >
            <option value="new">Newest</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </section>

      {/* List */}
      {loading && rows.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-3">
              <Skeleton className="w-full aspect-4/3 rounded-lg" />
              <Skeleton className="h-4 mt-3 w-2/3" />
              <Skeleton className="h-8 mt-3 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-ink/70 grid place-items-center">
          <div className="text-center space-y-2">
            <ImagePlus className="mx-auto h-6 w-6 opacity-60" />
            <p>No collections {q ? "match your search." : "yet."}</p>
            {!q && (
              <p className="text-xs">
                Create your first collection to group products and feature them
                on your shop page.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border bg-white p-3 flex flex-col"
              >
                <div className="w-full aspect-4/3 rounded-lg overflow-hidden bg-white">
                  {c.cover_url ? (
                    <img
                      src={c.cover_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="grid place-items-center w-full h-full text-[11px] text-ink/40">
                      No image
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.title}</div>
                    <div className="text-xs text-ink/60">
                      {c.items_count === undefined
                        ? "…"
                        : `${c.items_count} item${(c.items_count ?? 0) === 1 ? "" : "s"}`}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(c)}
                  >
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDrawer({ open: true, collection: c })}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View items
                  </Button> */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(c.id)}
                    disabled={busyDeleteId === c.id}
                  >
                    {busyDeleteId === c.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => shopId && load(shopId, page + 1, false)}
              >
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Collection title"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <div className="space-y-1">
                <Label htmlFor="edit-cover-url">Cover URL</Label>
                <Input
                  id="edit-cover-url"
                  value={editCoverUrl}
                  onChange={(e) => setEditCoverUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-1">
                <Label>Upload file</Label>
                <label className="inline-flex items-center gap-2 px-3 h-10 rounded-lg border bg-white hover:bg-gray-50 text-sm cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Choose</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      setEditCoverFile(e.target.files?.[0] ?? null)
                    }
                  />
                </label>
              </div>
            </div>

            {(editCoverUrl || editCoverFile) && (
              <div className="flex items-center gap-3 text-xs text-ink/70">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-white border">
                  <img
                    src={
                      editCoverFile
                        ? URL.createObjectURL(editCoverFile)
                        : editCoverUrl
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <span>Preview</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={busyEdit || !editTitle.trim()}>
              {busyEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
