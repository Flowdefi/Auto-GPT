"use client";

import Link from "next/link";
import { Badge, Card, Title } from "@/components/ui";
import { money } from "@/lib/format";
import { useCove } from "@/lib/store";
import { OPEN_STATES } from "@/lib/states";

export default function FloorPage() {
  const agents = useCove((state) => state.agents);
  const accounts = useCove((state) => state.accounts);
  const setStatus = useCove((state) => state.setStatus);
  const currentAgentId = useCove((state) => state.currentAgentId);
  const collected = agents.reduce((sum, agent) => sum + agent.collectedToday, 0);
  const open = accounts.filter((account) => OPEN_STATES.includes(account.state) && account.status !== "paid");

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
      <div className="mt-6 flex gap-3">
        <Link href="/dialer" className="text-sm font-semibold text-cove-teal">
          Open dialer →
        </Link>
        <Link href="/bot" className="text-sm text-cove-mute">
          Recovery bot
        </Link>
      </div>
    </div>
  );
}
