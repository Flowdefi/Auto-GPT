"use client";

import { ChevronLeft, Command, Menu, RotateCcw, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { haptic, isIos } from "@/lib/ios";
import { hubFromPath, navFor, type NavItem } from "@/lib/nav";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";
import { cn } from "@/lib/utils";
import { WORKSPACES } from "@/lib/workspaces";
import { AiDrawer } from "./ai-drawer";
import { CommandPalette } from "./meridian/command-palette";
import { NavIcon } from "./meridian/icon";
import { ThemeToggle } from "./meridian/theme-provider";

const GROUP_ORDER = ["Workspace", "Revenue", "Marketing", "Platform"] as const;

function NavList({
  items,
  activeHref,
  hub,
  onNavigate,
}: {
  items: NavItem[];
  activeHref: string;
  hub: string;
  onNavigate?: () => void;
}) {
  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      items: items.filter((item) => item.group === group),
    })).filter((section) => section.items.length > 0);
  }, [items]);

  return (
    <nav className="space-y-5 px-3 pb-6">
      {grouped.map((section) => (
        <div key={section.group}>
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
            {section.group}
          </div>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = activeHref === item.href || (hub === item.hub && activeHref.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    haptic("light");
                    onNavigate?.();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <NavIcon
                    name={item.icon}
                    className={cn("size-4 shrink-0", active ? "text-[var(--brand)]" : "opacity-70")}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { workspaceId, config, user } = useActiveWorkspace();
  const pathname = usePathname();
  const router = useRouter();
  const resetWorkspace = useMeridian((state) => state.resetWorkspace);
  const [navOpen, setNavOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [ios, setIos] = useState(false);

  const hub = hubFromPath(pathname);
  const nav = navFor(workspaceId);
  const mobileTabs = nav.filter((item) => item.mobile).slice(0, 5);

  useEffect(() => setIos(isIos()), []);

  return (
    <div
      data-workspace={workspaceId}
      className="min-h-dvh bg-background"
      style={
        {
          "--brand": config.theme.accent,
          "--brand-soft": config.theme.accentSoft,
          "--brand-text": config.theme.accentText,
          "--hero": config.theme.hero,
        } as React.CSSProperties
      }
    >
      <style>{`.dark [data-workspace="${workspaceId}"]{--brand-text:${config.theme.accentTextDark};}`}</style>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <div
            className="grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold text-[oklch(0.16_0.03_247)]"
            style={{ background: config.theme.accent }}
          >
            {config.theme.mark}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-accent-foreground">Meridian</div>
            <div className="truncate text-[11px] text-sidebar-foreground/55">{config.product}</div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex min-h-10 w-full items-center justify-between rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 text-left text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              >
                <span className="truncate">{config.legalName}</span>
                <ChevronLeft className="size-3.5 -rotate-90 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {Object.values(WORKSPACES).map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  onSelect={() => {
                    haptic("medium");
                    router.push(`/w/${workspace.id}/home`);
                  }}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: workspace.theme.accent }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{workspace.legalName}</div>
                    <div className="truncate text-xs text-muted-foreground">{workspace.industry}</div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/")}>All workspaces</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1">
          <NavList items={nav} activeHref={pathname} hub={hub} />
        </ScrollArea>

        <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/50">
          Smart CRM · SEO · Breeze-class AI
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Header */}
        <header className="ios-blur sticky top-0 z-30 border-b bg-background/80 safe-top">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="tap-target lg:hidden" aria-label="Open navigation">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[17rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
                <SheetHeader className="px-4 pb-0">
                  <SheetTitle className="flex items-center gap-2.5 text-sidebar-accent-foreground">
                    <span
                      className="grid size-8 place-items-center rounded-lg text-xs font-bold text-[oklch(0.16_0.03_247)]"
                      style={{ background: config.theme.accent }}
                    >
                      {config.theme.mark}
                    </span>
                    {config.name}
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100dvh-5rem)]">
                  <NavList items={nav} activeHref={pathname} hub={hub} onNavigate={() => setNavOpen(false)} />
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <button
              type="button"
              onClick={() => {
                haptic("light");
                setPaletteOpen(true);
              }}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-muted/60 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Search className="size-4 shrink-0" />
              <span className="truncate">Search {config.product}…</span>
              {!ios ? (
                <kbd className="ml-auto hidden items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium sm:flex">
                  <Command className="size-3" />K
                </kbd>
              ) : null}
            </button>

            <Button
              variant="soft"
              size="tap"
              className="rounded-xl"
              onClick={() => {
                haptic("medium");
                setAiOpen(true);
              }}
            >
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">AI</span>
            </Button>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="tap-target grid place-items-center" aria-label="Account">
                  <Avatar className="size-9">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {user?.initials}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm">{user?.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push(`/w/${workspaceId}/settings/integrations`)}>
                  <NavIcon name="Plug" className="size-4" />
                  Integrations
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push("/billing")}>
                  <NavIcon name="KeyRound" className="size-4" />
                  Billing &amp; keys
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    resetWorkspace(workspaceId);
                    toast.success("Demo CRM data restored");
                  }}
                >
                  <RotateCcw className="size-4" />
                  Reset demo data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    void fetch("/api/auth/logout", { method: "POST" }).then(() => {
                      router.push("/login");
                      router.refresh();
                    });
                  }}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="momentum-scroll safe-x px-3 pb-[calc(var(--tabbar-h)+var(--safe-b)+1.5rem)] pt-5 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>

      {/* iOS-style bottom tab bar */}
      <nav
        className="ios-blur fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[var(--safe-b)] lg:hidden"
        aria-label="Primary"
      >
        <div className="grid grid-cols-5">
          {mobileTabs.map((item) => {
            const active = pathname.startsWith(item.href) || hub === item.hub;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => haptic("light")}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "no-select flex min-h-[var(--tabbar-h)] flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                  active ? "text-[var(--brand-text)]" : "text-muted-foreground",
                )}
              >
                <NavIcon name={item.icon} className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onAskAi={() => setAiOpen(true)} />
      <AiDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
