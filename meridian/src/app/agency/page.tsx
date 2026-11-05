import type { Metadata } from "next";
import Link from "next/link";
import { currentBrand } from "@/server/brand";

export const metadata: Metadata = {
  title: "Collections",
  description: "Public pages for a debt collection agency. Draft for counsel review. No account numbers in the address.",
  robots: { index: true, follow: true },
};

export default function AgencyHomePage() {
  const name = currentBrand().name;
  return (
    <article>
      <p className="text-sm">Draft for counsel review. Not legal advice.</p>
      <h1 className="mt-3 text-4xl font-semibold leading-tight">{name}</h1>
      <p className="mt-4 text-lg leading-7">
        This is a debt collector. We will use any information you give us to help collect a debt. This sentence is the federal mini-Miranda and counsel must approve it before it is published. 15 U.S.C. § 1692e(11); 12 CFR § 1006.18.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/collect" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1c2430] px-5 text-white">Pay or look up an account</Link>
        <Link href="/agency/rights" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#1c2430] px-5">Your rights</Link>
      </div>
      <ul className="mt-10 grid gap-3 text-sm sm:grid-cols-2">
        <li><Link className="underline" href="/agency/dispute">Dispute your debt</Link></li>
        <li><Link className="underline" href="/agency/options">Payment options</Link></li>
        <li><Link className="underline" href="/agency/faq">FAQ</Link></li>
        <li><Link className="underline" href="/agency/contact">Contact</Link></li>
      </ul>
    </article>
  );
}
