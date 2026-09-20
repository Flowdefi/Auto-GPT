"use client";

import Link from "next/link";
import { haptic } from "@/lib/ios";
import { cn } from "@/lib/utils";

export function Subnav({
  items,
  current,
}: {
  items: Array<{ href: string; label: string }>;
  current: string;
}) {
  return (
    <div className="no-scrollbar momentum-scroll -mx-3 mb-5 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
      {items.map((item) => {
        const active = current === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => haptic("light")}
            aria-current={active ? "page" : undefined}
            className={cn(
              "tap-target inline-flex items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
