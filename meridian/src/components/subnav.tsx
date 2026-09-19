import Link from "next/link";
import { cn } from "./ui";

export function Subnav({
  items,
  current,
}: {
  items: Array<{ href: string; label: string }>;
  current: string;
}) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto no-scrollbar">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-sm",
            current === item.href
              ? "bg-ink-900 text-white"
              : "bg-white text-ink-600 ring-1 ring-ink-100",
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
