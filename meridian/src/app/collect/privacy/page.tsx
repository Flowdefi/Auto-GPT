import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — consumer portal",
  description: "What the consumer portal stores. This page is a draft for counsel review.",
};

export default function CollectPrivacyPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-16 text-sm leading-6">
      <p className="text-xs font-semibold uppercase tracking-wide">Draft for counsel review</p>
      <h1 className="mt-2 text-3xl font-semibold">Privacy</h1>
      <p className="mt-4">
        This portal looks up an account with a reference number, the last four digits of the original account, and a ZIP code. Do not type a Social Security number into the page or the address bar.
      </p>
      <p className="mt-3">
        Test-mode payment records the amount and a sandbox receipt id. It does not ask for a card number, and no card data is stored on this server. A live deployment must use a hosted payment page from a PCI-compliant processor.
      </p>
      <p className="mt-3">
        Dispute text is stored on the account and stops further collection contact until the dispute is reviewed. Full Social Security numbers, dates of birth, and full account numbers, when present on a portfolio file, are encrypted and are not shown on this portal.
      </p>
      <p className="mt-3">
        This is an attempt to collect a debt, and any information obtained will be used for that purpose. This communication is from a debt collector. This notice is not the CFPB model validation form and is not a privacy policy approved by counsel.
      </p>
      <p className="mt-6">
        <a className="underline" href="/collect">
          Back to account lookup
        </a>
      </p>
    </main>
  );
}
