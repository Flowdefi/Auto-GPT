import type { ReactNode } from "react";
import Link from "next/link";
import { LIFETIME_PRICE_USD } from "@/lib/commerce";

export function MarketingShell({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold tracking-wide">
            MERIDIAN
          </Link>
          <div className="flex items-center gap-3 text-xs text-ink-300">
            <Link href="/pricing" className="hover:text-white">
              ${LIFETIME_PRICE_USD} lifetime
            </Link>
            {action}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center py-12">{children}</div>
      </div>
    </div>
  );
}
