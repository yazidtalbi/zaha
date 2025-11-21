// app/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

type OrderRow = {
  id: string;
  buyer: string | null;
  buyer_name?: string | null;
  product_id: string | null;
  product_title?: string | null;
  shop_id?: string | null;
  shop_title?: string | null;
  amount_mad: number | null;
  status: string | null;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select(
            "id, buyer, product_id, amount_mad, status, created_at, product_title"
          )
          .order("created_at", { ascending: false })
          .limit(200);

        if (error || !orders || !mounted) {
          setRows([]);
          return;
        }

        const buyerIds = Array.from(
          new Set(orders.map((o) => o.buyer).filter((id): id is string => !!id))
        );
        const productIds = Array.from(
          new Set(
            orders.map((o) => o.product_id).filter((id): id is string => !!id)
          )
        );

        let buyersMap: Record<string, string> = {};
        let productsMap: Record<
          string,
          { title: string | null; shop_id: string | null }
        > = {};
        let shopsMap: Record<string, string> = {};

        if (buyerIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", buyerIds);
          if (profiles) {
            buyersMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p.name;
              return acc;
            }, {});
          }
        }

        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, title, shop_id")
            .in("id", productIds);
          if (products) {
            productsMap = products.reduce((acc: any, p: any) => {
              acc[p.id] = { title: p.title, shop_id: p.shop_id };
              return acc;
            }, {});
          }

          const shopIds = Array.from(
            new Set(
              products?.map((p: any) => p.shop_id).filter((id: any) => !!id) ??
                []
            )
          );
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
        }

        const mapped: OrderRow[] = orders.map((o: any) => {
          const prod = o.product_id
            ? (productsMap[o.product_id] ?? null)
            : null;
          const shopId = prod?.shop_id ?? null;
          return {
            id: o.id,
            buyer: o.buyer,
            buyer_name: o.buyer ? (buyersMap[o.buyer] ?? null) : null,
            product_id: o.product_id,
            product_title: o.product_title ?? prod?.title ?? null,
            shop_id: shopId,
            shop_title: shopId ? (shopsMap[shopId] ?? null) : null,
            amount_mad: o.amount_mad,
            status: o.status,
            created_at: o.created_at,
          };
        });

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Orders</h2>
        <p className="text-xs text-neutral-500">
          Latest 200 orders across the marketplace.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[1.5fr,1.5fr,1.5fr,0.8fr,0.8fr,auto] bg-neutral-50 px-4 py-2 text-xs font-medium text-neutral-600">
          <div>Order</div>
          <div>Buyer</div>
          <div>Shop</div>
          <div>Total</div>
          <div>Status</div>
          <div className="text-right">Created</div>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-neutral-500">No orders yet.</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-[1.5fr,1.5fr,1.5fr,0.8fr,0.8fr,auto] items-center px-4 py-2 text-sm"
              >
                <div className="truncate">
                  <div className="text-xs text-neutral-600">
                    {o.product_title ?? "—"}
                  </div>
                  <div className="text-[11px] text-neutral-500">{o.id}</div>
                </div>
                <div className="truncate text-xs">{o.buyer_name ?? "—"}</div>
                <div className="truncate text-xs">{o.shop_title ?? "—"}</div>
                <div className="text-xs">
                  {o.amount_mad != null ? `${o.amount_mad} MAD` : "—"}
                </div>
                <div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {o.status ?? "—"}
                  </Badge>
                </div>
                <div className="text-right text-[11px] text-neutral-500">
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
