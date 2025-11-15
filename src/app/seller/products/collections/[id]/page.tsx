// app/seller/collections/[id]/page.tsx
"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

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
};

export default function ManageCollectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [shopId, setShopId] = useState<string | null>(null);
  const [col, setCol] = useState<Collection | null>(null);
  const [title, setTitle] = useState("");
  const [cover, setCover] = useState("");
  const [inCol, setInCol] = useState<LinkedProduct[]>([]);
  const [others, setOthers] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // sort state from URL (?sort=...)
  type SortKey = "relevance" | "recent" | "price_desc" | "price_asc";
  const sortFromUrl = (searchParams.get("sort") as SortKey) || "relevance";
  const [sortBy, setSortBy] = useState<SortKey>(sortFromUrl);

  // keep URL in sync with control
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("sort", sortBy);
    router.replace(`?${sp.toString()}`, { scroll: false });
  }, [sortBy]);

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
      setCol((c as any) ?? null);
      setTitle((c as any)?.title ?? "");
      setCover((c as any)?.cover_url ?? "");

      if (!sid) {
        setLoading(false);
        return;
      }

      // all products in this shop (need price for sort)
      const { data: prods } = await supabase
        .from("products")
        .select("id,title,photos,active,created_at,price_mad")
        .eq("shop_id", sid)
        .order("created_at", { ascending: false });
      const all: Product[] = (prods as any[]) ?? [];

      // links for this collection (include link create time for "relevance")
      const { data: links } = await supabase
        .from("product_collections")
        .select("product_id, created_at")
        .eq("collection_id", id as string);

      const linkedMap = new Map(
        ((links as any[]) ?? []).map((l) => [
          l.product_id as string,
          l.created_at as string,
        ])
      );
      const inC: LinkedProduct[] = all
        .filter((p) => linkedMap.has(p.id))
        .map((p) => ({ product: p, linkedAt: linkedMap.get(p.id)! }));
      const outC = all.filter((p) => !linkedMap.has(p.id));

      setInCol(inC);
      setOthers(outC);
      setLoading(false);
    })();
  }, [id]);

  // sorting
  const sortedInCol = useMemo(() => {
    const xs = [...inCol];
    switch (sortBy) {
      case "relevance":
        // newest link first
        xs.sort((a, b) => +new Date(b.linkedAt) - +new Date(a.linkedAt));
        break;
      case "recent":
        xs.sort(
          (a, b) =>
            +new Date(b.product.created_at) - +new Date(a.product.created_at)
        );
        break;
      case "price_desc":
        xs.sort(
          (a, b) => (b.product.price_mad ?? 0) - (a.product.price_mad ?? 0)
        );
        break;
      case "price_asc":
        xs.sort(
          (a, b) => (a.product.price_mad ?? 0) - (b.product.price_mad ?? 0)
        );
        break;
    }
    return xs;
  }, [inCol, sortBy]);

  async function saveMeta() {
    if (!col) return;
    const { error } = await supabase
      .from("collections")
      .update({ title: title.trim(), cover_url: cover || null })
      .eq("id", col.id);
    if (error) return toast.error(error.message);
    toast.success("Collection updated ✅");
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
        { product: moved, linkedAt: new Date().toISOString() },
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
    // public shop page deep link with ?collection=<id>
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

  if (loading) return <main className="p-4">Loading…</main>;
  if (!col) return <main className="p-4">Not found.</main>;

  return (
    <main className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Edit collection</h1>

        <div className="flex items-center gap-2">
          {/* Sort control */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-ink/60">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="h-9 rounded-lg border bg-white px-2"
            >
              <option value="relevance">Relevance</option>
              <option value="recent">Most recent</option>
              <option value="price_desc">Highest price</option>
              <option value="price_asc">Lowest price</option>
            </select>
          </div>

          {/* Share button */}
          <button
            onClick={shareCollection}
            className="h-9 rounded-lg border bg-paper px-3 text-sm hover:bg-white"
            title="Share collection"
          >
            Share
          </button>

          <Link href="/seller/collections" className="text-xs underline">
            Back
          </Link>
        </div>
      </header>

      <section className="rounded-2xl border bg-sand p-4 space-y-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-ink/60 mb-1">Title</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 border rounded-lg px-3 bg-white"
            />
          </div>
          <div>
            <div className="text-xs text-ink/60 mb-1">Cover URL</div>
            <input
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              className="w-full h-10 border rounded-lg px-3 bg-white"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveMeta}
            className="rounded-xl border px-3 py-2 text-sm bg-paper hover:bg-white"
          >
            Save
          </button>
          <button
            onClick={deleteCollection}
            className="rounded-xl border px-3 py-2 text-sm text-rose-600"
          >
            Delete collection
          </button>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-sand p-3">
          <div className="font-medium mb-2">Products in this collection</div>
          <ul className="space-y-2">
            {sortedInCol.map(({ product }) => (
              <li
                key={product.id}
                className="flex items-center gap-3 bg-white border rounded-xl p-2"
              >
                <Thumb url={product.photos?.[0]} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{product.title}</div>
                  <div className="text-[11px] text-ink/60">
                    MAD {product.price_mad} ·{" "}
                    {new Date(product.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => removeFromCollection(product.id)}
                  className="text-xs underline text-rose-600"
                >
                  Remove
                </button>
              </li>
            ))}
            {!sortedInCol.length && (
              <div className="text-xs text-ink/60">No products yet.</div>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border bg-sand p-3">
          <div className="font-medium mb-2">Other shop products</div>
          <ul className="space-y-2">
            {others.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 bg-white border rounded-xl p-2"
              >
                <Thumb url={p.photos?.[0]} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm">{p.title}</div>
                  <div className="text-[11px] text-ink/60">
                    MAD {p.price_mad} ·{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => addToCollection(p.id)}
                  className="text-xs underline"
                >
                  Add
                </button>
              </li>
            ))}
            {!others.length && (
              <div className="text-xs text-ink/60">
                Everything is already in this collection.
              </div>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Thumb({ url }: { url?: string | null }) {
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 border">
      {url ? <img src={url} className="w-full h-full object-cover" /> : null}
    </div>
  );
}
