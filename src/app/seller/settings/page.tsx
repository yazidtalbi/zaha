import { redirect } from "next/navigation";

export default function SettingsPage() {
  // Reuse your existing settings screen at /seller/shop
  redirect("/seller/shop");
}
