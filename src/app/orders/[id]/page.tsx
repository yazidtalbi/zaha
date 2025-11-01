// app/orders/[id]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import RequireAuth from "@/components/RequireAuth";
import { Clock, CheckCircle2, Truck, PackageCheck, Ban } from "lucide-react";
import LeaveReviewButton from "@/components/reviews/LeaveReviewButton";

export default function BuyerOrderPage() {
  return (
    <RequireAuth>
      <OrderInner />
    </RequireAuth>
  );
}

type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

type Product = {
  id: string;
  title: string;
  photos: string[] | null;
  price_mad: number;
  shop_id?: string;
};

type Order = {
  id: string;
  created_at: string;
  qty: number;
  amount_mad: number;
  status: OrderStatus;
  city: string | null;
  phone: string | null;
  address: string | null;
  product_id: string | null;
  personalization?: string | null;
  options?: any | null;
  products?: Product | null;
};

type OrderEvent = {
  id: string;
  order_id: string;
  type:
    | "status_changed"
    | "payment_confirmed"
    | "created"
    | "note_updated"
    | "tracking_updated";
  payload: Record<string, any> | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  product_id: string;
  shop_id: string | null;
  order_id: string | null;
  author: string;
  rating: number | null;
  title: string | null;
  body: string | null;
  photos: string[] | null; // 👈 NEW
  created_at: string;
};

function OrderInner() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<OrderEvent[] | null>(null);
  const [loading, setLoading] = useState(true);

  const handleReviewSubmitted = (row: any) => {
    setMyReview(row);
    setHasReview(true);
    setReviewChecked(true);
  };

  // auth
  const [user, setUser] = useState<any>(null);

  // review state
  const [hasReview, setHasReview] = useState<boolean>(false);
  const [myReview, setMyReview] = useState<ReviewRow | null>(null);
  const [reviewChecked, setReviewChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);
    })();
  }, []);

  // Load order + timeline
  useEffect(() => {
    const _id = (id ?? "").toString().trim();
    if (!_id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*, products(*)")
        .eq("id", _id)
        .maybeSingle();

      if (!error && data) {
        setOrder(data as Order);

        try {
          const { data: ev, error: evErr } = await supabase
            .from("order_events")
            .select("*")
            .eq("order_id", _id)
            .order("created_at", { ascending: true });
          if (!evErr && ev) setEvents(ev as OrderEvent[]);
          else setEvents(null);
        } catch {
          setEvents(null);
        }
      } else {
        setOrder(null);
        setEvents(null);
      }
      setLoading(false);
    })();
  }, [id]);

  // Check if this user already left a review; if yes load the latest row to render
  // --- replace the whole "Robust review existence check" effect with this:
  useEffect(() => {
    const productId = order?.product_id ?? order?.products?.id ?? null;
    const authorId = user?.id ?? null;
    if (!authorId || !productId) return;

    let cancelled = false;

    async function load() {
      try {
        // 1) cheap existence check (RLS must allow select!)
        const { count, error: countErr } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("product_id", productId)
          .eq("author", authorId);

        const exists = !countErr && (count ?? 0) > 0;

        // 2) fetch latest row to render (uses title/body per your schema)
        let latest: ReviewRow | null = null;
        if (exists) {
          const { data, error } = await supabase
            .from("reviews")
            .select(
              "id, product_id, shop_id, order_id, author, rating, title, body, photos, created_at"
            )

            .eq("product_id", productId)
            .eq("author", authorId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!error && data && data.length) latest = data[0] as ReviewRow;
        }

        if (!cancelled) {
          setHasReview(exists);
          setMyReview(latest);
          setReviewChecked(true);
        }
      } catch {
        if (!cancelled) {
          setHasReview(false);
          setMyReview(null);
          setReviewChecked(true);
        }
      }
    }

    load();

    // realtime on that product so pill updates immediately after submit/edit/delete
    const chan = supabase
      .channel(`reviews-product-${productId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `product_id=eq.${productId}`,
        },
        load
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(chan);
    };
  }, [order?.id, order?.product_id, order?.products?.id, user?.id]);

  if (loading) return <main className="p-4">Loading…</main>;
  if (!order) return <main className="p-4">Order not found.</main>;

  const p = order.products ?? null;
  const img = Array.isArray(p?.photos) ? p.photos[0] : undefined;
  const productId = order.product_id ?? p?.id ?? null;

  const canReview =
    (order.status === "delivered" || order.status === "confirmed") &&
    !!productId &&
    !!user?.id;

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Order details</h1>

      {/* Review CTA or existing review */}
      {canReview && reviewChecked ? (
        <div className="mt-6">
          {hasReview && myReview ? (
            <ExistingReviewPill review={myReview} productId={productId!} />
          ) : (
            <LeaveReviewButton
              productId={productId!}
              shopId={order.products?.shop_id}
              orderId={order.id}
              authorId={user.id}
              onSuccess={handleReviewSubmitted}
            />
          )}
        </div>
      ) : null}

      {/* Product card */}
      <div className="rounded-xl border bg-sand p-3 flex gap-3 items-center">
        {img ? (
          <img
            src={img}
            alt={p?.title ?? "Product"}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 bg-neutral-100 rounded-lg" />
        )}
        <div>
          <div className="font-medium">{p?.title ?? "Product"}</div>
          <div className="text-sm text-ink/70">
            {order.qty} × MAD {p?.price_mad}
          </div>
        </div>
      </div>

      {/* Personalization + Options */}
      {!!order.personalization && (
        <section className="rounded-xl border bg-white p-3">
          <h3 className="text-sm font-semibold text-ink/80 mb-1">
            Personalization
          </h3>
          <div className="whitespace-pre-wrap text-sm">
            {order.personalization}
          </div>
        </section>
      )}

      {!!order.options && (
        <section className="rounded-xl border bg-white p-3">
          <h3 className="text-sm font-semibold text-ink/80 mb-1">Options</h3>
          <OptionsList options={order.options} />
        </section>
      )}

      {/* Shipping + status */}
      <div className="space-y-1 text-sm">
        <p>
          <span className="font-medium">City:</span> {order.city ?? "—"}
        </p>
        <p>
          <span className="font-medium">Address:</span> {order.address ?? "—"}
        </p>
        <p>
          <span className="font-medium">Payment:</span> Cash on Delivery
        </p>
        <p className="flex items-center gap-1">
          <span className="font-medium">Status:</span>
          <StatusBadge status={order.status} />
        </p>
      </div>

      {/* Contact */}
      {order.phone && (
        <div className="flex gap-2 mt-3">
          <a
            href={`tel:${order.phone}`}
            className="flex-1 text-center border rounded-xl px-4 py-3 font-medium"
          >
            📞 Call Seller
          </a>
          <a
            href={`https://wa.me/${order.phone.replace(
              /\D/g,
              ""
            )}?text=${encodeURIComponent(
              `Salam! I'm contacting you about my order for "${
                p?.title ?? ""
              }" (MAD ${p?.price_mad ?? ""}).`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center rounded-xl px-4 py-3 font-medium bg-green-500 text-white"
          >
            💬 WhatsApp
          </a>
        </div>
      )}

      {/* Activity timeline */}
      <div className="mt-4 rounded-xl border p-4">
        <h2 className="text-base font-semibold mb-3">Activity timeline</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5" />
            <div>
              Order placed
              <div className="text-xs text-ink/70">
                {new Date(order.created_at).toLocaleString()}
              </div>
            </div>
          </li>
          {events && events.length ? (
            events
              .filter(
                (ev) =>
                  ev.type === "status_changed" ||
                  ev.type === "payment_confirmed"
              )
              .map((ev) => (
                <li key={ev.id} className="flex items-start gap-2">
                  {ev.type === "status_changed" ? (
                    statusIcon((ev.payload?.to as OrderStatus) || "pending")
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  )}
                  <div>
                    {ev.type === "status_changed" ? (
                      <>
                        Status changed to{" "}
                        <span className="capitalize font-medium">
                          {String(ev.payload?.to ?? "")}
                        </span>
                      </>
                    ) : (
                      <>
                        Payment marked as{" "}
                        <span className="font-medium text-green-700">
                          confirmed
                        </span>
                      </>
                    )}
                    <div className="text-xs text-ink/70">
                      {new Date(ev.created_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))
          ) : (
            <li className="text-ink/70">No updates yet.</li>
          )}
        </ul>
      </div>

      <Link
        href="/orders"
        className="block text-center text-sm underline text-ink/70 mt-4"
      >
        Back to my orders
      </Link>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "pending"
      ? "bg-yellow-200 text-yellow-900"
      : status === "confirmed"
      ? "bg-blue-200 text-blue-900"
      : status === "shipped"
      ? "bg-purple-200 text-purple-900"
      : status === "delivered"
      ? "bg-green-200 text-green-900"
      : "bg-rose-200 text-rose-900";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] capitalize ${color}`}
    >
      {status}
    </span>
  );
}

function statusIcon(s: OrderStatus) {
  switch (s) {
    case "pending":
      return <Clock className="h-4 w-4 mt-0.5" />;
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4 mt-0.5" />;
    case "shipped":
      return <Truck className="h-4 w-4 mt-0.5" />;
    case "delivered":
      return <PackageCheck className="h-4 w-4 mt-0.5" />;
    case "cancelled":
      return <Ban className="h-4 w-4 mt-0.5" />;
  }
}

/* Options renderer */
function OptionsList({ options }: { options: any }) {
  if (Array.isArray(options)) {
    if (!options.length) return null;
    return (
      <ul className="text-sm rounded-lg border border-black/5 bg-white px-3 py-2 space-y-1">
        {options.map((opt: any, i: number) => {
          const group =
            opt.group ?? opt.name ?? opt.key ?? opt.title ?? "Option";
          const value = opt.value ?? opt.label ?? opt.choice ?? "";
          const price =
            opt.price_delta_mad != null ? ` (+${opt.price_delta_mad} MAD)` : "";
          return (
            <li key={i} className="flex items-start justify-between gap-4">
              <span className="text-ink/80">{group}</span>
              <span className="font-medium">
                {String(value)}
                <span className="ml-1 text-ink/60">{price}</span>
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (options && typeof options === "object") {
    const entries = Object.entries(options);
    if (!entries.length) return null;
    return (
      <ul className="text-sm rounded-lg border border-black/5 bg-white px-3 py-2 space-y-1">
        {entries.map(([k, v]) => (
          <li key={k} className="flex items-start justify-between gap-4">
            <span className="text-ink/80">{k}</span>
            <span className="font-medium">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="text-sm rounded-lg border border-black/5 bg-white px-3 py-2">
      {String(options)}
    </div>
  );
}

/* Review pill (uses 'title' & 'body' columns) */
function ExistingReviewPill({
  review,
  productId,
}: {
  review: ReviewRow;
  productId: string;
}) {
  const stars = clamp(0, 5, review.rating ?? 0);
  const text = (review.body ?? review.title ?? "").trim();
  const snippet = text.slice(0, 140) + (text.length > 140 ? "…" : "");
  const href = `/product/${productId}#reviews`;

  return (
    <Link
      href={href}
      className="block rounded-lg border border-black/10 bg-white px-3 py-2"
      title="View your review"
    >
      <div className="flex items-center gap-2">
        <StarRow n={stars} />
        {review.photos?.length ? (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {review.photos.slice(0, 4).map((src, i) => (
              <img
                key={i}
                src={src}
                alt=""
                className="h-10 w-10 rounded object-cover border"
              />
            ))}
            {review.photos.length > 4 && (
              <div className="h-10 w-10 rounded border grid place-items-center text-xs text-ink/70">
                +{review.photos.length - 4}
              </div>
            )}
          </div>
        ) : null}
        <span className="text-xs text-ink/60">
          {new Date(review.created_at).toLocaleDateString()}
        </span>
        <span className="ml-auto text-[11px] rounded-full bg-ink/5 px-2 py-0.5">
          Your review
        </span>
      </div>
      {snippet && (
        <p className="text-sm mt-1 text-ink/80 line-clamp-2">{snippet}</p>
      )}
      <div className="mt-1 text-xs underline decoration-ink/30 hover:decoration-ink">
        View your review
      </div>
    </Link>
  );
}

function StarRow({ n }: { n: number }) {
  return (
    <span aria-label={`${n} out of 5`}>
      {"★★★★★".slice(0, n)}
      <span className="text-ink/30">{"★★★★★".slice(n)}</span>
    </span>
  );
}

function clamp(min: number, max: number, v: number) {
  return Math.max(min, Math.min(max, v));
}
