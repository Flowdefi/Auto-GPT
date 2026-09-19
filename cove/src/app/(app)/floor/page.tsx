"use client";

import Link from "next/link";
import { Badge, Card, Title } from "@/components/ui";
import { money, pct } from "@/lib/format";
import { rollUp, totals } from "@/lib/portfolios";
import { useCove } from "@/lib/store";
import { OPEN_STATES } from "@/lib/states";

export default function FloorPage() {
  const agents = useCove((state) => state.agents);
  const accounts = useCove((state) => state.accounts);
  const portfolios = useCove((state) => state.portfolios);
  const plans = useCove((state) => state.plans);
  const setStatus = useCove((state) => state.setStatus);
  const currentAgentId = useCove((state) => state.currentAgentId);
  const collected = agents.reduce((sum, agent) => sum + agent.collectedToday, 0);
  const open = accounts.filter((account) => OPEN_STATES.includes(account.state) && account.status !== "paid");
  const book = totals(rollUp(portfolios, accounts, plans));

  return (
    <div>
      <Title
        kicker="Live pool"
        title="Who’s on the floor"
        sub="Clock-in statuses drive inbound transfers. Only available agents can take a warm pop with the full debtor CRM."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-cove-mute">Collected today</div>
          <div className="font-serif text-3xl">{money(collected)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-cove-mute">Workable open-state accounts</div>
          <div className="font-serif text-3xl">{open.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-cove-mute">Available now</div>
          <div className="font-serif text-3xl">
            {agents.filter((agent) => agent.status === "available").length}
          </div>
        </Card>
      </div>
      {book ? (
        <Card className="mb-5 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-cove-sand">Book liquidation</div>
            <Link href="/portfolios" className="text-sm font-semibold text-cove-teal">
              Liquidation tracker →
            </Link>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-4">
            <div>
              <div className="text-xs text-cove-mute">Liquidated</div>
              <div className="font-serif text-2xl">{pct(book.liquidationPct)}</div>
              <div className="text-xs text-cove-mute">break-even {pct(book.breakEvenPct)}</div>
            </div>
            <div>
              <div className="text-xs text-cove-mute">Collected / cost</div>
              <div className="font-serif text-2xl">{money(book.collected)}</div>
              <div className="text-xs text-cove-mute">on {money(book.cost)}</div>
            </div>
            <div>
              <div className="text-xs text-cove-mute">Pending plans</div>
              <div className="font-serif text-2xl">{money(book.pendingPlanDollars)}</div>
              <div className="text-xs text-cove-mute">{book.pendingPlanCount} active</div>
            </div>
            <div>
              <div className="text-xs text-cove-mute">Workable accounts</div>
              <div className="font-serif text-2xl">{book.workable}</div>
              <div className="text-xs text-cove-mute">of {book.accounts} placed</div>
            </div>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {agents.map((agent) => (
          <Card key={agent.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold">{agent.name}</div>
              <div className="text-sm text-cove-mute">
                {agent.role} · {agent.callsToday} calls · {money(agent.collectedToday)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={agent.status === "available" ? "sage" : agent.status === "on_call" ? "coral" : "sand"}>
                {agent.status.replace("_", " ")}
              </Badge>
              {currentAgentId === agent.id
                ? (["available", "break", "wrap"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className="rounded-full bg-parchment-100 px-3 py-1 text-xs"
                      onClick={() => setStatus(agent.id, status)}
                    >
                      {status}
                    </button>
                  ))
                : null}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link href="/dialer" className="text-sm font-semibold text-cove-teal">
          Open dialer →
        </Link>
        <Link href="/bot" className="text-sm text-cove-mute">
          Recovery bot
        </Link>
        <Link href="/staffing" className="text-sm text-cove-mute">
          Lease accounts
        </Link>
        <Link href="/qa" className="text-sm text-cove-mute">
          Call QA
        </Link>
        <Link href="/pay" className="text-sm text-cove-mute">
          TF Recovery pay portal
        </Link>
      </div>
    </div>
  );
}
