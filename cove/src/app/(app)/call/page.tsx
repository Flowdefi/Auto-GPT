"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, Field, Title } from "@/components/ui";
import { accountName, money } from "@/lib/format";
import { useCove } from "@/lib/store";

export default function LiveCallPage() {
  const liveCall = useCove((state) => state.liveCall);
  const accounts = useCove((state) => state.accounts);
  const agents = useCove((state) => state.agents);
  const plans = useCove((state) => state.plans);
  const appendTranscript = useCove((state) => state.appendTranscript);
  const hangup = useCove((state) => state.hangup);
  const transferToLive = useCove((state) => state.transferToLive);
  const takePayment = useCove((state) => state.takePayment);
  const [line, setLine] = useState("");
  const account = accounts.find((item) => item.id === liveCall?.accountId);
  const plan = plans.find((item) => item.accountId === account?.id && item.status === "active");
  const available = agents.filter((agent) => agent.status === "available");

  if (!liveCall || !account) {
    return (
      <div>
        <Title kicker="Softphone" title="No live call" sub="Start from the dialer. Inbound AI can also pop this screen." />
        <Link href="/dialer" className="text-cove-teal">
          Go to dialer
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Title
        kicker={`${liveCall.mode === "ai" ? "Voice agent" : "Live agent"} · STIR/SHAKEN ${liveCall.attested}`}
        title={accountName(account.firstName, account.lastName)}
        sub={`${account.city}, ${account.state} · ${account.product} · ${account.originalCreditor} ·••${account.last4}`}
        actions={
          <div className="flex gap-2">
            <Button tone="sage" onClick={() => takePayment(account.id, 75, "card", "4419")}>
              Take $75
            </Button>
            <Button tone="coral" onClick={() => hangup("RPC")}>
              Hang up
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Conversation</div>
            <Badge tone="teal">Recorded · consent {account.consent.recorded ? "yes" : "no"}</Badge>
          </div>
          <div className="space-y-2">
            {liveCall.transcript.map((row, index) => (
              <div
                key={index}
                className={row.who === "agent" ? "rounded-2xl bg-cove-tealSoft px-3 py-2 text-sm" : "rounded-2xl bg-parchment-100 px-3 py-2 text-sm"}
              >
                <span className="text-xs uppercase text-cove-mute">{row.who}</span>
                <div>{row.text}</div>
              </div>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!line.trim()) return;
              appendTranscript("agent", line);
              setLine("");
            }}
          >
            <Field value={line} onChange={(event) => setLine(event.target.value)} placeholder="Say something natural…" />
            <Button type="submit">Send</Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button tone="ghost" onClick={() => appendTranscript("consumer", "Friday is payday. Can I do seventy-five then?")}>
              Consumer: Friday payday
            </Button>
            <Button tone="ghost" onClick={() => hangup("no_contact")}>
              No contact
            </Button>
          </div>
        </Card>
        <div className="space-y-3">
          <Card className="p-4 text-sm">
            <div className="font-semibold">Debt snapshot</div>
            <div className="mt-2 text-2xl font-serif">{money(account.balance)}</div>
            <div>Original {money(account.original)}</div>
            <div>
              {account.address}, {account.city} {account.state}
            </div>
            <div className="mt-2">{account.notes}</div>
            {plan ? (
              <div className="mt-2">
                Plan {money(plan.installment)} {plan.cadence} · next {plan.nextDue}
              </div>
            ) : null}
            <Link href={`/accounts/${account.id}`} className="mt-3 inline-block text-cove-teal">
              Full CRM →
            </Link>
          </Card>
          <Card className="p-4">
            <div className="font-semibold">Warm transfer</div>
            <p className="mt-1 text-xs text-cove-mute">Pops the same CRM to a clocked-in available agent.</p>
            {available.map((agent) => (
              <Button key={agent.id} tone="ghost" className="mt-2 w-full" onClick={() => transferToLive(agent.id)}>
                Transfer to {agent.name}
              </Button>
            ))}
            {available.length === 0 ? <p className="mt-2 text-sm text-cove-mute">No available agents.</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
