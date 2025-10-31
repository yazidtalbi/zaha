// app/thank-you/page.tsx
"use client";

import Link from "next/link";

export default function ThankYouPage() {
  return (
    <main className="px-5 py-16 max-w-xl mx-auto text-center">
      <h1 className="text-3xl font-bold">Thank you!</h1>
      <p className="mt-2 text-muted-foreground">
        Your order has been placed. You’ll receive updates as the seller
        confirms and ships it.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        <Link href="/orders" className="underline">
          View my orders
        </Link>
        <Link href="/home" className="underline">
          Continue shopping
        </Link>
      </div>
    </main>
  );
}
