"use client";

import { Badge, Card, Title } from "@/components/ui";
import { CATEGORY_LABEL, VENDORS, type VendorCategory } from "@/lib/vendors";

const ORDER: VendorCategory[] = ["payments", "skip", "telephony", "messaging", "mail"];

const GATE_COPY: Record<string, string> = {
  open: "Sign up today",
  credentialed: "Credentialing required",
  underwritten: "Underwriting required",
};

export default function VendorsPage() {
  return (
    <div>
      <Title
        kicker="Integrations"
        title="Vendor stack"
        sub="What Cove plugs into, why each one, and what the catch is. Pricing is from public pages — everyone in this list quotes by volume."
      />

      <Card className="mb-4 p-5 text-sm">
        <div className="font-semibold">Recommended starting stack</div>
        <ol className="mt-2 space-y-1.5 text-cove-mute">
          <li>
            <span className="font-medium text-cove-ink">Payments:</span> Corepay for a fast MID under the TF Recovery
            DBA, with a REPAY file opened in parallel to migrate once volume justifies interchange-plus.
          </li>
          <li>
            <span className="font-medium text-cove-ink">Skip:</span> MicroBilt for cheap bulk appends, IDI idiCORE for
            the deep traces and the deceased/bankruptcy flags that drive dispositions.
          </li>
          <li>
            <span className="font-medium text-cove-ink">Voice:</span> VICIdial on a dedicated CPU-optimized host, with
            a SIP carrier that signs A-attestation and supports branded caller ID.
          </li>
          <li>
            <span className="font-medium text-cove-ink">SMS:</span> 10DLC brand and campaign registration before a
            single message goes out.
          </li>
          <li>
            <span className="font-medium text-cove-ink">Mail:</span> a print-and-mail API so Reg F validation goes out
            the day an account is placed.
          </li>
        </ol>
      </Card>

      {ORDER.map((category) => (
        <section key={category} className="mb-6">
          <h2 className="mb-3 font-serif text-xl">{CATEGORY_LABEL[category]}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {VENDORS.filter((vendor) => vendor.category === category).map((vendor) => (
              <Card key={vendor.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <a
                    href={vendor.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-serif text-lg hover:underline"
                  >
                    {vendor.name}
                  </a>
                  <div className="flex gap-2">
                    {vendor.recommended ? <Badge tone="sage">Recommended</Badge> : null}
                    <Badge tone={vendor.gate === "open" ? "teal" : "sand"}>{GATE_COPY[vendor.gate]}</Badge>
                  </div>
                </div>
                <p className="mt-2 text-sm text-cove-ink">{vendor.what}</p>
                <p className="mt-2 text-sm text-cove-mute">
                  <span className="font-medium text-cove-ink">Pricing.</span> {vendor.pricing}
                </p>
                <p className="mt-2 text-sm text-cove-mute">
                  <span className="font-medium text-cove-ink">Why.</span> {vendor.why}
                </p>
                <p className="mt-2 text-sm text-cove-coral">
                  <span className="font-medium">Watch out.</span> {vendor.watchOut}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
