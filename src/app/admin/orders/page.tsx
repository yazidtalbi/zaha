// app/admin/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DataTable } from "@/components/admin/data-table";
import { getOrderColumns, OrderRow } from "./columns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select(
            "id, buyer, product_id, amount_mad, status, created_at, product_title, address, city, phone, notes, payment_method, personalization, options, tracking_number, seller_notes, payment_confirmed"
          )
          .order("created_at", { ascending: false })
          .limit(200);

        if (ignore) return;

        if (error || !orders) {
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

          if (!ignore && profiles) {
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

          if (!ignore && products) {
            productsMap = products.reduce((acc: any, p: any) => {
              acc[p.id] = { title: p.title, shop_id: p.shop_id };
              return acc;
            }, {});
          }

          const shopIds = Array.from(
            new Set(
              (products as any[])
                .map((p: any) => p.shop_id)
                .filter((id: any) => !!id)
            )
          );

          if (shopIds.length > 0) {
            const { data: shops } = await supabase
              .from("shops")
              .select("id, title")
              .in("id", shopIds);

            if (!ignore && shops) {
              shopsMap = shops.reduce((acc: any, s: any) => {
                acc[s.id] = s.title;
                return acc;
              }, {});
            }
          }
        }

        if (ignore) return;

        const mapped: OrderRow[] = (orders as any[]).map((o) => {
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
            address: o.address,
            order_city: o.city,
            phone: o.phone,
            notes: o.notes,
            payment_method: o.payment_method,
            personalization: o.personalization,
            options: o.options,
            tracking_number: o.tracking_number,
            seller_notes: o.seller_notes,
            payment_confirmed: o.payment_confirmed,
          };
        });

        setRows(mapped);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const columns = useMemo(
    () =>
      getOrderColumns({
        onView: (order) => {
          setSelected(order);
          setSheetOpen(true);
        },
      }),
    []
  );

  const allStatuses = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.status).filter((s): s is string => !!s))
      ),
    [rows]
  );

  const q = search.toLowerCase();

  const filteredRows = rows.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;

    if (!q) return true;
    const hay = `${o.product_title ?? ""} ${o.buyer_name ?? ""} ${
      o.shop_title ?? ""
    }`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Orders</h2>
          <p className="text-xs text-neutral-500">
            Latest 200 orders across the marketplace.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search by product, buyer or shop…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {allStatuses.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable columns={columns} data={filteredRows} isLoading={loading} />
      </div>

      {/* Drawer for order details */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full max-w-lg overflow-y-auto">
          <SheetHeader className="mb-3">
            <SheetTitle>Order details</SheetTitle>
            <SheetDescription>
              Internal view of the full order data.
            </SheetDescription>
          </SheetHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              {/* Product */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Product
                </h3>
                <div className="mt-1 space-y-1">
                  <div className="font-medium">
                    {selected.product_title ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-500">
                    ID: {selected.product_id ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-700">
                    Shop: {selected.shop_title ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-700">
                    Amount:{" "}
                    {selected.amount_mad != null
                      ? `${selected.amount_mad} MAD`
                      : "—"}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Buyer */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Buyer
                </h3>
                <div className="mt-1 space-y-1">
                  <div className="text-sm">{selected.buyer_name ?? "—"}</div>
                  <div className="text-xs text-neutral-700">
                    Phone: {selected.phone ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-700">
                    City: {selected.order_city ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-700 break-words">
                    Address: {selected.address ?? "—"}
                  </div>
                  {selected.notes && (
                    <div className="text-xs text-neutral-700">
                      Notes: {selected.notes}
                    </div>
                  )}
                </div>
              </section>

              <Separator />

              {/* Status & payment */}
              <section className="space-y-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Status & Payment
                </h3>
                <div className="text-xs text-neutral-700">
                  Status:{" "}
                  <span className="font-medium">{selected.status ?? "—"}</span>
                </div>
                <div className="text-xs text-neutral-700">
                  Payment method: {selected.payment_method ?? "—"}
                </div>
                <div className="text-xs text-neutral-700">
                  Payment confirmed: {selected.payment_confirmed ? "Yes" : "No"}
                </div>
                <div className="text-xs text-neutral-700">
                  Tracking: {selected.tracking_number ?? "—"}
                </div>
                {selected.seller_notes && (
                  <div className="text-xs text-neutral-700">
                    Seller notes: {selected.seller_notes}
                  </div>
                )}
              </section>

              <Separator />

              {/* Personalization / options */}
              {(selected.personalization || selected.options) && (
                <section className="space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Personalization & Options
                  </h3>
                  {selected.personalization && (
                    <div className="text-xs text-neutral-700 whitespace-pre-wrap">
                      {selected.personalization}
                    </div>
                  )}
                  {selected.options && (
                    <pre className="mt-1 max-h-40 overflow-auto rounded bg-neutral-100 p-2 text-[11px] text-neutral-700">
                      {JSON.stringify(selected.options, null, 2)}
                    </pre>
                  )}
                </section>
              )}

              <Separator />

              <section className="space-y-1 text-xs text-neutral-600">
                <div>
                  Order ID:{" "}
                  <span className="font-mono text-[11px]">{selected.id}</span>
                </div>
                <div>
                  Created at: {new Date(selected.created_at).toLocaleString()}
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
