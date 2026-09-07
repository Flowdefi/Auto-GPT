"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, Metric, PageHeader } from "@/components/ui";
import { meridianReply } from "@/lib/ai";
import { centsOnDollar, compact, money } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function InventoryRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId, config, data } = useActiveWorkspace();
  const pushAi = useMeridian((state) => state.pushAi);
  const addActivity = useMeridian((state) => state.addActivity);
  const item = data.inventory.find((record) => record.id === params.id);
  if (!item) return <PageHeader title="Not found" />;
  const seller = data.companies.find((company) => company.id === item.sellerCompanyId);
  const deal = data.deals.find((record) => record.inventoryId === item.id);

  return (
    <div>
      <PageHeader eyebrow={item.kind} title={item.name} subtitle={item.notes} actions={<Badge tone="accent">{item.status}</Badge>} />
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Metric label="Face / notional" value={money(item.faceValue)} />
        <Metric label="Asking" value={money(item.askingPrice)} hint={centsOnDollar(item.faceValue, item.askingPrice)} />
        <Metric label="Accounts" value={compact(item.accountCount)} hint={`Avg ${money(item.avgBalance)}`} />
        <Metric label="Media" value={item.mediaQuality} hint={item.scoreBand} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 p-5 text-sm">
          <div className="font-semibold">Tape / mandate facts</div>
          <div>Seller / issuer: {seller?.name}</div>
          <div>Vintage: {item.vintage}</div>
          <div>States / venues: {item.states.join(", ")}</div>
          <div>Status: {item.status}</div>
          {deal ? (
            <Link href={`/w/${workspaceId}/sales/deals/${deal.id}`} className="text-[var(--accent-text)]">
              Linked deal · {deal.stage}
            </Link>
          ) : null}
        </Card>
        <Card className="p-5">
          <div className="font-semibold">Meridian AI</div>
          <p className="mt-2 text-sm text-ink-600">
            Score this book with the same engine used in the assistant — grounded in media, vintage, and ask.
          </p>
          <button
            type="button"
            className="mt-4 rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm font-semibold text-[var(--accent-text)]"
            onClick={() => {
              const prompt = `score ${item.name}`;
              pushAi({ role: "user", body: prompt });
              const reply = meridianReply(prompt, data, config);
              pushAi({ role: "assistant", body: reply.body });
              addActivity({
                type: "ai",
                subject: reply.subject ?? "Inventory score",
                body: reply.body,
                dealId: deal?.id,
                companyId: item.sellerCompanyId,
              });
            }}
          >
            Score with AI
          </button>
        </Card>
      </div>
    </div>
  );
}
