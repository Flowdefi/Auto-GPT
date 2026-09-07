"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Timeline } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { meridianReply } from "@/lib/ai";
import { centsOnDollar, money, when } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function DealRecordPage() {
  const params = useParams<{ id: string }>();
  const { config, data } = useActiveWorkspace();
  const addActivity = useMeridian((state) => state.addActivity);
  const moveDeal = useMeridian((state) => state.moveDeal);
  const pushAi = useMeridian((state) => state.pushAi);
  const [note, setNote] = useState("");
  const deal = data.deals.find((item) => item.id === params.id);
  if (!deal) return <PageHeader title="Deal not found" />;
  const company = data.companies.find((item) => item.id === deal.companyId);
  const contact = data.contacts.find((item) => item.id === deal.contactId);
  const inventory = data.inventory.find((item) => item.id === deal.inventoryId);
  const activities = data.activities.filter((activity) => activity.dealId === deal.id);
  const quote = data.quotes.find((item) => item.dealId === deal.id);

  function askAi(prompt: string) {
    pushAi({ role: "user", body: prompt });
    const reply = meridianReply(prompt, data, config);
    pushAi({ role: "assistant", body: reply.body });
    addActivity({
      type: "ai",
      subject: reply.subject ?? "AI on deal",
      body: reply.body,
      dealId: deal?.id,
      contactId: deal?.contactId,
      companyId: deal?.companyId,
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow={config.dealNoun}
        title={deal.name}
        subtitle={deal.nextStep}
        actions={
          <select
            className="min-h-11 rounded-xl border border-ink-200 px-3 text-sm"
            value={deal.stage}
            onChange={(event) => moveDeal(deal.id, event.target.value)}
          >
            {config.pipeline.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Button tone="soft" onClick={() => askAi(`score ${deal.name}`)}>
          AI score
        </Button>
        <Button tone="ghost" onClick={() => askAi(`draft email about ${deal.name}`)}>
          AI draft email
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs text-ink-400">Amount</div>
              <div className="text-xl font-semibold">{money(deal.amount)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-ink-400">Probability</div>
              <div className="text-xl font-semibold">{deal.probability}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-ink-400">Forecast</div>
              <div className="text-xl font-semibold capitalize">{deal.forecast.replace("_", " ")}</div>
            </Card>
          </div>
          <Card className="p-5">
            <div className="mb-3 font-semibold">Log</div>
            <div className="flex gap-2">
              <Field value={note} onChange={(event) => setNote(event.target.value)} placeholder="Call, email, bid note…" />
              <Button
                onClick={() => {
                  if (!note.trim()) return;
                  addActivity({
                    type: "note",
                    subject: "Note",
                    body: note,
                    dealId: deal.id,
                    companyId: deal.companyId,
                    contactId: deal.contactId,
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
            <div className="font-semibold">Associations</div>
            <div>{company?.name}</div>
            <div>
              {contact?.firstName} {contact?.lastName}
            </div>
            <div>Close {deal.closeDate}</div>
            {quote ? (
              <div>
                Quote {quote.name} · <Badge>{quote.status}</Badge>
              </div>
            ) : null}
          </Card>
          {inventory ? (
            <Card className="space-y-1 p-5 text-sm">
              <div className="font-semibold">{config.inventoryNoun}</div>
              <div>{inventory.name}</div>
              <div>{inventory.kind}</div>
              <div>Face {money(inventory.faceValue)}</div>
              <div>Ask {centsOnDollar(inventory.faceValue, inventory.askingPrice)}</div>
              <div>Media {inventory.mediaQuality}</div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
