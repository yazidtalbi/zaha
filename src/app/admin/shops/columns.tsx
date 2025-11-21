// app/admin/shops/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export type ShopRow = {
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

export function getShopColumns(opts: {
  onToggleActive: (id: string, current: boolean) => void;
  updatingId: string | null;
}): ColumnDef<ShopRow>[] {
  const { onToggleActive, updatingId } = opts;

  return [
    {
      accessorKey: "title",
      header: "Shop",
      cell: ({ row }) => {
        const shop = row.getValue<string | null>("title");
        const id = row.original.id;
        const active = row.original.is_verified;

        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">
                {shop ?? "—"}
              </span>
              <Badge
                variant={active ? "default" : "outline"}
                className={active ? "bg-emerald-600" : ""}
              >
                {active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <span className="text-[11px] text-neutral-500">{id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "owner_name",
      header: "Owner",
      cell: ({ row }) => {
        const owner = row.getValue<string | null>("owner_name");
        const email = row.original.email;
        return (
          <div className="flex flex-col text-xs">
            <span className="truncate">{owner ?? "—"}</span>
            {email ? (
              <span className="truncate text-[11px] text-neutral-500">
                {email}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "city",
      header: "City",
      cell: ({ row }) => {
        const city = row.getValue<string | null>("city");
        return (
          <span className="truncate text-xs text-neutral-800">
            {city ?? "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "products_count",
      header: "Products",
      cell: ({ row }) => {
        const count = row.getValue<number | undefined>("products_count");
        return <span className="text-xs">{count ?? 0}</span>;
      },
    },
    {
      accessorKey: "orders_count",
      header: "Orders",
      cell: ({ row }) => {
        const count = row.getValue<number | null>("orders_count");
        return <span className="text-xs">{count ?? 0}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const shop = row.original;
        const active = !!shop.is_verified;
        const isUpdating = updatingId === shop.id;

        return (
          <div className="flex justify-end gap-2">
            <Link
              href={`/shop/${shop.id}`}
              className="text-xs text-neutral-700 underline"
            >
              View
            </Link>
            <Button
              size="xs"
              variant={active ? "outline" : "default"}
              disabled={isUpdating}
              className="text-xs"
              onClick={() => onToggleActive(shop.id, active)}
            >
              {active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        );
      },
    },
  ];
}
