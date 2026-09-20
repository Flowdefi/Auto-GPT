"use client";

/**
 * Adapter that keeps the first-generation hub pages on the shadcn/Radix design
 * system without rewriting each screen. New surfaces should import from
 * `@/components/ui/*` and `@/components/meridian/primitives` directly.
 */

import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Badge as UiBadge } from "@/components/ui/badge";
import { Button as UiButton } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export { cn };
export { PageHeader, Empty, SectionTitle, ScrollRow, ScoreRing, StatCard } from "./primitives";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-card transition-colors",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const TONE_TO_VARIANT = {
  primary: "brand",
  soft: "soft",
  ghost: "ghost",
  danger: "destructive",
} as const;

export function Button({
  className,
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: keyof typeof TONE_TO_VARIANT;
}) {
  return (
    <UiButton
      variant={TONE_TO_VARIANT[tone]}
      size="tap"
      className={cn("rounded-xl", className)}
      {...props}
    />
  );
}

export function Field({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <UiInput className={cn("min-h-11 rounded-xl", className)} {...props} />;
}

const BADGE_TONES = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  good: "bg-success/12 text-success border-transparent dark:text-success",
  warn: "bg-warning/18 text-warning-foreground border-transparent dark:text-warning",
  bad: "bg-destructive/12 text-destructive border-transparent",
  accent: "bg-[var(--brand-soft)] text-[var(--brand-text)] border-transparent",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
}) {
  return <UiBadge className={cn("rounded-full font-semibold", BADGE_TONES[tone])}>{children}</UiBadge>;
}

export function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </Card>
  );
}
