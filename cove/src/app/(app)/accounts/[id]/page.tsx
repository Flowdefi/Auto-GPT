"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Field, Title } from "@/components/ui";
import { accountName, money, when } from "@/lib/format";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";

const TONE: Record<string, "sand" | "teal" | "coral" | "sage"> = {
  call: "teal",
  sms: "teal",
  email: "sand",
  payment: "sage",
  skip: "sand",
  bot: "coral",
  note: "sand",
  system: "sand",
};

export default function DebtorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const accounts = useCove((state) => state.accounts);
  const plans = useCove((state) => state.plans);
  const payments = useCove((state) => state.payments);
  const timeline = useCove((state) => state.timeline);
  const agents = useCove((state) => state.agents);
  const currentAgentId = useCove((state) => state.currentAgentId);
  const addNote = useCove((state) => state.addNote);
  const takePayment = useCove((state) => state.takePayment);
  const startPlan = useCove((state) => state.startPlan);
  const startCall = useCove((state) => state.startCall);
  const sendMessage = useCove((state) => state.sendMessage);
  const skipTrace = useCove((state) => state.skipTrace);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("75");
  const account = accounts.find((item) => item.id === params.id);
  if (!account) return <Title title="Account missing" />;
  const events = timeline.filter((event) => event.accountId === account.id);
  const accountPlans = plans.filter((plan) => plan.accountId === account.id);
  const accountPays = payments.filter((payment) => payment.accountId === account.id);
  const me = currentAgentId ?? agents.find((agent) => agent.status === "available")?.id;

  return (
    <div>
      <Title
        kicker={`${account.city}, ${account.state} · ${canDialState(account.state) ? "open state" : "gated"}`}
        title={accountName(account.firstName, account.lastName)}
        sub={`${account.product} from ${account.originalCreditor} ending ${account.last4} · ${account.portfolio}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!me}
              onClick={() => {
                if (!me) return;
                const error = startCall(account.id, me, "human");
                if (!error) router.push("/call");
              }}
            >
              Call
            </Button>
            <Button tone="ghost" onClick={() => sendMessage(account.id, "sms")}>
              SMS
            </Button>
            <Button tone="ghost" onClick={() => sendMessage(account.id, "email")}>
              Email
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_280px]">
        <div className="space-y-3">
          <Card className="p-4">
            <div className="text-xs text-cove-mute">Balance</div>
            <div className="font-serif text-4xl">{money(account.balance)}</div>
            <div className="text-sm text-cove-mute">Original {money(account.original)}</div>
            <Badge tone="teal">{account.status}</Badge>
          </Card>
          <Card className="space-y-1 p-4 text-sm">
            <div className="font-semibold">Consumer</div>
            <div>{account.phone}</div>
            <div>{account.email}</div>
            <div>
              {account.address}, {account.zip}
            </div>
            <div>TZ {account.timezone}</div>
            <div>Charge-off {account.chargeOff}</div>
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-semibold">Consent / flags</div>
            <div>Voice {account.consent.voice ? "yes" : "no"} · SMS {account.consent.sms ? "yes" : "no"}</div>
            <div>Email {account.consent.email ? "yes" : "no"} · Record {account.consent.recorded ? "yes" : "no"}</div>
            <div>Validation {account.validationSent ? "sent" : "needed"}</div>
            {account.dnc || account.cease || account.timeBarred ? (
              <div className="mt-2 text-cove-coral">
                {account.cease ? "CEASE " : ""}
                {account.dnc ? "DNC " : ""}
                {account.timeBarred ? "TIME-BARRED" : ""}
              </div>
            ) : null}
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 font-semibold">Activity</div>
          <div className="flex gap-2">
            <Field value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a note to the timeline…" />
            <Button
              onClick={() => {
                if (!note.trim()) return;
                addNote(account.id, note, agents.find((agent) => agent.id === currentAgentId)?.name ?? "Cove");
                setNote("");
              }}
            >
              Log
            </Button>
          </div>
          <ol className="mt-5 space-y-4">
            {events.map((event) => (
              <li key={event.id} className="border-l-2 border-parchment-200 pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={TONE[event.channel] ?? "sand"}>{event.channel}</Badge>
                  <span className="text-sm font-semibold">{event.title}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-cove-mute">{event.body}</p>
                <div className="mt-1 text-xs text-cove-sand">
                  {event.actor} · {when(event.at)}
                  {event.outcome ? ` · ${event.outcome}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="font-semibold">Take payment</div>
            <div className="mt-2 flex gap-2">
              <Field value={amount} onChange={(event) => setAmount(event.target.value)} />
              <Button onClick={() => takePayment(account.id, Number(amount) || 0, "card", "4419")}>Card</Button>
            </div>
            <Button tone="ghost" className="mt-2 w-full" onClick={() => takePayment(account.id, Number(amount) || 0, "ach", "1182")}>
              ACH
            </Button>
            <Button tone="ghost" className="mt-2 w-full" onClick={() => startPlan(account.id, Number(amount) || 75, "biweekly")}>
              Open plan
            </Button>
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-semibold">Payment plans</div>
            {accountPlans.length === 0 ? <p className="mt-2 text-cove-mute">None yet.</p> : null}
            {accountPlans.map((plan) => (
              <div key={plan.id} className="mt-2">
                {money(plan.installment)} {plan.cadence} · {plan.remaining} left · {plan.status}
              </div>
            ))}
            <div className="mt-3 font-semibold">Receipts</div>
            {accountPays.map((payment) => (
              <div key={payment.id}>
                {money(payment.amount)} {payment.method} •{payment.last4}
              </div>
            ))}
          </Card>
          <Card className="p-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Social / skip</div>
              <Button tone="ghost" className="min-h-8 text-xs" onClick={() => skipTrace(account.id)}>
                Skip
              </Button>
            </div>
            {account.social.map((profile) => (
              <div key={profile.network} className="mt-2">
                <span className="capitalize">{profile.network}</span> · {profile.handle} · {profile.confidence}%
                <div className="text-cove-mute">{profile.note}</div>
              </div>
            ))}
            {account.skipHits.map((hit) => (
              <div key={hit.id} className="mt-2">
                {hit.kind}: {hit.value} · {hit.confidence}%
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
