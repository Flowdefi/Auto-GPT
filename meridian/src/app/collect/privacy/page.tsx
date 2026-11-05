"use client";

import { usePortalCopy } from "@/components/collect/portal-frame";

export default function CollectPrivacyPage() {
  const copy = usePortalCopy();
  return (
    <main className="mx-auto max-w-lg px-6 py-10 text-sm leading-6">
      <h1 className="text-3xl font-semibold">{copy.privacy}</h1>
      <p className="mt-4">{copy.privacyLead}</p>
      <p className="mt-3">{copy.privacyPayment}</p>
      <p className="mt-3">{copy.privacyDispute}</p>
      <p className="mt-3">{copy.disclosure} {copy.counsel}</p>
      <p className="mt-6">
        <a className="inline-flex min-h-11 items-center underline" href="/collect">{copy.back}</a>
      </p>
    </main>
  );
}
