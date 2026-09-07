"use client";

import {
  Bot,
  Briefcase,
  Building2,
  ChevronLeft,
  Home,
  Inbox,
  Menu,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { hubFromPath, navFor } from "@/lib/nav";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";
import { WORKSPACES } from "@/lib/workspaces";
import { AiDrawer } from "./ai-drawer";
import { cn } from "./ui";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { workspaceId, config, data, user } = useActiveWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const resetWorkspace = useMeridian((state) => state.resetWorkspace);
  const [openNav, setOpenNav] = useState(false);
  const [openAi, setOpenAi] = useState(false);
  const [query, setQuery] = useState("");
  const hub = hubFromPath(pathname);
  const nav = navFor(workspaceId);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const contacts = data.contacts
      .filter((contact) =>
        `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.title}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 4)
      .map((contact) => ({
        href: `/w/${workspaceId}/crm/contacts/${contact.id}`,
        title: `${contact.firstName} ${contact.lastName}`,
        meta: contact.title,
      }));
    const companies = data.companies
      .filter((company) => company.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((company) => ({
        href: `/w/${workspaceId}/crm/companies/${company.id}`,
        title: company.name,
        meta: company.industry,
      }));
    const deals = data.deals
      .filter((deal) => deal.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((deal) => ({
        href: `/w/${workspaceId}/sales/deals/${deal.id}`,
        title: deal.name,
        meta: money(deal.amount),
      }));
    return [...contacts, ...companies, ...deals];
  }, [data, query, workspaceId]);

  return (
    <div
      className="min-h-dvh bg-ink-50"
      style={
        {
          "--accent": config.theme.accent,
          "--accent-soft": config.theme.accentSoft,
          "--accent-text": config.theme.accentText,
          "--hero": config.theme.hero,
        } as React.CSSProperties
      }
    >
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-ink-800/40 bg-ink-950 text-ink-100 transition-transform lg:translate-x-0",
          openNav ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-ink-950"
            style={{ background: config.theme.accent }}
          >
            {config.theme.mark}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">Meridian</div>
            <div className="truncate text-[11px] text-ink-400">{config.legalName}</div>
          </div>
        </div>
        <div className="px-3 pb-3">
          <label className="sr-only" htmlFor="workspace-switch">
            Workspace
          </label>
          <select
            id="workspace-switch"
            className="w-full rounded-lg border border-ink-800 bg-ink-900 px-2 py-2 text-xs"
            value={workspaceId}
            onChange={(event) => {
              router.push(`/w/${event.target.value}/home`);
              setOpenNav(false);
            }}
          >
            {Object.values(WORKSPACES).map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.legalName}
              </option>
            ))}
          </select>
        </div>
        <nav className="space-y-0.5 px-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpenNav(false)}
              className={cn(
                "flex items-center rounded-lg px-3 py-2 text-sm",
                hub === item.hub
                  ? "bg-white/10 text-white"
                  : "text-ink-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-ink-800 p-3 text-[11px] text-ink-400">
          Enterprise · Smart CRM · Breeze-class AI
        </div>
      </aside>

      {openNav ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden"
          onClick={() => setOpenNav(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="ios-blur sticky top-0 z-20 border-b border-ink-100/80 bg-white/80">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              className="rounded-lg p-2 lg:hidden"
              onClick={() => setOpenNav(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/" className="hidden items-center gap-1 text-xs text-ink-500 sm:flex">
              <ChevronLeft className="h-3.5 w-3.5" />
              Workspaces
            </Link>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${config.product}…`}
                className="h-10 w-full rounded-xl border border-ink-100 bg-ink-50 pl-9 pr-3 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[var(--accent)]"
              />
              {hits.length > 0 ? (
                <div className="absolute left-0 right-0 top-11 z-30 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-pop">
                  {hits.map((hit) => (
                    <Link
                      key={hit.href}
                      href={hit.href}
                      onClick={() => setQuery("")}
                      className="block px-3 py-2 hover:bg-ink-50"
                    >
                      <div className="text-sm font-medium">{hit.title}</div>
                      <div className="text-xs text-ink-500">{hit.meta}</div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setOpenAi(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--accent-soft)] px-3 text-sm font-semibold text-[var(--accent-text)]"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
            <button
              type="button"
              onClick={() => resetWorkspace(workspaceId)}
              className="hidden rounded-xl px-2 text-xs text-ink-400 hover:text-ink-700 md:inline"
            >
              Reset demo
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
              {user?.initials}
            </div>
          </div>
        </header>

        <main className="px-3 pb-24 pt-5 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <nav className="ios-blur fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/90 pb-[var(--safe-b)] lg:hidden">
        <div className="grid grid-cols-5">
          {[
            { href: `/w/${workspaceId}/home`, label: "Home", icon: Home },
            { href: `/w/${workspaceId}/crm/contacts`, label: "CRM", icon: Building2 },
            { href: `/w/${workspaceId}/conversations`, label: "Inbox", icon: Inbox },
            { href: `/w/${workspaceId}/sales/deals`, label: "Sales", icon: Briefcase },
            { href: `/w/${workspaceId}/ai`, label: "AI", icon: Bot },
          ].map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px]",
                  active ? "text-[var(--accent-text)]" : "text-ink-400",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <AiDrawer open={openAi} onClose={() => setOpenAi(false)} />
    </div>
  );
}
