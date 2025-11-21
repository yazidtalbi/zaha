// app/admin/users/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { DataTable } from "@/components/admin/data-table";
import { getUserColumns, UserRow } from "./columns";

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, name, role, phone, city, region, created_at, is_banned")
          .order("created_at", { ascending: false });

        if (ignore) return;

        if (error || !data) {
          setRows([]);
          return;
        }

        // Optional: don't show superadmin in the list if you want
        const mapped: UserRow[] = (data as any[]).map((p) => ({
          id: p.id,
          name: p.name,
          role: p.role,
          phone: p.phone,
          city: p.city,
          region: p.region,
          created_at: p.created_at,
          is_banned: !!p.is_banned,
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

  async function handleToggleBan(id: string, current: boolean) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !current })
      .eq("id", id);

    if (!error) {
      setRows((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_banned: !current } : u))
      );
    }
    setUpdatingId(null);
  }

  const columns = getUserColumns({
    onToggleBan: handleToggleBan,
    updatingId,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Users</h2>
        <p className="text-xs text-neutral-500">
          Manage accounts, roles and bans. Superadmins cannot be banned.
        </p>
      </div>

      <DataTable columns={columns} data={rows} isLoading={loading} />
    </div>
  );
}
