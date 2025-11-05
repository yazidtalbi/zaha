"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type DashboardHeaderProps = {
  /** Main heading (e.g., "Products") */
  title: string;
  /** Small helper line under the title */
  subtitle?: string;
  /** Show the back button on the left (default: true) */
  withBackButton?: boolean;
  /** Optional: custom fallback when no history; default: "/seller" */
  backFallbackHref?: string;
  /** Optional right-side content (buttons, filters, etc.) */
  rightSlot?: React.ReactNode;
  /** Draw a subtle divider below */
  withDivider?: boolean;
  /** Extra class names for the wrapper */
  className?: string;
};

export default function DashboardHeader({
  title,
  subtitle,
  withBackButton = true,
  backFallbackHref = "/seller",
  rightSlot,
  withDivider = false,
  className,
}: DashboardHeaderProps) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (document.referrer && document.referrer.includes(window.location.host)) {
      router.back();
    } else {
      router.push(backFallbackHref);
    }
  }, [router, backFallbackHref]);

  return (
    <div
      className={cx(
        "relative mb-6",
        withDivider && "pb-3 border-b border-ink/10",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {withBackButton && (
            <button
              onClick={handleBack}
              aria-label="Go back"
              className="shrink-0 p-1.5 rounded-full hover:bg-ink/5 active:scale-95 transition"
            >
              <ChevronLeft className="h-5 w-5 text-ink" strokeWidth={2.2} />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold tracking-tight text-ink truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-ink/60 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {rightSlot ? (
          <div className="shrink-0 flex items-center gap-2">{rightSlot}</div>
        ) : null}
      </div>
    </div>
  );
}
