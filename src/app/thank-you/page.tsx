"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ThankYouPage() {
  const params = useSearchParams();
  const orderId = params.get("o");
  const router = useRouter();

  return (
    <main className="p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">🎉 Order placed!</h1>
      <p className="text-sm text-ink/70">
        Thank you for your order. You’ll be contacted soon to confirm delivery.
      </p>

      {orderId && (
        <p className="text-xs text-ink/60">
          Order ID: <span className="font-mono">{orderId}</span>
        </p>
      )}

      <div className="space-y-2">
        <Link
          href="/orders"
          className="block w-full rounded-xl px-4 py-3 bg-terracotta text-white font-medium"
        >
          View My Orders
        </Link>
        <button
          onClick={() => router.push("/home")}
          className="text-sm underline text-ink/70"
        >
          Back to Home
        </button>
      </div>
    </main>
  );
}
