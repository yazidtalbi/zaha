"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { User } from "lucide-react";

export default function TopBar() {
  const router = useRouter();
  const params = useSearchParams();
  const q0 = params.get("q") ?? "";

  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur border-b">
      <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = (
              e.currentTarget.elements.namedItem("q") as HTMLInputElement
            ).value.trim();
            router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
          }}
          className="flex-1 h-11 rounded-full border bg-white/70 px-4 flex items-center gap-2"
        >
          <input
            name="q"
            defaultValue={q0}
            placeholder="Search for something special"
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </form>

        <button
          onClick={() => router.push("/account")}
          aria-label="Profile"
          className="w-10 h-10 rounded-full border grid place-items-center bg-white/80"
        >
          <User size={18} />
        </button>
      </div>
    </header>
  );
}
