"use client";

import RequireAuth from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Address = {
  id: string;
  user_id: string;
  full_name: string;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string | null;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
};

type Store = { id: string; title: string | null; avatar_url: string | null };
type Product = {
  id: string;
  title: string;
  price_mad: number;
  photos: string[] | null;
  active: boolean;
  deleted_at: string | null;
  shop_id?: string | null;
  shops?: Store | null;
};
type CartRow = {
  id: string;
  qty: number;
  product_id: string;
  options: any | null;
  personalization: string | null;
  products: Product | null;
};

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <InnerCheckout />
    </RequireAuth>
  );
}

function InnerCheckout() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  // state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartRow[]>([]);
  const removedCount = useMemo(
    () =>
      cart.filter((c) => !c.products?.active || !!c.products?.deleted_at)
        .length,
    [cart]
  );
  const subtotal = useMemo(
    () =>
      cart.reduce((sum, r) => {
        const p = r.products;
        if (!p || !p.active || p.deleted_at) return sum;
        return sum + (p.price_mad ?? 0) * r.qty;
      }, 0),
    [cart]
  );

  // create/edit sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [form, setForm] = useState<Partial<Address>>({
    full_name: "",
    line1: "",
    line2: "",
    city: "",
    postal_code: "",
    country: "Morocco",
    phone: "",
    is_default: false,
  });
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [placing, setPlacing] = useState(false);

  // ————————————————————————————
  // Lifecycle
  // ————————————————————————————
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const _uid = data.user?.id ?? null;
      setUid(_uid);
      if (_uid) await Promise.all([loadAddresses(_uid), loadCart(_uid)]);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      const _uid = sess?.user?.id ?? null;
      setUid(_uid);
      if (_uid) {
        loadAddresses(_uid);
        loadCart(_uid);
      }
    });
    return () => sub?.subscription.unsubscribe();
  }, []);

  async function loadAddresses(userId: string) {
    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Couldn't load addresses");
      return;
    }
    setAddresses(data ?? []);
    const def = data?.find((a) => a.is_default) ?? data?.[0];
    setSelectedId((prev) => prev ?? def?.id ?? null);
  }

  async function loadCart(userId: string) {
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        `
        id, qty, product_id, options, personalization,
        products (
          id, title, price_mad, photos, active, deleted_at, shop_id,
          shops ( id, title, avatar_url )
        )
      `
      )
      .eq("user_id", userId);
    if (error) {
      toast.error("Failed to load cart");
      return;
    }
    setCart((data ?? []) as unknown as CartRow[]);
  }

  // ————————————————————————————
  // Address Management
  // ————————————————————————————
  async function setDefault(id: string) {
    if (!uid) return;
    await supabase
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", uid);
    const { error } = await supabase
      .from("addresses")
      .update({ is_default: true })
      .eq("id", id);
    if (error) toast.error("Couldn't set default");
    else await loadAddresses(uid);
  }

  function openCreate() {
    setEditing(null);
    setForm({
      full_name: "",
      line1: "",
      line2: "",
      city: "",
      postal_code: "",
      country: "Morocco",
      phone: "",
      is_default: addresses.length === 0,
    });
    setSheetOpen(true);
  }

  function openEdit(a: Address) {
    setEditing(a);
    setForm({
      full_name: a.full_name,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      postal_code: a.postal_code ?? "",
      country: a.country,
      phone: a.phone ?? "",
      is_default: a.is_default,
    });
    setSheetOpen(true);
  }

  async function submitForm() {
    if (!uid) return;
    const payload = {
      user_id: uid,
      full_name: (form.full_name || "").trim(),
      line1: (form.line1 || "").trim(),
      line2: form.line2 || null,
      city: (form.city || "").trim(),
      postal_code: form.postal_code || null,
      country: (form.country || "").trim(),
      phone: form.phone || null,
      is_default: !!form.is_default,
    };

    if (payload.is_default) {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", uid);
    }

    if (editing) {
      const { error } = await supabase
        .from("addresses")
        .update(payload)
        .eq("id", editing.id);
      if (error) return toast.error("Update failed");
      toast.success("Address updated");
    } else {
      const { error } = await supabase.from("addresses").insert(payload);
      if (error) return toast.error("Creation failed");
      toast.success("Address added");
    }

    setSheetOpen(false);
    await loadAddresses(uid);
  }

  async function deleteAddress(id: string) {
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) toast.error("Delete failed");
    else {
      toast.success("Address deleted");
      if (uid) await loadAddresses(uid);
      if (selectedId === id) setSelectedId(null);
    }
  }

  // ————————————————————————————
  // Place Order
  // ————————————————————————————
  async function placeOrder() {
    if (!uid) return;
    if (!selectedId) return toast.message("Please choose an address");
    if (cart.length === 0) return toast.error("Your cart is empty");
    if (removedCount > 0)
      return toast.error("Please remove unavailable items from your cart.");

    const { data: a, error: eAddr } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", selectedId)
      .maybeSingle();
    if (eAddr || !a) return toast.error("Could not find address");

    const payload = cart.map((r) => {
      const p = r.products!;
      return {
        buyer: uid,
        product_id: r.product_id,
        qty: r.qty,
        amount_mad: (p.price_mad ?? 0) * r.qty,
        status: "pending",
        payment_method: "cod",
        city: a.city,
        phone: a.phone,
        address: `${a.line1}${a.line2 ? ", " + a.line2 : ""}, ${a.city}${
          a.postal_code ? " " + a.postal_code : ""
        }, ${a.country}`,
        personalization: r.personalization ?? null,
        options: r.options ?? null,
      };
    });

    setPlacing(true);
    const { error } = await supabase.from("orders").insert(payload);
    if (error) {
      setPlacing(false);
      return toast.error("Failed to place order", {
        description: error.message,
      });
    }

    await supabase.from("cart_items").delete().eq("user_id", uid);
    setPlacing(false);
    router.replace("/thank-you");
  }

  if (loading)
    return (
      <main className="p-8 text-center text-ink/60 animate-pulse">
        Loading checkout…
      </main>
    );

  return (
    <main className="px-5 py-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <header className="flex items-center gap-3  pb-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="text-2xl hover:text-ink/80"
        >
          ←
        </button>
        <h1 className="text-2xl font-semibold text-ink">Checkout</h1>
      </header>

      <section>
        <h2 className="text-lg font-medium mb-3 text-ink/90">
          Shipping Address
        </h2>

        {addresses.length === 0 ? (
          <div className="rounded-2xl border bg-white     p-6 text-center space-y-3">
            <p className="text-ink/70 text-sm">
              You don’t have any saved addresses yet.
            </p>
            <Button onClick={openCreate}>+ Add new address</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((a) => {
              const isSelected = selectedId === a.id;
              return (
                <div
                  key={a.id}
                  className={`rounded-2xl border p-5 transition-all cursor-pointer hover:bg-sand ${
                    isSelected
                      ? "border-[#371837] bg-sand/50"
                      : "border-neutral-200"
                  }`}
                  onClick={() => setSelectedId(a.id)}
                >
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <div className="text-lg font-semibold">{a.full_name}</div>
                      <div className="text-sm text-ink/80">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}
                      </div>
                      <div className="text-sm text-ink/70">
                        {a.city}, {a.country}
                      </div>
                      {a.phone && (
                        <div className="text-sm mt-1 text-ink/70">
                          📞 {a.phone}
                        </div>
                      )}
                    </div>

                    {a.is_default ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 border text-ink/60 h-fit">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDefault(a.id);
                        }}
                        className="text-xs underline text-ink/50 hover:text-ink/70"
                      >
                        Set default
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex gap-3 text-sm text-ink/70">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(a);
                      }}
                      className="underline hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(a);
                      }}
                      className="underline text-rose-600 hover:text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              onClick={openCreate}
              className="text-sm underline text-ink/70 hover:text-ink"
            >
              + Add new address
            </button>
          </div>
        )}
      </section>

      {/* Summary */}
      <aside className="rounded-2xl border bg-white     p-5 space-y-3">
        {removedCount > 0 && (
          <div className="rounded-lg bg-amber-50 text-amber-900 px-3 py-2 text-sm border border-amber-200">
            {removedCount} item
            {removedCount > 1 ? "s are" : " is"} unavailable. Please remove them
            from your cart before continuing.
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span>Subtotal</span>
          <span className="font-semibold">MAD {subtotal.toFixed(2)}</span>
        </div>
        <Button
          className="w-full"
          onClick={placeOrder}
          disabled={
            !selectedId || placing || removedCount > 0 || cart.length === 0
          }
        >
          {placing ? "Placing…" : "Place Order"}
        </Button>
        <div className="text-center">
          <Link href="/cart" className="text-sm underline text-ink/70">
            Edit cart
          </Link>
        </div>
      </aside>

      {/* Address Form Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Edit address" : "Add a new address"}
            </SheetTitle>
            <SheetDescription>Used for shipping your order.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["Full name", "full_name"],
              ["Phone", "phone"],
              ["Address line 1", "line1"],
              ["Address line 2 (optional)", "line2"],
              ["City", "city"],
              ["Postal code", "postal_code"],
              ["Country", "country"],
            ].map(([label, key], i) => (
              <div
                key={key}
                className={`space-y-2 ${
                  i === 2 || i === 3 || i === 6 ? "md:col-span-2" : ""
                }`}
              >
                <Label>{label}</Label>
                <Input
                  value={(form as any)[key] || ""}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.is_default}
                  onChange={(e) =>
                    setForm({ ...form, is_default: e.target.checked })
                  }
                />
                Make this my default address
              </label>
            </div>
          </div>

          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={submitForm}>
              {editing ? "Save changes" : "Add address"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => {
                if (deleteTarget) deleteAddress(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
