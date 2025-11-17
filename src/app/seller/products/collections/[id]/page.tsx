// app/seller/collections/[id]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Pencil, Trash2, GripVertical, Minus } from "lucide-react";

type Product = {
  id: string;
  title: string;
  photos: string[] | null;
  active: boolean;
  created_at: string;
  price_mad: number;
};

type Collection = {
  id: string;
  title: string;
  cover_url: string | null;
  shop_id: string;
};

type LinkedProduct = {
  product: Product;
  linkedAt: string; // from product_collections.created_at
  order_index: number | null;
};

type DragItem = {
  type: "COLLECTION_PRODUCT";
  index: number;
  id: string;
};

export default function ManageCollectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [shopId, setShopId] = useState<string | null>(null);
  const [col, setCol] = useState<Collection | null>(null);
  const [title, setTitle] = useState("");
  const [inCol, setInCol] = useState<LinkedProduct[]>([]);
  const [others, setOthers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // search for "add products" suggestions
  const [searchTerm, setSearchTerm] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);

      // who am I / shop id
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("owner", user?.id ?? "")
        .maybeSingle();
      const sid = shop?.id ?? null;
      setShopId(sid);

      // collection meta
      const { data: c } = await supabase
        .from("collections")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      const colData = c as any as Collection | null;
      setCol(colData ?? null);
      setTitle(colData?.title ?? "");

      if (!sid) {
        setLoading(false);
        return;
      }

      // all products in this shop
      const { data: prods } = await supabase
        .from("products")
        .select("id,title,photos,active,created_at,price_mad")
        .eq("shop_id", sid)
        .order("created_at", { ascending: false });
      const all: Product[] = (prods as any[]) ?? [];

      // links for this collection
      const { data: links } = await supabase
        .from("product_collections")
        .select("product_id, created_at, order_index")
        .eq("collection_id", id as string);

      const linkMap = new Map<
        string,
        { created_at: string; order_index: number | null }
      >(
        ((links as any[]) ?? []).map((l) => [
          l.product_id as string,
          {
            created_at: l.created_at as string,
            order_index:
              typeof l.order_index === "number"
                ? (l.order_index as number)
                : null,
          },
        ])
      );

      let inC: LinkedProduct[] = all
        .filter((p) => linkMap.has(p.id))
        .map((p) => {
          const link = linkMap.get(p.id)!;
          return {
            product: p,
            linkedAt: link.created_at,
            order_index: link.order_index,
          };
        });

      // sort by order_index if set, then fallback to link date
      inC.sort((a, b) => {
        const ao = a.order_index;
        const bo = b.order_index;
        if (ao != null && bo != null) return ao - bo;
        if (ao != null) return -1;
        if (bo != null) return 1;
        return +new Date(b.linkedAt) - +new Date(a.linkedAt);
      });

      const outC = all.filter((p) => !linkMap.has(p.id));

      setInCol(inC);
      setOthers(outC);
      setLoading(false);
    })();
  }, [id]);

  // filtered suggestions for "add" search
  const filteredOthers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return others.slice(0, 30); // mini suggestions
    return others
      .filter((p) => p.title.toLowerCase().includes(term))
      .slice(0, 40);
  }, [searchTerm, others]);

  async function saveMeta() {
    if (!col) return;
    const { error } = await supabase
      .from("collections")
      .update({
        title: title.trim(),
      })
      .eq("id", col.id);
    if (error) return toast.error(error.message);
    toast.success("Title updated ✅");
  }

  async function saveOrder() {
    if (!id) return;
    try {
      setSavingOrder(true);
      for (let index = 0; index < inCol.length; index++) {
        const lp = inCol[index];
        const { error } = await supabase
          .from("product_collections")
          .update({ order_index: index })
          .eq("product_id", lp.product.id)
          .eq("collection_id", id as string);
        if (error) throw error;
      }
      toast.success("Order saved ✅");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save order");
    } finally {
      setSavingOrder(false);
    }
  }

  async function addToCollection(pid: string) {
    const { error } = await supabase
      .from("product_collections")
      .insert({ product_id: pid, collection_id: id as string });
    if (error) return toast.error(error.message);

    const moved = others.find((p) => p.id === pid);
    if (moved) {
      setOthers((x) => x.filter((p) => p.id !== pid));
      setInCol((x) => [
        {
          product: moved,
          linkedAt: new Date().toISOString(),
          order_index: null,
        },
        ...x,
      ]);
    }
  }

  async function removeFromCollection(pid: string) {
    const { error } = await supabase
      .from("product_collections")
      .delete()
      .eq("product_id", pid)
      .eq("collection_id", id as string);
    if (error) return toast.error(error.message);

    const moved = inCol.find((p) => p.product.id === pid)?.product;
    if (moved) {
      setInCol((x) => x.filter((z) => z.product.id !== pid));
      setOthers((x) => [moved, ...x]);
    }
  }

  async function deleteCollection() {
    if (!confirm("Delete this collection? Products remain untouched.")) return;
    const { error } = await supabase
      .from("collections")
      .delete()
      .eq("id", id as string);
    if (error) return toast.error(error.message);
    toast("🗑️ Collection deleted");
    router.push("/seller/collections");
  }

  // SHARE
  async function shareCollection() {
    const publicUrl = `${window.location.origin}/shop/${col?.shop_id}?collection=${id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: col?.title ?? "Collection",
          url: publicUrl,
        });
      } else {
        await navigator.clipboard.writeText(publicUrl);
        toast.success("Link copied to clipboard");
      }
    } catch {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copied to clipboard");
    }
  }

  // drag reorder handler (local only, UI order)
  const moveItem = (fromIndex: number, toIndex: number) => {
    setInCol((items) => {
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  if (loading) return <main className="p-4">Loading…</main>;
  if (!col) return <main className="p-4">Not found.</main>;

  return (
    <DndProvider backend={HTML5Backend}>
      <main className="p-4 space-y-4">
        {/* Top header */}
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Edit collection</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={shareCollection}
              className="h-9 rounded-lg border bg-white px-3 text-sm hover:bg-neutral-50"
              title="Share collection"
            >
              Share
            </button>

            <button
              onClick={() => router.push("/seller/collections")}
              className="text-xs underline"
            >
              Back
            </button>
          </div>
        </header>

        {/* Meta – compact: title input + edit + delete icons */}
        <section className="rounded-2xl border bg-white p-3">
          <div className="flex items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 h-10 border rounded-lg px-3 bg-white text-sm"
            />
            <button
              onClick={saveMeta}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white hover:bg-neutral-50"
              title="Save title"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={deleteCollection}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
              title="Delete collection"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          {/* LEFT: Add products (first) */}
          <div className="rounded-2xl border bg-white p-3">
            <div className="font-medium mb-2">Add products</div>
            <div className="mb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search in your shop…"
                className="w-full h-9 rounded-lg border px-3 text-sm bg-white"
              />
              <p className="mt-1 text-[11px] text-ink/60">
                Tap a product to add it to this collection.
              </p>
            </div>

            <div className="max-h-[480px] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {filteredOthers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCollection(p.id)}
                    className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs active:scale-[0.97] transition"
                  >
                    <Thumb url={p.photos?.[0]} />
                    <span className="max-w-[120px] truncate font-medium">
                      {p.title}
                    </span>
                    <span className="ml-1 text-base leading-none">+</span>
                  </button>
                ))}

                {!filteredOthers.length && (
                  <div className="text-xs text-ink/60 mt-2">
                    No matching products.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: products in collection (drag & drop) */}
          <div className="rounded-2xl border bg-white p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="font-medium">Products in this collection</div>
              <button
                onClick={saveOrder}
                disabled={savingOrder || !inCol.length}
                className="text-[11px] underline disabled:opacity-60"
              >
                {savingOrder ? "Saving…" : "Save order"}
              </button>
            </div>
            <p className="text-[11px] text-ink/60 mb-2">
              Drag using the handle to reorder. The first items will be used to
              represent the collection.
            </p>

            <div className="max-h-[480px] overflow-y-auto pr-1">
              <ul className="space-y-2">
                {inCol.map(({ product }, index) => (
                  <DraggableCollectionItem
                    key={product.id}
                    index={index}
                    product={product}
                    moveItem={moveItem}
                    onRemove={() => removeFromCollection(product.id)}
                  />
                ))}
                {!inCol.length && (
                  <div className="text-xs text-ink/60">No products yet.</div>
                )}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </DndProvider>
  );
}

/* ───────── Thumbnail ───────── */

function Thumb({ url }: { url?: string | null }) {
  return (
    <div className="w-8 h-8 rounded-lg overflow-hidden bg-neutral-100 border">
      {url ? <img src={url} className="w-full h-full object-cover" /> : null}
    </div>
  );
}

/* ───────── Draggable item with animated handle ───────── */

function DraggableCollectionItem({
  index,
  product,
  moveItem,
  onRemove,
}: {
  index: number;
  product: Product;
  moveItem: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLLIElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);

  const [, drop] = useDrop<DragItem>({
    accept: "COLLECTION_PRODUCT",
    hover(item, monitor) {
      if (!ref.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: "COLLECTION_PRODUCT",
    item: (): DragItem => ({
      type: "COLLECTION_PRODUCT",
      index,
      id: product.id,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drop(ref);
  drag(handleRef); // only the handle is draggable

  return (
    <li
      ref={ref}
      className={`flex items-center gap-3 bg-white border rounded-xl p-2 transition-transform duration-150 ${
        isDragging
          ? "opacity-70 shadow-md scale-[0.985] translate-x-1"
          : "shadow-none"
      }`}
    >
      {/* Drag handle with clear motion cue */}
      <div
        ref={handleRef}
        className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-neutral-400 hover:text-neutral-600 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <span className="text-[11px] text-ink/50 w-4 text-center">
        {index + 1}
      </span>

      <Thumb url={product.photos?.[0]} />

      <div className="flex-1 min-w-0">
        <div className="truncate text-sm">{product.title}</div>
        <div className="text-[11px] text-ink/60">
          MAD {product.price_mad} ·{" "}
          {new Date(product.created_at).toLocaleDateString()}
        </div>
      </div>

      <button
        onClick={onRemove}
        className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        aria-label="Remove from collection"
      >
        <Minus className="h-4 w-4" />
      </button>
    </li>
  );
}
