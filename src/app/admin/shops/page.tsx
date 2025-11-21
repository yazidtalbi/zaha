// app/admin/shops/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type ShopRow = {
  id: string;
  title: string | null;
  city: string | null;
  created_at: string;
  is_verified: boolean | null;
  owner: string | null;
  owner_name?: string | null;
  email: string | null;
  orders_count: number | null;
  products_count?: number;
};

export default function AdminShopsPage() {
  const [rows, setRows] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const { data: shops, error } = await supabase
          .from("shops")
          .select(
            "id, title, city, created_at, is_verified, owner, email, orders_count"
          )
          .order("created_at", { ascending: false })
          .limit(200);

        if (error || !shops || !mounted) {
          setRows([]);
          return;
        }

        const ownerIds = Array.from(
          new Set(shops.map((s) => s.owner).filter((id): id is string => !!id))
        );

        let ownersMap: Record<string, string> = {};
        if (ownerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", ownerIds);

          if (profiles) {
            ownersMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p.name;
              return acc;
            }, {});
          }
        }

        const shopIds = shops.map((s: any) => s.id);
        let productsCountMap: Record<string, number> = {};
        if (shopIds.length > 0) {
          const { data: productsAgg } = await supabase
            .from("products")
            .select("shop_id, id", { count: "exact", head: false })
            .in("shop_id", shopIds);

          if (productsAgg) {
            productsAgg.forEach((p: any) => {
              const sid = p.shop_id;
              productsCountMap[sid] = (productsCountMap[sid] ?? 0) + 1;
            });
          }
        }

        const mapped: ShopRow[] = shops.map((s: any) => ({
          id: s.id,
          title: s.title,
          city: s.city,
          created_at: s.created_at,
          is_verified: s.is_verified,
          owner: s.owner,
          owner_name: s.owner ? (ownersMap[s.owner] ?? null) : null,
          email: s.email,
          orders_count: s.orders_count,
          products_count: productsCountMap[s.id] ?? 0,
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

  async function toggleActive(id: string, current: boolean | null) {
    const next = !current;
    setUpdatingId(id);
    const { error } = await supabase
      .from("shops")
      .update({ is_verified: next })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_verified: next } : s))
      );
    }
    setUpdatingId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Shops</h2>
        <p className="text-xs text-neutral-500">
          Control shops and ban low-quality sellers.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[2fr,1.5fr,1.2fr,0.8fr,0.8fr,auto] bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-600">
          <div>Shop</div>
          <div>Owner</div>
          <div>City</div>
          <div>Products</div>
          <div>Orders</div>
          <div className="text-right">Actions</div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">No shops found.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[2fr,1.5fr,1.2fr,0.8fr,0.8fr,auto] items-center px-4 py-2 text-sm"
              >
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{s.title ?? "—"}</span>
                    <Badge
                      variant={s.is_verified ? "default" : "outline"}
                      className={s.is_verified ? "bg-emerald-600" : ""}
                    >
                      {s.is_verified ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-neutral-500">{s.id}</div>
                </div>
                <div className="truncate text-xs">
                  {s.owner_name ?? "—"}
                  {s.email ? (
                    <span className="block text-[11px] text-neutral-500">
                      {s.email}
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-xs">{s.city ?? "—"}</div>
                <div className="text-xs">{s.products_count ?? 0}</div>
                <div className="text-xs">{s.orders_count ?? 0}</div>
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/shop/${s.id}`}
                    className="text-xs text-neutral-700 underline"
                  >
                    View
                  </Link>
                  <Button
                    size="xs"
                    variant={s.is_verified ? "outline" : "default"}
                    disabled={updatingId === s.id}
                    onClick={() => toggleActive(s.id, !!s.is_verified)}
                    className="text-xs"
                  >
                    {s.is_verified ? "Deactivate" : "Activate"}
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
