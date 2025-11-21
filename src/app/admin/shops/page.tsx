// app/admin/shops/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DataTable } from "@/components/admin/data-table";
import { getShopColumns, ShopRow } from "./columns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function AdminShopsPage() {
  const [rows, setRows] = useState<ShopRow[]>([]);
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
        const { data: shops, error } = await supabase
          .from("shops")
          .select(
            "id, title, city, created_at, is_verified, owner, email, orders_count"
          )
          .order("created_at", { ascending: false })
          .limit(200);

        if (ignore) return;

        if (error || !shops) {
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

          if (!ignore && profiles) {
            ownersMap = profiles.reduce((acc: any, p: any) => {
              acc[p.id] = p.name;
              return acc;
            }, {});
          }
        }

        const shopIds = (shops as any[]).map((s) => s.id);
        let productsCountMap: Record<string, number> = {};
        if (shopIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("shop_id, id")
            .in("shop_id", shopIds);

          if (!ignore && products) {
            (products as any[]).forEach((p) => {
              const sid = p.shop_id;
              productsCountMap[sid] = (productsCountMap[sid] ?? 0) + 1;
            });
          }
        }

        if (ignore) return;

        const mapped: ShopRow[] = (shops as any[]).map((s) => ({
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
      .from("shops")
      .update({ is_verified: !current })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_verified: !current } : s))
      );
    }
    setUpdatingId(null);
  }

  const columns = getShopColumns({
    onToggleActive: handleToggleActive,
    updatingId,
  });

  const q = search.toLowerCase();

  const filteredRows = rows.filter((s) => {
    const active = !!s.is_verified;
    if (statusFilter === "active" && !active) return false;
    if (statusFilter === "inactive" && active) return false;

    if (!q) return true;
    const hay =
      `${s.title ?? ""} ${s.owner_name ?? ""} ${s.city ?? ""}`.toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">Shops</h2>
        <p className="text-xs text-neutral-500">
          Control shops and ban low-quality sellers.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by shop, owner or city…"
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
