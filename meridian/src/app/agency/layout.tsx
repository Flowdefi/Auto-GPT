import Link from "next/link";
import type { ReactNode } from "react";
import { agencyName, agencyPages } from "@/lib/agency/site";

const LINKS = [{ href: "/agency", label: "Home" }, ...agencyPages().map((page) => ({ href: `/agency/${page.slug}`, label: page.title }))];

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="agency-site min-h-screen bg-[#f7f4ef] text-[#1c2430]">
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:bg-white focus:px-3 focus:py-2" href="#agency-main">
        Skip to content
      </a>
      <header className="border-b border-[#1c2430]/10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/agency" className="text-lg font-semibold">{agencyName()}</Link>
          <Link href="/collect" className="inline-flex min-h-11 items-center underline">Look up an account</Link>
        </div>
        <nav className="mx-auto hidden max-w-3xl flex-wrap gap-x-4 gap-y-2 px-4 pb-4 text-sm md:flex" aria-label="Agency">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center underline">{link.label}</Link>
          ))}
        </nav>
        <details className="mx-auto max-w-3xl px-4 pb-4 md:hidden">
          <summary className="min-h-11 cursor-pointer py-2">Menu</summary>
          <nav className="grid text-sm" aria-label="Agency mobile">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center underline">{link.label}</Link>
            ))}
          </nav>
        </details>
      </header>
      <main id="agency-main" className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
