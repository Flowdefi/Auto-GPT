"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Timeline } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { contactName, money, when } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function ContactRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId, data } = useActiveWorkspace();
  const addActivity = useMeridian((state) => state.addActivity);
  const [note, setNote] = useState("");
  const contact = data.contacts.find((item) => item.id === params.id);
  if (!contact) return <PageHeader title="Contact not found" />;
  const company = data.companies.find((item) => item.id === contact.companyId);
  const deals = data.deals.filter((deal) => deal.contactId === contact.id);
  const activities = data.activities.filter((activity) => activity.contactId === contact.id);

  return (
    <div>
      <PageHeader
        eyebrow="Contact"
        title={contactName(contact.firstName, contact.lastName)}
        subtitle={`${contact.title} · ${company?.name ?? "—"}`}
        actions={<Badge tone="accent">{contact.lifecycle}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 font-semibold">Log activity</div>
            <div className="flex gap-2">
              <Field value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note, call recap, or email…" />
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
            <div>{contact.email}</div>
            <div>{contact.phone}</div>
            <div>
              {contact.city}, {contact.state}
            </div>
            <div>Score {contact.score}</div>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="mb-2 font-semibold">Deals</div>
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
