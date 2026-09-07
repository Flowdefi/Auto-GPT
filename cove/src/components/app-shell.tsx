"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOBILE, NAV } from "@/lib/nav";
import { useCove } from "@/lib/store";
import { Badge, Button, cn } from "./ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const agents = useCove((state) => state.agents);
  const currentAgentId = useCove((state) => state.currentAgentId);
  const liveCall = useCove((state) => state.liveCall);
  const clockOut = useCove((state) => state.clockOut);
  const me = agents.find((agent) => agent.id === currentAgentId);
  const live = agents.filter((agent) => agent.status !== "offline").length;

  return (
    <div className="min-h-dvh bg-parchment-100">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-parchment-200 bg-parchment-50 lg:block">
        <div className="px-5 py-5">
          <div className="font-serif text-2xl">Cove</div>
          <div className="text-xs text-cove-mute">Collections floor · unlicensed states</div>
        </div>
        <nav className="space-y-0.5 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-2xl px-3 py-2 text-sm",
                pathname.startsWith(item.href) ? "bg-cove-teal text-white" : "text-cove-ink hover:bg-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-56">
        <header className="ios-blur sticky top-0 z-20 border-b border-parchment-200 bg-parchment-50/80">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge tone="sage">{live} clocked in</Badge>
              {liveCall ? <Badge tone="coral">Live call</Badge> : null}
              {me ? (
                <span className="hidden text-cove-mute sm:inline">
                  {me.name} · {me.status.replace("_", " ")}
                </span>
              ) : (
                <Link href="/" className="text-cove-coral">
                  Clock in
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {me ? (
                <Button tone="ghost" className="min-h-9 text-xs" onClick={() => clockOut(me.id)}>
                  Clock out
                </Button>
              ) : null}
              <Link href="/" className="text-xs text-cove-mute">
                Switch agent
              </Link>
            </div>
          </div>
        </header>
        <main className="px-4 pb-24 pt-6 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="ios-blur fixed inset-x-0 bottom-0 z-30 border-t border-parchment-200 bg-parchment-50/90 pb-[var(--safe-b)] lg:hidden">
        <div className="grid grid-cols-5">
          {MOBILE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "py-2 text-center text-[11px]",
                pathname.startsWith(item.href) ? "text-cove-teal" : "text-cove-mute",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
