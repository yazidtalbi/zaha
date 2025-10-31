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

export default function CheckoutAddressPage() {
  return (
    <RequireAuth>
      <AddressInner />
    </RequireAuth>
  );
}

function AddressInner() {
  const router = useRouter();
  const [uid, setUid] = useState<string | null>(null);

  // addresses
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // cart
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const _uid = data.user?.id ?? null;
      setUid(_uid);
      if (_uid) {
        await Promise.all([loadAddresses(_uid), loadCart(_uid)]);
      }
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
    setCart((data ?? []) as CartRow[]);
  }

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
      line2: form.line2 || null || null,
      city: (form.city || "").trim(),
      postal_code: form.postal_code || null || null,
      country: (form.country || "").trim(),
      phone: form.phone || null || null,
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

  // ——— PLACE ORDER ———
  const [placing, setPlacing] = useState(false);
  async function placeOrder() {
    if (!uid) return;
    if (!selectedId) {
      toast.message("Please choose an address");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (removedCount > 0) {
      toast.error("Please remove unavailable items from your cart.");
      return;
    }

    // get the selected address
    const { data: a, error: eAddr } = await supabase
      .from("addresses")
      .select("*")
      .eq("id", selectedId)
      .maybeSingle();
    if (eAddr || !a) {
      toast.error("Could not find address");
      return;
    }

    // build orders to insert (matches your schema: product_id, buyer, …)
    const payload = cart.map((r) => {
      const p = r.products!;
      return {
        buyer: uid, // <-- your column
        product_id: r.product_id,
        qty: r.qty,
        amount_mad: (p.price_mad ?? 0) * r.qty,
        status: "pending", // will show in seller/orders
        payment_method: "cod", // keep/rename if your table differs
        city: a.city,
        phone: a.phone,
        address: `${a.line1}${a.line2 ? ", " + a.line2 : ""}, ${a.city}${
          a.postal_code ? " " + a.postal_code : ""
        }, ${a.country}`,
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

    // clear cart for this user
    await supabase.from("cart_items").delete().eq("user_id", uid);

    setPlacing(false);
    router.replace("/thank-you");
  }

  if (loading) return <main className="p-5">Loading…</main>;

  return (
    <main className="px-5 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="text-2xl"
        >
          ←
        </button>
        <h1 className="text-3xl font-bold">Checkout</h1>
      </div>

      <h2 className="text-2xl font-semibold mt-2 mb-4">
        Choose a shipping address
      </h2>

      {addresses.length === 0 ? (
        <div className="rounded-2xl border p-5">
          <p className="mb-3">You don’t have any saved addresses yet.</p>
          <Button onClick={openCreate}>+ Add a new address</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {addresses.map((a) => {
            const isSelected = selectedId === a.id;
            return (
              <div key={a.id} className="rounded-2xl border p-5">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => setSelectedId(a.id)}
                    className="mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center"
                    aria-label={`Select ${a.full_name} address`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isSelected ? "bg-foreground" : "bg-transparent"
                      }`}
                    />
                  </button>

                  <div className="flex-1">
                    {a.is_default ? (
                      <span className="text-[11px] rounded px-2 py-0.5 bg-neutral-200">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefault(a.id)}
                        className="ml-0 text-xs underline text-muted-foreground"
                      >
                        Set as default
                      </button>
                    )}

                    <div className="mt-1 text-lg font-semibold">
                      {a.full_name}
                    </div>
                    <div>{a.line1}</div>
                    {a.line2 ? <div>{a.line2}</div> : null}
                    <div className="uppercase tracking-wide">
                      {a.postal_code ? `${a.postal_code} ` : ""}
                      {a.city}
                    </div>
                    <div>{a.country}</div>
                    {a.phone ? <div className="mt-1">{a.phone}</div> : null}

                    <div className="mt-4 flex items-center justify-between text-lg">
                      <button className="underline" onClick={() => openEdit(a)}>
                        Edit
                      </button>
                      <button
                        className="underline text-destructive"
                        onClick={() => setDeleteTarget(a)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button onClick={openCreate} className="text-left text-lg underline">
            + Add a new address
          </button>

          {/* Summary + bottom CTA */}
          <div className="mt-6 rounded-2xl border p-4 space-y-3">
            {removedCount > 0 && (
              <div className="rounded-xl bg-amber-50 text-amber-900 px-3 py-2 text-sm">
                {removedCount} item{removedCount > 1 ? "s are" : " is"}{" "}
                unavailable. Remove them from your cart before placing the
                order.
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-medium">MAD {subtotal.toFixed(2)}</span>
            </div>
            <Button
              className="w-full"
              onClick={placeOrder}
              disabled={
                !selectedId || placing || removedCount > 0 || cart.length === 0
              }
            >
              {placing ? "Placing…" : "Ship here"}
            </Button>
            <div className="text-center">
              <Link href="/cart" className="text-sm underline">
                Edit cart
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? "Edit address" : "Add a new address"}
            </SheetTitle>
            <SheetDescription>Used for shipping your order.</SheetDescription>
          </SheetHeader>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input
                value={form.full_name || ""}
                onChange={(e) =>
                  setForm({ ...form, full_name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address line 1</Label>
              <Input
                value={form.line1 || ""}
                onChange={(e) => setForm({ ...form, line1: e.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address line 2 (optional)</Label>
              <Input
                value={form.line2 || ""}
                onChange={(e) => setForm({ ...form, line2: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={form.city || ""}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Postal code</Label>
              <Input
                value={form.postal_code || ""}
                onChange={(e) =>
                  setForm({ ...form, postal_code: e.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Country</Label>
              <Input
                value={form.country || ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
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

      {/* Delete confirm */}
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
              className="bg-destructive hover:bg-destructive/90"
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
