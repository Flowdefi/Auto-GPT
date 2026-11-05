import Link from "next/link";
import type { ReactNode } from "react";
import { agencyPages } from "@/lib/agency/site";
import { currentBrand } from "@/server/brand";

export const dynamic = "force-dynamic";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  const brand = currentBrand();
  const links = [{ href: "/agency", label: "Home" }, ...agencyPages(brand.name).map((page) => ({ href: `/agency/${page.slug}`, label: page.title }))];
  return (
    <div className="agency-site min-h-screen bg-[#f7f4ef] text-[#1c2430]" style={{ ["--agency" as string]: brand.color }}>
      <a className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:bg-white focus:px-3 focus:py-2" href="#agency-main">
        Skip to content
      </a>
      <header className="border-b border-[#1c2430]/10">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/agency" className="text-lg font-semibold" style={{ color: brand.color }}>
            {brand.logoUrl ? <img src={brand.logoUrl} alt="" className="mr-2 inline h-8 w-8 rounded" /> : null}
            {brand.name}
          </Link>
          <Link href="/collect" className="inline-flex min-h-11 items-center underline">Look up an account</Link>
        </div>
        <nav className="mx-auto hidden max-w-3xl flex-wrap gap-x-4 gap-y-2 px-4 pb-4 text-sm md:flex" aria-label="Agency">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center underline">{link.label}</Link>
          ))}
        </nav>
        <details className="mx-auto max-w-3xl px-4 pb-4 md:hidden">
          <summary className="min-h-11 cursor-pointer py-2">Menu</summary>
          <nav className="grid text-sm" aria-label="Agency mobile">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center underline">{link.label}</Link>
            ))}
          </nav>
        </details>
      </header>
      <main id="agency-main" className="mx-auto max-w-3xl px-4 py-8">
        <p className="mb-6 text-sm">Draft for counsel review. Not legal advice.</p>
        {children}
      </main>
    </div>
  );
}
