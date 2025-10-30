"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  id: string;
  created_at: string;
  buyer: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  amount_mad: number;
  products?: { id: string; title: string; shop_id: string };
};

export default function CustomersPage() {
  return (
    <RequireAuth>
      <CustomersInner />
    </RequireAuth>
  );
}

function CustomersInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, created_at, buyer, phone, city, address, amount_mad, products:products(id, title, shop_id)"
        )
        .order("created_at", { ascending: false })
        .limit(500); // enough for a first pass

      if (!error && data) setRows(data as any[]);
      setLoading(false);
    })();
  }, []);

  const customers = useMemo(() => {
    const map = new Map<
      string,
      {
        buyer: string;
        phone: string | null;
        city: string | null;
        orders: number;
        spent: number;
        last: string;
      }
    >();
    for (const r of rows) {
      if (!r.buyer) continue;
      const k = r.buyer;
      const prev = map.get(k) ?? {
        buyer: k,
        phone: r.phone,
        city: r.city,
        orders: 0,
        spent: 0,
        last: r.created_at,
      };
      prev.orders += 1;
      prev.spent += r.amount_mad || 0;
      if (new Date(r.created_at) > new Date(prev.last))
        prev.last = r.created_at;
      if (r.phone && !prev.phone) prev.phone = r.phone;
      if (r.city && !prev.city) prev.city = r.city;
      map.set(k, prev);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.last).getTime() - new Date(a.last).getTime()
    );
  }, [rows]);

  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Customers</h1>
      {loading ? (
        <div className="text-sm text-ink/70">Loading…</div>
      ) : !customers.length ? (
        <div className="text-sm text-ink/70">No customers yet.</div>
      ) : (
        <ul className="space-y-2">
          {customers.map((c) => (
            <li key={c.buyer} className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    Buyer: {c.buyer.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-ink/70">
                    {c.city ?? "—"} · {c.phone ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    MAD {c.spent.toLocaleString()}
                  </div>
                  <div className="text-xs text-ink/70">{c.orders} orders</div>
                </div>
              </div>
              <div className="text-xs text-ink/60 mt-1">
                Last order: {new Date(c.last).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
