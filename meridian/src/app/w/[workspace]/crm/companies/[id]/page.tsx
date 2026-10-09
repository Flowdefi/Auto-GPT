"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import { contactName, money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function CompanyRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId, data } = useActiveWorkspace();
  const [enrichment, setEnrichment] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const company = data.companies.find((item) => item.id === params.id);
  if (!company) return <PageHeader title="Company not found" />;
  const companyId = company.id;
  const contacts = data.contacts.filter((contact) => contact.companyId === companyId);
  const deals = data.deals.filter((deal) => deal.companyId === company.id);
  const books = data.inventory.filter((item) => item.sellerCompanyId === company.id);

  async function enrich() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, companyId }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? "Enrichment failed");
      return;
    }
    setEnrichment(payload.result ?? null);
  }

  return (
    <div>
      <PageHeader
        eyebrow={company.type}
        title={company.name}
        subtitle={company.notes}
        actions={
          <Button tone="soft" disabled={busy} onClick={() => void enrich()}>
            {busy ? "Enriching…" : "Enrich from public sources"}
          </Button>
        }
      />
      {error ? <Card className="mb-4 p-4 text-sm">{error}</Card> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 text-sm">
          <div className="font-semibold">Profile</div>
          <div className="mt-2">{company.domain}</div>
          <div>
            {company.city}, {company.state}
          </div>
          <div>{company.employees} employees</div>
          <div>{company.industry}</div>
        </Card>
        <Card className="p-5">
          <div className="font-semibold">People</div>
          {contacts.map((contact) => (
            <Link key={contact.id} href={`/w/${workspaceId}/crm/contacts/${contact.id}`} className="mt-2 block text-sm">
              {contactName(contact.firstName, contact.lastName)} · {contact.title}
            </Link>
          ))}
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Deals</div>
          {deals.map((deal) => (
            <Link key={deal.id} href={`/w/${workspaceId}/sales/deals/${deal.id}`} className="mt-2 block text-sm">
              {deal.name} · {money(deal.amount)}
            </Link>
          ))}
        </Card>
      </div>
      {books.length > 0 ? (
        <Card className="mt-4 p-5">
          <div className="font-semibold">Inventory from this company</div>
          {books.map((item) => (
            <Link key={item.id} href={`/w/${workspaceId}/marketplace/${item.id}`} className="mt-2 block text-sm">
              {item.name} · {item.kind} · {money(item.faceValue)}
            </Link>
          ))}
        </Card>
      ) : null}
      {enrichment ? (
        <Card className="mt-4 p-5 text-sm">
          <div className="font-semibold">Public enrichment</div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(enrichment, null, 2)}</pre>
        </Card>
      ) : null}
    </div>
  );
}
