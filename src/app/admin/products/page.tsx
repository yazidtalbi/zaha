// app/admin/products/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DataTable } from "@/components/admin/data-table";
import { getProductColumns, ProductRow } from "./columns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function AdminProductsPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const { data: products, error } = await supabase
          .from("products")
          .select("id, title, price_mad, city, active, created_at, shop_id")
          .order("created_at", { ascending: false })
          .limit(200);

        if (ignore) return;

        if (error || !products) {
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

          if (!ignore && shops) {
            shopsMap = shops.reduce((acc: any, s: any) => {
              acc[s.id] = s.title;
              return acc;
            }, {});
          }
        }

        if (ignore) return;

        const mapped: ProductRow[] = (products as any[]).map((p) => ({
          id: p.id,
          title: p.title,
          price_mad: p.price_mad,
          city: p.city,
          active: p.active,
          created_at: p.created_at,
          shop_id: p.shop_id,
          shop_title: p.shop_id ? (shopsMap[p.shop_id] ?? null) : null,
        }));

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

  async function handleToggleActive(id: string, current: boolean) {
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

  const columns = getProductColumns({
    onToggleActive: handleToggleActive,
    updatingId,
  });

  const q = search.toLowerCase();

  const filteredRows = rows.filter((p) => {
    if (statusFilter === "active" && !p.active) return false;
    if (statusFilter === "inactive" && p.active) return false;

    if (!q) return true;
    const hay =
      `${p.title ?? ""} ${p.shop_title ?? ""} ${p.city ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Products</h2>
        <p className="text-xs text-neutral-500">
          Latest 200 products. Use this to control quality and spam.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by title, shop or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) =>
            setStatusFilter(v as "all" | "active" | "inactive")
          }
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable columns={columns} data={filteredRows} isLoading={loading} />
    </div>
  );
}
