import clsx from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-ink-100 bg-white shadow-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" | "soft" }) {
  const tones = {
    primary: "text-white shadow-sm",
    ghost: "bg-transparent text-ink-700 hover:bg-ink-50",
    danger: "bg-red-600 text-white",
    soft: "text-[var(--accent-text)]",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-medium transition active:scale-[0.98] disabled:opacity-50",
        tone === "primary" && "bg-[var(--accent)]",
        tone === "soft" && "bg-[var(--accent-soft)]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm outline-none ring-[var(--accent)] placeholder:text-ink-400 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
}) {
  const map = {
    neutral: "bg-ink-50 text-ink-600",
    good: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-800",
    bad: "bg-red-50 text-red-700",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-text)]",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold", map[tone])}>
      {children}
    </span>
  );
}

export function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-ink-500">{hint}</div> : null}
    </Card>
  );
}

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
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-ink-500">{body}</div>
    </div>
  );
}
