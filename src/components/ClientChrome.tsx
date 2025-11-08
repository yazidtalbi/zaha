// components/ClientChrome.tsx
"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import ToastHost from "@/components/ToastHost";

const HIDE_ROUTES = ["/onboarding", "/auth", "/login", "/signup"];

function shouldHide(pathname: string | null) {
  if (!pathname) return false;
  return HIDE_ROUTES.some(
    (base) => pathname === base || pathname.startsWith(base + "/")
  );
}

export default function ClientChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideLayout = shouldHide(pathname);

  return (
    <>
      <main className={hideLayout ? "  mx-auto" : " mx-auto"}>
        {children}
        <ToastHost />
      </main>
      {!hideLayout && <BottomNav />}
    </>
  );
}
