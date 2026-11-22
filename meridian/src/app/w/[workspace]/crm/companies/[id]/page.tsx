"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CompanyForm } from "@/components/crm/company-form";
import { ServerTimeline } from "@/components/crm/server-timeline";
import { saveRemoteCompany, useCrmDirectory } from "@/components/crm/use-crm";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import { contactName, money } from "@/lib/format";
import { safeHttpUrl } from "@/lib/debt";
import { useMeridian } from "@/lib/store";
import type { Company } from "@/lib/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

export default function CompanyRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId, data } = useActiveWorkspace();
  const directory = useCrmDirectory(workspaceId);
  const updateCompany = useMeridian((state) => state.updateCompany);
  const [enrichment, setEnrichment] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const company = directory.companies.find((item) => item.id === params.id);

  if (!directory.ready) return <PageHeader title="Loading company…" />;
  if (!company) return <PageHeader title="Company not found" />;
  const record = company;

  const companyId = record.id;
  const contacts = directory.contacts.filter((contact) => contact.companyId === companyId);
  const deals = data.deals.filter((deal) => deal.companyId === company.id);
  const books = data.inventory.filter((item) => item.sellerCompanyId === company.id);
  const website = safeHttpUrl(company.website);
  const linkedin = safeHttpUrl(company.linkedin);
  const owner = data.users.find((user) => user.id === company.ownerId);

  async function enrich() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, companyId }),
    });
    const payload = (await response.json()) as { error?: string; result?: Record<string, unknown> };
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? "Enrichment failed");
      return;
    }
    setEnrichment(payload.result ?? null);
  }

  async function save(next: Company) {
    setError(null);
    try {
      if (directory.remote) {
        await saveRemoteCompany(workspaceId, { ...next, id: record.id });
        await directory.reload();
      } else {
        updateCompany(record.id, next);
      }
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={company.companyType || company.type}
        title={company.name}
        subtitle={company.description || company.notes}
        actions={
          <div className="flex gap-2">
            <Button tone="soft" onClick={() => setEditing((value) => !value)}>
              {editing ? "Close editor" : "Edit"}
            </Button>
            <Button tone="soft" disabled={busy} onClick={() => void enrich()}>
              {busy ? "Enriching…" : "Enrich from public sources"}
            </Button>
          </div>
        }
      />
      {error ? <Card className="mb-4 p-4 text-sm">{error}</Card> : null}
      {editing ? (
        <Card className="mb-4 p-4">
          <CompanyForm
            key={`${company.id}:${company.domain}`}
            value={company}
            users={data.users}
            submitLabel="Save changes"
            onSubmit={(next) => void save(next)}
            onCancel={() => setEditing(false)}
          />
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="grid gap-3 p-5 text-sm md:col-span-2 sm:grid-cols-2">
          <Fact label="Domain" value={company.domain} />
          <Fact label="Website" value={website ?? company.website ?? ""} />
          <Fact label="Phone" value={company.phone ?? ""} />
          <Fact label="LinkedIn" value={linkedin ?? company.linkedin ?? ""} />
          <Fact label="Kind" value={company.type} />
          <Fact label="Debt roles" value={(company.debtRoles ?? []).join(", ") || company.companyType || ""} />
          <Fact label="Industry" value={company.industry} />
          <Fact label="Target account" value={company.targetAccount ? "Yes" : "No"} />
          <Fact label="Location" value={[company.street, company.city, company.state, company.zip, company.country].filter(Boolean).join(", ")} />
          <Fact label="Employees" value={company.employees} />
          <Fact label="Year founded" value={company.yearFounded ?? ""} />
          <Fact label="Lead status" value={company.leadStatus ?? ""} />
          <Fact label="Lifecycle" value={company.lifecycle} />
          <Fact label="Owner" value={owner?.name || company.ownerName || ""} />
          <Fact label="Close date" value={company.closeDate ?? ""} />
          <Fact label="HubSpot record ID" value={company.hubspotRecordId ?? ""} />
          <Fact label="Additional preferences" value={company.additionalPreferences ?? ""} />
          <Fact label="Notes" value={company.notes} />
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="font-semibold">People</div>
            {contacts.length === 0 ? <div className="mt-2 text-sm text-muted-foreground">No contacts</div> : null}
            {contacts.map((contact) => (
              <Link key={contact.id} href={`/w/${workspaceId}/crm/contacts/${contact.id}`} className="mt-2 block text-sm">
                {contactName(contact.firstName, contact.lastName)} · {contact.title || contact.leadType || "contact"}
                {contact.doNotEmail ? " · do not email" : ""}
              </Link>
            ))}
          </Card>
          <Card className="p-5">
            <div className="font-semibold">Deals</div>
            {deals.length === 0 ? <div className="mt-2 text-sm text-muted-foreground">No deals</div> : null}
            {deals.map((deal) => (
              <Link key={deal.id} href={`/w/${workspaceId}/sales/deals/${deal.id}`} className="mt-2 block text-sm">
                {deal.name} · {money(deal.amount)}
              </Link>
            ))}
          </Card>
        </div>
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
      <Card className="mt-4 p-5">
        <div className="font-semibold">Activity</div>
        <ServerTimeline workspaceId={workspaceId} companyId={record.id} />
      </Card>
      {enrichment ? (
        <Card className="mt-4 p-5 text-sm">
          <div className="font-semibold">Public enrichment</div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">{JSON.stringify(enrichment, null, 2)}</pre>
        </Card>
      ) : null}
    </div>
  );
}
