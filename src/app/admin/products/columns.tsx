// app/admin/products/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export type ProductRow = {
  id: string;
  title: string;
  price_mad: number | null;
  city: string | null;
  active: boolean;
  created_at: string;
  shop_id: string | null;
  shop_title?: string | null;
};

export function getProductColumns(opts: {
  onToggleActive: (id: string, active: boolean) => void;
  updatingId: string | null;
}): ColumnDef<ProductRow>[] {
  const { onToggleActive, updatingId } = opts;

  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const value = row.getValue<string>("title");
        const id = row.original.id;
        return (
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{value}</span>
            <span className="text-[11px] text-neutral-500">{id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "shop_title",
      header: "Shop",
      cell: ({ row }) => {
        const shop = row.getValue<string | null>("shop_title");
        return (
          <span className="truncate text-xs text-neutral-800">
            {shop ?? "—"}
          </span>
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
      accessorKey: "price_mad",
      header: "Price",
      cell: ({ row }) => {
        const price = row.getValue<number | null>("price_mad");
        return (
          <span className="text-xs">
            {price != null ? `${price} MAD` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.getValue<boolean>("active");
        return (
          <Badge
            variant={active ? "default" : "outline"}
            className={active ? "bg-emerald-600" : ""}
          >
            {active ? "Active" : "Inactive"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const product = row.original;
        const isUpdating = updatingId === product.id;

        return (
          <div className="flex justify-end gap-2">
            <Link
              href={`/product/${product.id}`}
              className="text-xs text-neutral-700 underline"
            >
              View
            </Link>
            <Button
              size="xs"
              variant={product.active ? "outline" : "default"}
              disabled={isUpdating}
              className="text-xs"
              onClick={() => onToggleActive(product.id, product.active)}
            >
              {product.active ? "Deactivate" : "Activate"}
            </Button>
          </div>
        );
      },
    },
  ];
}
