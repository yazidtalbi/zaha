// app/admin/orders/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type OrderRow = {
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

  // extra fields for drawer
  address?: string | null;
  order_city?: string | null;
  phone?: string | null;
  notes?: string | null;
  payment_method?: string | null;
  personalization?: string | null;
  options?: any | null;
  tracking_number?: string | null;
  seller_notes?: string | null;
  payment_confirmed?: boolean | null;
};

export function getOrderColumns(opts: {
  onView: (order: OrderRow) => void;
}): ColumnDef<OrderRow>[] {
  const { onView } = opts;

  return [
    {
      accessorKey: "product_title",
      header: "Order",
      cell: ({ row }) => {
        const title = row.getValue<string | null>("product_title");
        const id = row.original.id;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{title ?? "—"}</span>
            <span className="text-[11px] text-neutral-500">{id}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "buyer_name",
      header: "Buyer",
      cell: ({ row }) => {
        const buyer = row.getValue<string | null>("buyer_name");
        return (
          <span className="truncate text-xs text-neutral-800">
            {buyer ?? "—"}
          </span>
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
      accessorKey: "amount_mad",
      header: "Total",
      cell: ({ row }) => {
        const amount = row.getValue<number | null>("amount_mad");
        return (
          <span className="text-xs">
            {amount != null ? `${amount} MAD` : "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue<string | null>("status");
        return (
          <Badge variant="outline" className="text-xs capitalize">
            {status ?? "—"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        const iso = row.getValue<string>("created_at");
        const d = new Date(iso);
        return (
          <span className="text-[11px] text-neutral-600">
            {d.toLocaleString()}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex justify-end">
            <Button
              size="xs"
              variant="outline"
              className="text-xs"
              onClick={() => onView(order)}
            >
              View
            </Button>
          </div>
        );
      },
    },
  ];
}
