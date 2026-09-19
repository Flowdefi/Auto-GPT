"use client";

import { useRouter } from "next/navigation";
import { Badge, Button, Card, Title } from "@/components/ui";
import { outreachBlock } from "@/lib/compliance";
import { accountName, money } from "@/lib/format";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";

export default function DialerPage() {
  const router = useRouter();
  const accounts = useCove((state) => state.accounts);
  const queue = useCove((state) => state.queue);
  const agents = useCove((state) => state.agents);
  const currentAgentId = useCove((state) => state.currentAgentId);
  const queueDialer = useCove((state) => state.queueDialer);
  const startCall = useCove((state) => state.startCall);
  const me = currentAgentId ?? agents.find((agent) => agent.status === "available")?.id;

  return (
    <div>
      <Title
        kicker="Automated outbound"
        title="Dialer"
        sub="Progressive queue. State gate + TCPA + 8–9 local time. AI answers first, then warms to a live agent with the CRM already open."
        actions={<Button onClick={queueDialer}>Build compliant queue</Button>}
      />
      <p className="mb-4 text-sm text-cove-mute">{queue.length} accounts currently queued.</p>
      <div className="grid gap-3">
        {accounts.map((account) => {
          const block = outreachBlock(account, "call");
          return (
            <Card key={account.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{accountName(account.firstName, account.lastName)}</div>
                  <div className="text-sm text-cove-mute">
                    {account.city}, {account.state} · {account.product} · {money(account.balance)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={canDialState(account.state) ? "sage" : "coral"}>
                    {account.state} {canDialState(account.state) ? "open" : "gated"}
                  </Badge>
                  <Badge>{account.status}</Badge>
                </div>
              </div>
              {block ? <p className="mt-2 text-sm text-cove-coral">{block}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={!me || Boolean(block)}
                  onClick={() => {
                    if (!me) return;
                    const error = startCall(account.id, me, "ai");
                    if (!error) router.push("/call");
                  }}
                >
                  AI connect
                </Button>
                <Button
                  tone="ghost"
                  disabled={!me || Boolean(block)}
                  onClick={() => {
                    if (!me) return;
                    const error = startCall(account.id, me, "human");
                    if (!error) router.push("/call");
                  }}
                >
                  I take it
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
