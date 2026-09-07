"use client";

import Link from "next/link";
import { Badge, Card, Metric, PageHeader } from "@/components/ui";
import { centsOnDollar, money, relativeDay } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function HomePage() {
  const { workspaceId, config, data, user } = useActiveWorkspace();
  const weighted = data.deals.reduce((sum, deal) => sum + deal.amount * (deal.probability / 100), 0);
  const openTasks = data.tasks.filter((task) => task.status === "open");
  const unread = data.conversations.filter((conversation) => conversation.unread).length;
  const liveInventory = data.inventory.filter((item) => item.status === "in_market" || item.status === "listed");

  return (
    <div>
      <PageHeader
        eyebrow={config.product}
        title={`Good afternoon, ${user?.name.split(" ")[0] ?? "there"}`}
        subtitle={config.tagline}
      />
      <div
        className="mb-6 overflow-hidden rounded-3xl p-6 text-white"
        style={{ background: config.theme.hero }}
      >
        <div className="text-xs uppercase tracking-[0.16em] text-white/70">This week</div>
        <div className="mt-2 max-w-xl text-2xl font-semibold">
          {config.id === "triton"
            ? "FHB Q3 bid window is live. Summit funds Friday. ACCU still needs a board memo."
            : "Helios wants a 15-minute firm on 620 BTC. NIMB is blocked on unlocks."}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {config.complianceBadges.map((badge) => (
            <span key={badge} className="rounded-full bg-white/15 px-2 py-1 text-xs">
              {badge}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Weighted pipeline" value={money(weighted)} hint={`${data.deals.length} open ${config.dealNounPlural}`} />
        <Metric label="Unread inbox" value={String(unread)} hint="Conversations needing a human" />
        <Metric label={`Live ${config.inventoryNounPlural}`} value={String(liveInventory.length)} hint="In market or listed" />
        <Metric label="Open tasks" value={String(openTasks.length)} hint={openTasks[0]?.title} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">My pipeline</h2>
            <Link href={`/w/${workspaceId}/sales/deals`} className="text-sm text-[var(--accent-text)]">
              Open sales
            </Link>
          </div>
          <div className="space-y-2">
            {data.deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/w/${workspaceId}/sales/deals/${deal.id}`}
                className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-ink-50"
              >
                <div>
                  <div className="text-sm font-medium">{deal.name}</div>
                  <div className="text-xs text-ink-500">
                    {deal.stage} · {deal.probability}% · close {relativeDay(deal.closeDate)}
                  </div>
                </div>
                <div className="text-sm font-semibold">{money(deal.amount)}</div>
              </Link>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Tasks</h2>
          <div className="space-y-3">
            {openTasks.map((task) => (
              <div key={task.id}>
                <div className="text-sm font-medium">{task.title}</div>
                <div className="text-xs text-ink-500">
                  {task.priority} · {relativeDay(task.due)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{config.inventoryNounPlural}</h2>
          <Link href={`/w/${workspaceId}/marketplace`} className="text-sm text-[var(--accent-text)]">
            Marketplace
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.inventory.map((item) => (
            <Link
              key={item.id}
              href={`/w/${workspaceId}/marketplace/${item.id}`}
              className="rounded-2xl border border-ink-100 p-4 hover:border-ink-200"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{item.name}</div>
                <Badge tone="accent">{item.status}</Badge>
              </div>
              <div className="mt-1 text-sm text-ink-500">{item.kind}</div>
              <div className="mt-3 text-sm">
                {money(item.faceValue)} face · {centsOnDollar(item.faceValue, item.askingPrice)} ask
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
