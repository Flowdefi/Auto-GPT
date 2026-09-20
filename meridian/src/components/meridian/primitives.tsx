"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-2xl text-pretty text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function StatCard({
  label,
  value,
  hint,
  trend,
  icon,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { value: string; direction: "up" | "down" | "flat" };
  icon?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardContent className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {icon ? <div className="text-muted-foreground/70">{icon}</div> : null}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-24" />
        ) : (
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        )}
        <div className="mt-1 flex items-center gap-2">
          {trend ? (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                trend.direction === "up" && "text-success",
                trend.direction === "down" && "text-destructive",
                trend.direction === "flat" && "text-muted-foreground",
              )}
            >
              {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "—"} {trend.value}
            </span>
          ) : null}
          {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-12 text-center">
      <div className="font-medium">{title}</div>
      <div className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</div>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Horizontal scroller that keeps a native feel on touch devices. */
export function ScrollRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "no-scrollbar momentum-scroll -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ScoreRing({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const tone =
    clamped >= 70 ? "var(--color-success)" : clamped >= 40 ? "var(--color-warning)" : "var(--color-muted-foreground)";
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative grid size-11 place-items-center rounded-full"
        style={{ background: `conic-gradient(${tone} ${clamped * 3.6}deg, var(--color-muted) 0deg)` }}
        role="img"
        aria-label={`${label ?? "Score"} ${clamped} of 100`}
      >
        <div className="grid size-8 place-items-center rounded-full bg-card text-xs font-semibold tabular-nums">
          {clamped}
        </div>
      </div>
      {label ? <span className="text-xs text-muted-foreground">{label}</span> : null}
    </div>
  );
}
