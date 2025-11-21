// app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type ProductRow = {
  id: string;
  title: string;
  price_mad: number | null;
  city: string | null;
  active: boolean;
  created_at: string;
  shop_id: string | null;
  shop_title?: string | null;
};

export default function AdminProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const { data: products, error } = await supabase
          .from("products")
          .select("id, title, price_mad, city, active, created_at, shop_id")
          .order("created_at", { ascending: false })
          .limit(200);

        if (error || !products || !mounted) {
          setRows([]);
          return;
        }

        const shopIds = Array.from(
          new Set(
            products.map((p) => p.shop_id).filter((id): id is string => !!id)
          )
        );

        let shopsMap: Record<string, string> = {};
        if (shopIds.length > 0) {
          const { data: shops } = await supabase
            .from("shops")
            .select("id, title")
            .in("id", shopIds);

          if (shops) {
            shopsMap = shops.reduce((acc: any, s: any) => {
              acc[s.id] = s.title;
              return acc;
            }, {});
          }
        }

        const mapped: ProductRow[] = products.map((p: any) => ({
          id: p.id,
          title: p.title,
          price_mad: p.price_mad,
          city: p.city,
          active: p.active,
          created_at: p.created_at,
          shop_id: p.shop_id,
          shop_title: p.shop_id ? (shopsMap[p.shop_id] ?? null) : null,
        }));

        if (mounted) setRows(mapped);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  async function toggleActive(id: string, current: boolean) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("products")
      .update({ active: !current })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((p) => (p.id === id ? { ...p, active: !current } : p))
      );
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Products</h2>
        <p className="text-xs text-neutral-500">
          Latest 200 products. Use this to control quality and spam.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[2fr,1.2fr,1.5fr,1fr,1fr,auto] bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-600">
          <div>Title</div>
          <div>Product ID</div>
          <div>Shop</div>
          <div>City</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">No products found.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[2fr,1.2fr,1.5fr,1fr,1fr,auto] items-center px-4 py-2 text-sm"
              >
                <div className="truncate">{p.title}</div>
                <div className="truncate text-xs text-neutral-500">{p.id}</div>
                <div className="truncate text-xs">{p.shop_title ?? "—"}</div>
                <div className="truncate text-xs">{p.city ?? "—"}</div>
                <div>
                  <Badge
                    variant={p.active ? "default" : "outline"}
                    className={p.active ? "bg-emerald-600" : ""}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/product/${p.id}`}
                    className="text-xs text-neutral-700 underline"
                  >
                    View
                  </Link>
                  <Button
                    size="xs"
                    variant={p.active ? "outline" : "default"}
                    onClick={() => toggleActive(p.id, p.active)}
                    disabled={updatingId === p.id}
                    className="text-xs"
                  >
                    {p.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
