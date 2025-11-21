// app/admin/users/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type UserRow = {
  id: string;
  name: string | null;
  role: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  created_at: string;
  is_banned: boolean;
};

export function getUserColumns(opts: {
  onToggleBan: (id: string, current: boolean) => void;
  updatingId: string | null;
}): ColumnDef<UserRow>[] {
  const { onToggleBan, updatingId } = opts;

  return [
    {
      accessorKey: "name",
      header: "User",
      cell: ({ row }) => {
        const name = row.getValue<string | null>("name");
        const id = row.original.id;
        const role = row.original.role;
        return (
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{name ?? "—"}</span>
            <span className="text-[11px] text-neutral-500">{id}</span>
            {role ? (
              <span className="text-[11px] text-neutral-600">{role}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "city",
      header: "Location",
      cell: ({ row }) => {
        const city = row.getValue<string | null>("city");
        const region = row.original.region;
        return (
          <span className="truncate text-xs text-neutral-800">
            {city ?? "—"}
            {region ? ` · ${region}` : ""}
          </span>
        );
      },
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => {
        const phone = row.getValue<string | null>("phone");
        return (
          <span className="truncate text-xs text-neutral-800">
            {phone ?? "—"}
          </span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Joined",
      cell: ({ row }) => {
        const iso = row.getValue<string>("created_at");
        const d = new Date(iso);
        return (
          <span className="text-[11px] text-neutral-600">
            {d.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      accessorKey: "is_banned",
      header: "Status",
      cell: ({ row }) => {
        const banned = row.getValue<boolean>("is_banned");
        return (
          <Badge
            variant={banned ? "destructive" : "outline"}
            className={banned ? "bg-red-600 text-white hover:bg-red-700" : ""}
          >
            {banned ? "Banned" : "Active"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const user = row.original;
        const isUpdating = opts.updatingId === user.id;

        // We never show a ban button for superadmin (just in case)
        if (user.role === "superadmin") {
          return (
            <div className="flex justify-end text-[11px] text-neutral-500">
              superadmin
            </div>
          );
        }

        return (
          <div className="flex justify-end">
            <Button
              size="xs"
              variant={user.is_banned ? "outline" : "destructive"}
              disabled={isUpdating}
              className="text-xs"
              onClick={() => opts.onToggleBan(user.id, user.is_banned)}
            >
              {user.is_banned ? "Unban" : "Ban"}
            </Button>
          </div>
        );
      },
    },
  ];
}
