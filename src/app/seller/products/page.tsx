"use client";

import RequireAuth from "@/components/RequireAuth";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

// ————————————————————————————————————————
// shadcn/ui bits (assumed installed in your project)
// ————————————————————————————————————————
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

// ————————————————————————————————————————
// icons (lucide)
// ————————————————————————————————————————
import {
  ChevronDown,
  Plus,
  Settings,
  Filter,
  Search,
  MoreHorizontal,
  CheckCircle2,
  Ban,
  Pencil,
  Eye,
  Trash2,
  FolderPlus,
  Check,
  X,
  Loader2,
  Tag,
  CornerDownRight,
} from "lucide-react";

function ProductsHeaderCompact({
  counts,
  q,
  setQ,
  statusFilter,
  setStatusFilter,
  sortBy,
  setSortBy,
}: {
  counts: { total: number; active: number; inactive: number };
  q: string;
  setQ: (v: string) => void;
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (v: "all" | "active" | "inactive") => void;
  sortBy: "newest" | "title" | "price";
  setSortBy: (v: "newest" | "title" | "price") => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // press "/" to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing =
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA" ||
        t?.isContentEditable;
      if (!typing && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pill = (active: boolean) =>
    [
      "px-4 h-8 rounded-full border text-sm inline-flex items-center gap-2 shrink-0",
      active ? "bg-terracotta text-white  " : "bg-white text-ink/90 ",
    ].join(" ");

  /** Floating “Add” button that clears the bottom nav + safe area */
  function FabAddNew({ navHeight = 64 }: { navHeight?: number }) {
    return (
      <Link
        href="/seller/sell"
        aria-label="Add new product"
        className="fixed right-5 md:right-8 z-50"
        style={{
          // keep above iOS safe area + bottom nav + a small margin
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${navHeight}px + 12px)`,
        }}
      >
        <button
          className="h-12 w-12 rounded-full bg-terracotta text-white shadow-lg shadow-black/20
                   grid place-items-center border border-black/5
                   active:scale-95 transition"
        >
          <Plus className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </Link>
    );
  }

  return (
    <header className="mb-3">
      {/* Title */}
      <div className=" ">
        {" "}
        <p className="text-neutral-400 text-sm">Najoua Shop</p>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <FabAddNew navHeight={80} />
      </div>

      {/* Big pill search */}
      <div className="mt-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink/50" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all products"
          className="h-14 pl-12 pr-12 text-base rounded-full border-0 bg-neutral-100"
        />
        {!!q && (
          <button
            aria-label="Clear"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center h-8 w-8 rounded-full hover:bg-neutral-50d text-ink/60"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* One-line, horizontally scrollable controls */}
      <div
        className="mt-3 -mx-4 px-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Filters"
      >
        <div className="inline-flex items-center gap-2">
          {/* Status dropdown pill */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <SelectTrigger
              className={pill(false) + " w-auto inline-flex shadow-none"}
            >
              <SelectValue>
                {statusFilter[0].toUpperCase() + statusFilter.slice(1)}
              </SelectValue>
            </SelectTrigger>

            <SelectContent className="rounded-xl">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort pills */}
          <button
            className={pill(sortBy === "newest")}
            onClick={() => setSortBy("newest")}
          >
            Newest
          </button>
          <button
            className={pill(sortBy === "title")}
            onClick={() => setSortBy("title")}
          >
            Title (A–Z)
          </button>
          <button
            className={pill(sortBy === "price")}
            onClick={() => setSortBy("price")}
          >
            Price (low)
          </button>
        </div>
      </div>

      {/* Counts + Add new (small text) */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <p className="text-xs text-ink/70">
          {counts.total} total · {counts.active} active · {counts.inactive}{" "}
          inactive
        </p>
      </div>
    </header>
  );
}

/* ---------------- Types ---------------- */
type Product = {
  id: string;
  title: string;
  price_mad: number;
  orders_count: number;
  active: boolean;
  photos: string[] | null;
  created_at: string;
  shop_id: string;
};

type Collection = { id: string; title: string };

export default function SellerProducts() {
  return (
    <RequireAuth>
      <Inner />
    </RequireAuth>
  );
}

function Inner() {
  const PAGE_SIZE = 20;

  const [shopId, setShopId] = useState<string | null>(null);
  const [rows, setRows] = useState<Product[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [productMap, setProductMap] = useState<Record<string, string[]>>({}); // product_id -> collection_ids[]
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // UI state
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const qTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "price">("newest");

  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.keys(bulk).filter((k) => bulk[k]),
    [bulk]
  );

  // ————————————————————————————————————————
  // 1) Get current shop ID once
  // ————————————————————————————————————————
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }
      const { data: shop, error } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", uid)
        .maybeSingle();
      if (error) console.error(error.message);
      if (shop) setShopId(shop.id);
      setLoading(false);
    })();
  }, []);

  // Debounce search
  useEffect(() => {
    if (qTimer.current) clearTimeout(qTimer.current);
    qTimer.current = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => {
      if (qTimer.current) clearTimeout(qTimer.current);
    };
  }, [q]);

  // ————————————————————————————————————————
  // Data loaders
  // ————————————————————————————————————————
  async function loadCollectionsAndLinks(sid: string) {
    const [{ data: cols, error: ec }, { data: links, error: el }] =
      await Promise.all([
        supabase
          .from("collections")
          .select("id,title")
          .eq("shop_id", sid)
          .order("title"),
        supabase
          .from("product_collections")
          .select("product_id, collection_id"),
      ]);
    if (ec) toast.error(ec.message);
    if (el) toast.error(el.message);

    setCollections((cols as any[]) ?? []);

    const map: Record<string, string[]> = {};
    (links as any[])?.forEach(
      (l: { product_id: string; collection_id: string }) => {
        if (!map[l.product_id]) map[l.product_id] = [];
        map[l.product_id].push(l.collection_id);
      }
    );
    setProductMap(map);
  }

  function productsQueryBase(sid: string) {
    let query = supabase
      .from("products")
      .select(
        "id,title,price_mad,orders_count,active,photos,created_at,shop_id",
        {
          count: "exact",
        }
      )
      .eq("shop_id", sid);

    if (statusFilter !== "all") {
      query = query.eq("active", statusFilter === "active");
    }
    if (qDebounced) {
      // simple ilike search on title
      query = query.ilike("title", `%${qDebounced}%`);
    }
    if (sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "title") {
      query = query.order("title", { ascending: true });
    } else if (sortBy === "price") {
      query = query.order("price_mad", { ascending: true });
    }
    return query;
  }

  async function loadFirstPage(sid: string) {
    setLoading(true);
    const query = productsQueryBase(sid).range(0, PAGE_SIZE - 1);
    const { data, error, count } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setRows((data as any[]) ?? []);
    setHasMore(((count ?? 0) as number) > PAGE_SIZE);
    setLoading(false);
    // reset bulk selection when data changes
    setBulk({});
  }

  async function loadMore() {
    if (!shopId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const start = rows.length;
    const end = start + PAGE_SIZE - 1;
    const { data, error } = await productsQueryBase(shopId).range(start, end);
    if (error) toast.error(error.message);
    if (data?.length) {
      setRows((prev) => [...prev, ...(data as any[])]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }

  // initial + when filters/search/sort change
  useEffect(() => {
    if (!shopId) return;
    (async () => {
      await Promise.all([
        loadCollectionsAndLinks(shopId),
        loadFirstPage(shopId),
      ]);
    })();
  }, [shopId, statusFilter, qDebounced, sortBy]);

  /* ---------------- Derived counts ---------------- */
  const counts = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.active).length;
    return { total, active, inactive: total - active };
  }, [rows]);

  /* ---------------- Actions ---------------- */
  async function toggleActive(id: string, next: boolean) {
    setBusyId(id);
    const old = rows;
    setRows((r) => r.map((x) => (x.id === id ? { ...x, active: next } : x)));
    const { error } = await supabase
      .from("products")
      .update({ active: next })
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      setRows(old); // revert
    } else {
      toast.success(next ? "Activated" : "Deactivated");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setBusyId(id);
    const old = rows;
    setRows((r) => r.filter((x) => x.id !== id));
    const { error } = await supabase.from("products").delete().eq("id", id);
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      setRows(old);
    } else {
      toast.success("Deleted");
    }
  }

  async function bulkActivate(next: boolean) {
    if (!selectedIds.length) return;
    const old = rows;
    setRows((r) =>
      r.map((x) => (selectedIds.includes(x.id) ? { ...x, active: next } : x))
    );
    const { error } = await supabase
      .from("products")
      .update({ active: next })
      .in("id", selectedIds);
    if (error) {
      toast.error(error.message);
      setRows(old);
    } else {
      toast.success(next ? "Activated selected" : "Deactivated selected");
    }
  }

  async function bulkDelete() {
    if (!selectedIds.length) return;
    if (
      !confirm(
        `Delete ${selectedIds.length} product(s)? This cannot be undone.`
      )
    )
      return;
    const old = rows;
    setRows((r) => r.filter((x) => !selectedIds.includes(x.id)));
    const { error } = await supabase
      .from("products")
      .delete()
      .in("id", selectedIds);
    if (error) {
      toast.error(error.message);
      setRows(old);
    } else {
      toast.success("Deleted selected");
      setBulk({});
    }
  }

  async function createCollectionQuick(title: string) {
    if (!shopId) return;
    const { data, error } = await supabase
      .from("collections")
      .insert({ title, shop_id: shopId })
      .select("id,title")
      .single();
    if (error) return toast.error(error.message);
    setCollections((prev) => [...prev, data as any]);
    toast.success("Collection created");
    return (data as any).id as string;
  }

  async function setCollectionsFor(productId: string, nextIds: string[]) {
    const prev = productMap[productId] ?? [];
    const prevSet = new Set(prev);
    const nextSet = new Set(nextIds);

    const toInsert = [...nextSet].filter((x) => !prevSet.has(x));
    const toDelete = [...prevSet].filter((x) => !nextSet.has(x));

    if (toInsert.length) {
      const { error } = await supabase
        .from("product_collections")
        .insert(
          toInsert.map((cid) => ({ product_id: productId, collection_id: cid }))
        );
      if (error) return toast.error(error.message);
    }
    if (toDelete.length) {
      const { error } = await supabase
        .from("product_collections")
        .delete()
        .in("collection_id", toDelete)
        .eq("product_id", productId);
      if (error) return toast.error(error.message);
    }
    setProductMap((m) => ({ ...m, [productId]: nextIds }));
    toast.success("Collections updated ✅");
  }

  async function bulkAddToCollections(targetIds: string[]) {
    if (!selectedIds.length || !targetIds.length) return;
    const inserts = selectedIds.flatMap((pid) => {
      const existing = new Set(productMap[pid] ?? []);
      const toAdd = targetIds.filter((cid) => !existing.has(cid));
      return toAdd.map((cid) => ({ product_id: pid, collection_id: cid }));
    });
    if (!inserts.length) {
      toast.message("Nothing to add");
      return;
    }
    const { error } = await supabase
      .from("product_collections")
      .insert(inserts);
    if (error) return toast.error(error.message);
    // update local map
    setProductMap((m) => {
      const copy = { ...m };
      selectedIds.forEach((pid) => {
        const merged = new Set([...(copy[pid] ?? []), ...targetIds]);
        copy[pid] = [...merged];
      });
      return copy;
    });
    toast.success("Added to collections");
    setBulk({});
    setBulkOpen(false);
  }

  if (loading) {
    return (
      <main className="p-4 space-y-4 max-w-screen-sm mx-auto">
        <ProductsHeaderCompact
          counts={counts}
          q={q}
          setQ={setQ}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />

        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 space-y-2">
              <Skeleton className="w-14 h-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!shopId) {
    return (
      <main className="p-4 max-w-screen-sm mx-auto">
        <div className="rounded-2xl border bg-neutral-50d p-6">
          <p className="text-sm text-ink/80">
            You don’t have a shop yet. Create one to start listing products.
          </p>
          <Link
            href="/seller/create-shop"
            className="inline-block mt-3 rounded-xl border px-4 py-2 text-sm bg-paper hover:bg-white"
          >
            Create shop
          </Link>
        </div>
      </main>
    );
  }

  // client filters (for local search feel after server filtering)
  const shown = rows;

  return (
    <main className="pb-28 px-4 max-w-screen-sm mx-auto">
      <ProductsHeaderCompact
        counts={counts}
        q={q}
        setQ={setQ}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      {/* Toolbar */}

      {/* List */}
      {/* List */}
      {!shown.length ? (
        <EmptyState />
      ) : (
        <ul className="mt-3 space-y-2">
          {shown.map((p) => {
            const img = Array.isArray(p.photos) ? p.photos[0] : undefined;
            const selectedCollections = productMap[p.id] || [];

            const maxChips = 3;
            const chipsToShow = selectedCollections.slice(0, maxChips);
            const extra = Math.max(0, selectedCollections.length - maxChips);

            return (
              <li key={p.id} className="flex items-center gap-3 space-y-2">
                {/* Thumb */}
                <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shrink-0">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-ink/40">
                      No image
                    </div>
                  )}
                </div>

                {/* Middle */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${p.id}`}
                    className="block font-semibold truncate hover:underline"
                  >
                    {p.title}
                  </Link>

                  {/* Metadata line */}
                  <div className="mt-0.5 text-xs text-ink/70 flex items-center gap-1">
                    <span
                      className={[
                        "px-2 py-0.5 rounded-full text-[11px] font-medium",
                        p.active
                          ? "bg-green-100 text-green-800 "
                          : "bg-neutral-100 text-neutral-700 ",
                      ].join(" ")}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </span>

                    <span className="ml-1">{p.orders_count ?? 0} orders</span>
                    <span>·</span>
                    <span className=" ">MAD {p.price_mad}</span>
                  </div>

                  {/* Collections chips */}
                  {!!selectedCollections.length && (
                    <div className="mt-1 flex items-center flex-wrap gap-1">
                      {/* The icon */}
                      <CornerDownRight className="h-3 w-3 text-ink/40 mr-1" />

                      {/* Chips */}
                      {chipsToShow.map((cid) => {
                        const c = collections.find((x) => x.id === cid);
                        return c ? (
                          <span
                            key={cid}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-ink/10"
                          >
                            {c.title}
                          </span>
                        ) : null;
                      })}
                      {extra > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-ink/10">
                          +{extra}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: kebab menu with icons */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    className="rounded-xl min-w-44 p-1 flex flex-col space-y-1"
                  >
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/seller/edit/${p.id}`}
                        className="flex items-center gap-2"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href={`/product/${p.id}`}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => setPickerOpenFor(p.id)}
                      className="flex items-center gap-2"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Add to collection
                    </DropdownMenuItem>

                    {/* Divider */}
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-rose-600 flex items-center gap-2"
                      onClick={() => remove(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      {/* Load more */}
      {hasMore && (
        <div className="mt-3">
          <Button
            disabled={loadingMore}
            onClick={loadMore}
            className="w-full rounded-xl"
            variant="secondary"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}

      {/* Collections Sheet (per-product) */}
      <Sheet
        open={!!pickerOpenFor}
        onOpenChange={(o) => !o && setPickerOpenFor(null)}
      >
        <SheetContent side="bottom" className="rounded-t-2xl">
          {pickerOpenFor && (
            <CollectionsSheetContent
              productId={pickerOpenFor}
              all={collections}
              value={productMap[pickerOpenFor] || []}
              onChange={setCollectionsFor}
              onCreate={createCollectionQuick}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Bulk Add to Collections */}
      <Sheet open={bulkOpen} onOpenChange={setBulkOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Add selected to collections</SheetTitle>
            <SheetDescription>
              Choose one or more collections. We’ll add only the missing links.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-3">
            <CollectionsChooser
              all={collections}
              onConfirm={bulkAddToCollections}
              onCreate={createCollectionQuick}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

/* ---------------- UI bits ---------------- */

function HeaderBar({
  counts,
}: {
  counts: { total: number; active: number; inactive: number };
}) {
  return (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold">My Products</h1>
        <p className="text-xs text-ink/60">
          {counts.total} total · {counts.active} active · {counts.inactive}{" "}
          inactive
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/seller/collections"
          className="rounded-xl border px-3 py-2 text-sm bg-paper hover:bg-white inline-flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Manage collections
        </Link>
        <Link
          href="/sell"
          className="rounded-xl border px-3 py-2 text-sm bg-paper hover:bg-white inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add new
        </Link>
      </div>
    </header>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={`text-[11px] rounded-full ${
        active
          ? "bg-green-200 text-green-900"
          : "bg-neutral-200 text-neutral-700"
      }`}
    >
      {active ? "active" : "inactive"}
    </Badge>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-neutral-50 p-6 text-center">
      <div className="text-sm text-ink/70">No products yet.</div>
      <Link
        href="/sell"
        className="inline-block mt-3 rounded-xl border px-4 py-2 text-sm bg-paper hover:bg-white"
      >
        Add your first product
      </Link>
    </div>
  );
}

/* ---------------- Collections Sheet (per-product) ---------------- */

function CollectionsSheetContent({
  productId,
  all,
  value,
  onChange,
  onCreate,
}: {
  productId: string;
  all: Collection[];
  value: string[];
  onChange: (productId: string, next: string[]) => Promise<void> | void;
  onCreate: (title: string) => Promise<string | void>;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set(value));
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => setSelected(new Set(value)), [value]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? all.filter((c) => c.title.toLowerCase().includes(s)) : all;
  }, [all, search]);

  return (
    <div className="space-y-3">
      <SheetHeader>
        <SheetTitle>Edit collections</SheetTitle>
        <SheetDescription>
          Select collections for this product.
        </SheetDescription>
      </SheetHeader>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collections…"
          className="pl-9 rounded-xl bg-paper"
        />
      </div>

      <div className="max-h-72 overflow-auto space-y-1">
        {filtered.map((c) => {
          const checked = selected.has(c.id);
          return (
            <label
              key={c.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50d cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => {
                  const next = new Set(selected);
                  v ? next.add(c.id) : next.delete(c.id);
                  setSelected(next);
                }}
              />
              <span className="text-sm truncate">{c.title}</span>
            </label>
          );
        })}
        {!filtered.length && (
          <div className="text-xs text-ink/60 px-2 py-2">No results</div>
        )}
      </div>

      {!creating ? (
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => setCreating(true)}
        >
          Create new collection
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Collection title"
            className="rounded-xl"
          />
          <Button
            className="rounded-xl"
            onClick={async () => {
              const t = newTitle.trim();
              if (!t) return;
              const id = await onCreate(t);
              if (id) {
                setSelected((prev) => new Set(prev).add(id as string));
                setNewTitle("");
                setCreating(false);
              }
            }}
          >
            Save
          </Button>
        </div>
      )}

      <div className="pt-1" />

      <Button
        className="w-full rounded-xl"
        onClick={() => onChange(productId, [...selected])}
      >
        Save changes
      </Button>
    </div>
  );
}

/* ---------------- Collections Chooser (bulk) ---------------- */

function CollectionsChooser({
  all,
  onConfirm,
  onCreate,
}: {
  all: Collection[];
  onConfirm: (ids: string[]) => void | Promise<void>;
  onCreate: (title: string) => Promise<string | void>;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? all.filter((c) => c.title.toLowerCase().includes(s)) : all;
  }, [all, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search collections…"
          className="pl-9 rounded-xl bg-paper"
        />
      </div>

      <div className="max-h-72 overflow-auto space-y-1">
        {filtered.map((c) => {
          const checked = selected.has(c.id);
          return (
            <label
              key={c.id}
              className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-neutral-50d cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => {
                  const next = new Set(selected);
                  v ? next.add(c.id) : next.delete(c.id);
                  setSelected(next);
                }}
              />
              <span className="text-sm truncate">{c.title}</span>
            </label>
          );
        })}
        {!filtered.length && (
          <div className="text-xs text-ink/60 px-2 py-2">No results</div>
        )}
      </div>

      {!creating ? (
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => setCreating(true)}
        >
          Create new collection
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Collection title"
            className="rounded-xl"
          />
          <Button
            className="rounded-xl"
            onClick={async () => {
              const t = newTitle.trim();
              if (!t) return;
              const id = await onCreate(t);
              if (id) {
                setSelected((prev) => new Set(prev).add(id as string));
                setNewTitle("");
                setCreating(false);
              }
            }}
          >
            Save
          </Button>
        </div>
      )}

      <Button
        className="w-full rounded-xl"
        onClick={() => onConfirm([...selected])}
      >
        Add to selected products
      </Button>
    </div>
  );
}
