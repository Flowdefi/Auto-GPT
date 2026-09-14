import type { Metadata } from "next";
import Link from "next/link";
import { HydrateGate } from "@/components/hydrate-gate";

export const metadata: Metadata = {
  title: "TF Recovery — Pay your account",
  description:
    "Make a payment or set up a payment plan on your account with TF Recovery. Secure card and bank payments.",
  appleWebApp: { capable: true, title: "TF Recovery", statusBarStyle: "black-translucent" },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-tfr-mist text-tfr-ink">
      <header className="border-b border-tfr-line bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/pay" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-tfr-navy text-sm font-bold text-white">
              TF
            </span>
            <span>
              <span className="block text-base font-semibold leading-tight">TF Recovery</span>
              <span className="block text-[11px] leading-tight text-tfr-blue">Secure payment portal</span>
            </span>
          </Link>
          <a href="tel:+18005550142" className="text-sm font-medium text-tfr-blue">
            (800) 555-0142
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-8">
        <HydrateGate>{children}</HydrateGate>
      </main>

      <footer className="border-t border-tfr-line bg-white pb-[var(--safe-b)]">
        <div className="mx-auto max-w-3xl space-y-2 px-5 py-6 text-xs leading-relaxed text-tfr-ink/70">
          <p className="font-medium text-tfr-ink">
            This is an attempt to collect a debt and any information obtained will be used for that purpose. This
            communication is from a debt collector.
          </p>
          <p>
            Payments appear on your statement as <strong>TF RECOVERY</strong>. Card and bank details are handled by our
            PCI-DSS Level 1 processor and are never stored on this site.
          </p>
          <p>
            You have the right to dispute this debt or request verification. Call us or write to TF Recovery, PO Box
            1420, Atlanta, GA 30301.
          </p>
          <p>
            Demonstration environment. Do not enter a real card number. TF Recovery is a trade name used for consumer
            payment servicing.
          </p>
        </div>
      </footer>
    </div>
  );
}
