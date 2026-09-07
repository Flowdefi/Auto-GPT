import clsx from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cn(...values: Array<string | false | null | undefined>) {
  return clsx(values);
}

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-3xl border border-parchment-200 bg-white shadow-paper", className)} {...props}>
      {children}
    </div>
  );
}

export function Button({
  className,
  tone = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "coral" | "sage" }) {
  const tones = {
    primary: "bg-cove-teal text-white",
    ghost: "bg-parchment-100 text-cove-ink",
    coral: "bg-cove-coral text-white",
    sage: "bg-cove-sage text-white",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-11 w-full rounded-2xl border border-parchment-200 bg-parchment-50 px-3 text-sm outline-none focus:ring-2 focus:ring-cove-teal",
        props.className,
      )}
    />
  );
}

export function Badge({
  children,
  tone = "sand",
}: {
  children: ReactNode;
  tone?: "sand" | "teal" | "coral" | "sage";
}) {
  const map = {
    sand: "bg-parchment-200 text-cove-ink",
    teal: "bg-cove-tealSoft text-cove-teal",
    coral: "bg-cove-coralSoft text-cove-coral",
    sage: "bg-emerald-50 text-cove-sage",
  };
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", map[tone])}>{children}</span>;
}

export function Title({
  kicker,
  title,
  sub,
  actions,
}: {
  kicker?: string;
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker ? <div className="text-xs font-semibold uppercase tracking-[0.16em] text-cove-sand">{kicker}</div> : null}
        <h1 className="font-serif text-3xl tracking-tight text-cove-ink">{title}</h1>
        {sub ? <p className="mt-1 max-w-2xl text-sm text-cove-mute">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
