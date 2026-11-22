"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ContactForm } from "@/components/crm/contact-form";
import { saveRemoteContact, useCrmDirectory } from "@/components/crm/use-crm";
import { Timeline } from "@/components/tables";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { contactName, money, when } from "@/lib/format";
import { safeHttpUrl } from "@/lib/debt";
import { useMeridian } from "@/lib/store";
import type { Contact } from "@/lib/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

function closedLabel(value: Contact["closedDeal"]): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (typeof value === "string" && value) return value;
  return "—";
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

export default function ContactRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId, data } = useActiveWorkspace();
  const directory = useCrmDirectory(workspaceId);
  const addActivity = useMeridian((state) => state.addActivity);
  const updateContact = useMeridian((state) => state.updateContact);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contact = directory.contacts.find((item) => item.id === params.id);

  if (!directory.ready) return <PageHeader title="Loading contact…" />;
  if (!contact) return <PageHeader title="Contact not found" />;
  const record = contact;

  const company = directory.companies.find((item) => item.id === record.companyId);
  const deals = data.deals.filter((deal) => deal.contactId === contact.id);
  const activities = data.activities.filter((activity) => activity.contactId === contact.id);
  const linkedin = safeHttpUrl(contact.linkedin);
  const owner = data.users.find((user) => user.id === contact.ownerId);

  async function save(next: Contact) {
    setError(null);
    try {
      if (directory.remote) {
        await saveRemoteContact(workspaceId, { ...next, id: record.id });
        await directory.reload();
      } else {
        updateContact(record.id, next);
      }
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Contact"
        title={contactName(contact.firstName, contact.lastName)}
        subtitle={`${contact.title || "No title"} · ${company?.name ?? "No company"}`}
        actions={
          <div className="flex items-center gap-2">
            {contact.doNotEmail ? <Badge tone="bad">Do not email</Badge> : null}
            <Badge tone="accent">{contact.leadType ?? contact.lifecycle}</Badge>
            <Button tone="soft" onClick={() => setEditing((value) => !value)}>
              {editing ? "Close editor" : "Edit"}
            </Button>
          </div>
        }
      />
      {directory.notice ? <Card className="mb-4 p-4 text-sm">{directory.notice}</Card> : null}
      {editing ? (
        <Card className="mb-4 p-4">
          <ContactForm
            key={`${contact.id}:${contact.hubspotRecordId ?? ""}:${contact.email}`}
            value={contact}
            companies={directory.companies}
            users={data.users}
            submitLabel="Save changes"
            onSubmit={(next) => void save(next)}
            onCancel={() => setEditing(false)}
          />
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="grid gap-4 p-5 text-sm sm:grid-cols-2">
            <Fact label="Email" value={contact.email} />
            <Fact label="Email status" value={contact.emailStatus ?? "unknown"} />
            <Fact label="Phone" value={contact.phone} />
            <Fact label="Mobile" value={contact.mobile ?? ""} />
            <Fact label="Lead type" value={contact.leadType ?? ""} />
            <Fact label="Lead source" value={contact.leadSource ?? ""} />
            <Fact label="Asset classes" value={(contact.assetClassPreference ?? []).join(", ")} />
            <Fact label="Buying states" value={(contact.buyingStates ?? []).join(", ")} />
            <Fact label="Budget" value={contact.budget ?? ""} />
            <Fact label="Paper age" value={contact.paperAgePreference ?? ""} />
            <Fact label="Coverage" value={contact.coverage ?? ""} />
            <Fact label="Collect or litigate" value={contact.collectOrLitigate ?? ""} />
            <Fact label="NDA signed" value={contact.ndaSigned ?? ""} />
            <Fact label="Closed deal" value={closedLabel(contact.closedDeal)} />
            <Fact label="Desk replied" value={contact.deskReplied ? "Yes" : "No"} />
            <Fact label="Owner" value={owner?.name || contact.ownerName || ""} />
            <Fact label="Prospect segment" value={contact.prospectSegment ?? ""} />
            <Fact label="Size signal" value={contact.sizeSignal ?? ""} />
            <Fact label="HubSpot record ID" value={contact.hubspotRecordId ?? ""} />
            <Fact label="LinkedIn" value={linkedin ?? contact.linkedin ?? ""} />
            <Fact label="Message summary" value={contact.messageSummary ?? ""} />
            <Fact label="Notes" value={contact.notes ?? ""} />
          </Card>
          <Card className="p-5">
            <div className="mb-3 font-semibold">Log activity</div>
            <div className="flex gap-2">
              <input
                className="min-h-11 w-full rounded-xl border bg-transparent px-3 text-sm"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note, call recap, or email…"
              />
              <Button
                onClick={() => {
                  if (!note.trim()) return;
                  addActivity({
                    type: "note",
                    subject: "Note",
                    body: note,
                    contactId: contact.id,
                    companyId: contact.companyId,
                  });
                  setNote("");
                }}
              >
                Log
              </Button>
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-3 font-semibold">Activity</div>
            <Timeline
              items={activities.map((activity) => ({
                id: activity.id,
                title: `${activity.type} · ${activity.subject}`,
                body: activity.body,
                meta: when(activity.at),
              }))}
            />
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="space-y-2 p-5 text-sm">
            <div className="font-semibold">About</div>
            <div>{[contact.city, contact.state].filter(Boolean).join(", ") || "No location"}</div>
            <div>Score {contact.score}</div>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-2 font-semibold">Deals</div>
            {deals.length === 0 ? <div className="text-sm text-muted-foreground">No deals</div> : null}
            {deals.map((deal) => (
              <a key={deal.id} href={`/w/${workspaceId}/sales/deals/${deal.id}`} className="block py-2 text-sm">
                <div className="font-medium">{deal.name}</div>
                <div className="text-ink-500">
                  {deal.stage} · {money(deal.amount)}
                </div>
              </a>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
