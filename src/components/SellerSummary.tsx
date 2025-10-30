function SellerSummary() {
  const [loading, setLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pending, setPending] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [rev7d, setRev7d] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Totals (revenue + orders)
      const { data: totals } = await supabase
        .from("orders")
        .select("sum:amount_mad.sum(), count:count()")
        .single(); // RLS limits to this seller's orders

      setTotalOrders((totals?.count as number) ?? 0);
      setTotalRevenue((totals?.sum as number) ?? 0);

      // 2) By status
      const { data: byStatus } = await supabase
        .from("orders")
        .select("status, count:count()")
        .group("status");

      setPending(
        byStatus?.find((r: any) => r.status === "pending")?.count ?? 0
      );
      setDelivered(
        byStatus?.find((r: any) => r.status === "delivered")?.count ?? 0
      );

      // 3) Revenue last 7 days
      const since = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { data: last7 } = await supabase
        .from("orders")
        .select("sum:amount_mad.sum()")
        .gte("created_at", since)
        .single();

      setRev7d((last7?.sum as number) ?? 0);

      setLoading(false);
    })();
  }, []);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KPI
        title="Total revenue"
        value={`MAD ${totalRevenue}`}
        loading={loading}
      />
      <KPI title="Total orders" value={totalOrders} loading={loading} />
      <KPI title="Pending" value={pending} loading={loading} />
      <KPI
        title="Delivered"
        value={delivered}
        loading={loading}
        note={`Last 7d · MAD ${rev7d}`}
      />
    </section>
  );
}

function KPI({
  title,
  value,
  note,
  loading,
}: {
  title: string;
  value: string | number;
  note?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-sand p-3">
      <div className="text-xs text-ink/60">{title}</div>
      <div className="text-xl font-semibold mt-1">{loading ? "…" : value}</div>
      {note ? <div className="text-xs text-ink/60 mt-0.5">{note}</div> : null}
    </div>
  );
}
