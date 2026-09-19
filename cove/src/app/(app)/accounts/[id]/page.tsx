"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Field, Title } from "@/components/ui";
import { accountName, money, pct, when } from "@/lib/format";
import { outreachBlock } from "@/lib/compliance";
import { useCove } from "@/lib/store";
import { canOpenAccount, grantActive, minutesLeft } from "@/lib/staffing";
import { canDialState } from "@/lib/states";
import { payUrlFor, renderTemplate, templateBlocked } from "@/lib/templates";
import type { DocumentKind } from "@/lib/types";

const TONE: Record<string, "sand" | "teal" | "coral" | "sage"> = {
  call: "teal",
  sms: "teal",
  email: "sand",
  payment: "sage",
  skip: "sand",
  bot: "coral",
  note: "sand",
  system: "sand",
  portal: "sage",
  document: "sand",
  qa: "coral",
};

const DOC_LABEL: Record<DocumentKind, string> = {
  placement_file: "Placement file",
  bill_of_sale: "Bill of sale",
  statement: "Statement",
  validation_letter: "Validation letter",
  payment_receipt: "Receipt",
  dispute: "Dispute",
  call_recording: "Call recording",
  bankruptcy_notice: "Bankruptcy notice",
  death_certificate: "Death certificate",
  correspondence: "Correspondence",
};

const TABS = ["timeline", "documents", "contact", "templates"] as const;
type Tab = (typeof TABS)[number];

export default function DebtorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const accounts = useCove((state) => state.accounts);
  const plans = useCove((state) => state.plans);
  const payments = useCove((state) => state.payments);
  const timeline = useCove((state) => state.timeline);
  const agents = useCove((state) => state.agents);
  const grants = useCove((state) => state.grants);
  const reviews = useCove((state) => state.reviews);
  const templates = useCove((state) => state.templates);
  const queue = useCove((state) => state.queue);
  const currentAgentId = useCove((state) => state.currentAgentId);
  const addNote = useCove((state) => state.addNote);
  const takePayment = useCove((state) => state.takePayment);
  const startPlan = useCove((state) => state.startPlan);
  const startCall = useCove((state) => state.startCall);
  const sendMessage = useCove((state) => state.sendMessage);
  const skipTrace = useCove((state) => state.skipTrace);
  const sendTemplate = useCove((state) => state.sendTemplate);
  const sendPayLink = useCove((state) => state.sendPayLink);
  const addDocument = useCove((state) => state.addDocument);
  const sendValidation = useCove((state) => state.sendValidation);

  const [tab, setTab] = useState<Tab>("timeline");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("75");
  const [docName, setDocName] = useState("");
  const [docKind, setDocKind] = useState<DocumentKind>("correspondence");
  const [flash, setFlash] = useState<string | null>(null);

  const account = accounts.find((item) => item.id === params.id);
  if (!account) return <Title title="Account missing" />;

  const me = agents.find((agent) => agent.id === currentAgentId);
  const allowed = canOpenAccount(me, account.id, grants);
  if (me && !allowed) {
    const mine = grants.filter((grant) => grant.agentId === me.id && grantActive(grant));
    const soonest = mine[0];
    return (
      <div>
        <Title kicker="Access" title="Not on your lease" />
        <Card className="max-w-xl p-6 text-sm">
          <p className="text-cove-mute">
            {me.name}, this account is not in a lease assigned to you right now. Remote collectors only see the slice
            they were staffed on, for the window they were staffed for.
          </p>
          <p className="mt-3 text-cove-mute">
            You currently hold {mine.reduce((sum, grant) => sum + grant.accountIds.length, 0)} accounts
            {soonest ? ` for another ${minutesLeft(soonest)} minutes` : ""}.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/accounts">
              <Button tone="ghost">My accounts</Button>
            </Link>
            <Link href="/staffing">
              <Button>Request a lease</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const events = timeline.filter((event) => event.accountId === account.id);
  const accountPlans = plans.filter((plan) => plan.accountId === account.id);
  const accountPays = payments.filter((payment) => payment.accountId === account.id);
  const accountReviews = reviews.filter((review) => review.accountId === account.id);
  const queued = queue.filter((job) => job.accountId === account.id);
  const dialerId = currentAgentId ?? agents.find((agent) => agent.status === "available")?.id;
  const callBlock = outreachBlock(account, "call");
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  function run(result: string | null, ok: string) {
    setFlash(result ?? ok);
  }

  return (
    <div>
      <Title
        kicker={`${account.city}, ${account.state} · ${canDialState(account.state) ? "open state" : "gated"} · ${account.portfolio}`}
        title={accountName(account.firstName, account.lastName)}
        sub={`${account.product} from ${account.originalCreditor} ending ${account.last4} · disposition ${account.disposition.replace(/_/g, " ")}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!dialerId}
              onClick={() => {
                if (!dialerId) return;
                const error = startCall(account.id, dialerId, "human");
                if (!error) router.push("/call");
                else setFlash(error);
              }}
            >
              Call
            </Button>
            <Button tone="ghost" onClick={() => run(sendMessage(account.id, "sms"), "SMS sent.")}>
              SMS
            </Button>
            <Button tone="ghost" onClick={() => run(sendMessage(account.id, "email"), "Email sent.")}>
              Email
            </Button>
            <Button tone="sage" onClick={() => run(sendPayLink(account.id), "Pay link texted.")}>
              Text pay link
            </Button>
          </div>
        }
      />

      {flash ? (
        <Card className="mb-4 border-cove-coral/30 bg-cove-coralSoft p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span>{flash}</span>
            <button type="button" className="text-xs text-cove-mute" onClick={() => setFlash(null)}>
              dismiss
            </button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr_300px]">
        <div className="space-y-3">
          <Card className="p-4">
            <div className="text-xs text-cove-mute">Balance</div>
            <div className="font-serif text-4xl">{money(account.balance)}</div>
            <div className="text-sm text-cove-mute">
              Original {money(account.original)} · collected {money(account.collected)}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="teal">{account.status}</Badge>
              <Badge tone={account.disposition === "active" ? "sand" : "coral"}>
                {account.disposition.replace(/_/g, " ")}
              </Badge>
            </div>
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
            <div className="pt-1 font-mono text-xs text-cove-teal">{account.portalCode}</div>
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">Consent / flags</div>
            <div>
              Voice {account.consent.voice ? "yes" : "no"} · SMS {account.consent.sms ? "yes" : "no"}
            </div>
            <div>
              Email {account.consent.email ? "yes" : "no"} · Record {account.consent.recorded ? "yes" : "no"}
            </div>
            <div>Validation {account.validationSent ? "sent" : "needed"}</div>
            {account.dnc || account.cease || account.timeBarred ? (
              <div className="mt-2 text-cove-coral">
                {account.cease ? "CEASE " : ""}
                {account.dnc ? "DNC " : ""}
                {account.timeBarred ? "TIME-BARRED" : ""}
              </div>
            ) : null}
            {!account.validationSent ? (
              <Button
                tone="ghost"
                className="mt-3 w-full text-xs"
                onClick={() => run(sendValidation(account.id), "Validation mailed.")}
              >
                Mail validation now
              </Button>
            ) : null}
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">Outbound call queue</div>
            {callBlock ? (
              <p className="mt-1 text-cove-coral">{callBlock}</p>
            ) : (
              <p className="mt-1 text-cove-sage">Clear to dial.</p>
            )}
            <div className="mt-2 text-cove-mute">
              {queued[0] ? `${queued.length} job(s) queued · ${queued[0].status}` : "Not in the current queue."}
            </div>
            <Link href="/dialer">
              <Button tone="ghost" className="mt-2 w-full text-xs">
                Open dialer
              </Button>
            </Link>
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-4 flex gap-1 rounded-2xl bg-parchment-100 p-1">
            {TABS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={`min-h-10 flex-1 rounded-xl text-sm font-semibold capitalize transition ${
                  tab === item ? "bg-white text-cove-teal shadow-paper" : "text-cove-mute"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {tab === "timeline" ? (
            <>
              <div className="flex gap-2">
                <Field
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Add a note to the timeline…"
                />
                <Button
                  onClick={() => {
                    if (!note.trim()) return;
                    addNote(account.id, note, me?.name ?? "Cove");
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
                {events.length === 0 ? <p className="text-sm text-cove-mute">Nothing logged yet.</p> : null}
              </ol>
            </>
          ) : null}

          {tab === "documents" ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={docKind}
                  onChange={(event) => setDocKind(event.target.value as DocumentKind)}
                  className="min-h-11 rounded-2xl border border-parchment-200 bg-parchment-50 px-3 text-sm"
                >
                  {(Object.keys(DOC_LABEL) as DocumentKind[]).map((kind) => (
                    <option key={kind} value={kind}>
                      {DOC_LABEL[kind]}
                    </option>
                  ))}
                </select>
                <Field
                  value={docName}
                  onChange={(event) => setDocName(event.target.value)}
                  placeholder="Document name or reference"
                />
                <Button
                  onClick={() => {
                    if (!docName.trim()) return;
                    addDocument(account.id, docKind, docName.trim(), me?.name ?? "Cove");
                    setDocName("");
                  }}
                >
                  Add
                </Button>
              </div>

              <div className="mt-5 space-y-2">
                {account.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-parchment-200 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold">{doc.name}</div>
                      <div className="text-xs text-cove-sand">
                        {DOC_LABEL[doc.kind]} · {doc.source} · {when(doc.addedAt)} · {doc.sizeKb} KB
                      </div>
                    </div>
                    {doc.verified ? <Badge tone="sage">warranty media</Badge> : <Badge tone="sand">internal</Badge>}
                  </div>
                ))}
                {account.documents.length === 0 ? (
                  <p className="text-sm text-cove-mute">No media on file. This is a putback candidate.</p>
                ) : null}
              </div>

              {accountReviews.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-2 text-sm font-semibold">Call reviews</div>
                  {accountReviews.map((review) => (
                    <div key={review.id} className="mt-2 rounded-2xl border border-parchment-200 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{when(review.at)}</span>
                        <Badge tone={review.verdict === "fail" ? "coral" : review.verdict === "coach" ? "sand" : "sage"}>
                          {review.verdict} · {review.score}
                        </Badge>
                      </div>
                      {review.findings.map((finding, index) => (
                        <div key={index} className="mt-1 text-xs text-cove-mute">
                          {finding.severity}: {finding.rule}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          {tab === "contact" ? (
            <>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Numbers to call</div>
                <Button tone="ghost" className="min-h-8 text-xs" onClick={() => skipTrace(account.id)}>
                  Run skip trace
                </Button>
              </div>
              <div className="space-y-2">
                {account.phones.map((phone) => (
                  <div
                    key={phone.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-parchment-200 p-3 text-sm"
                  >
                    <div>
                      <div className="font-mono">{phone.number}</div>
                      <div className="text-xs text-cove-sand">
                        {phone.label} · {phone.status} · {phone.attempts} attempts
                      </div>
                    </div>
                    <Button
                      tone="ghost"
                      className="min-h-9 text-xs"
                      disabled={!dialerId || Boolean(callBlock)}
                      onClick={() => {
                        if (!dialerId) return;
                        const error = startCall(account.id, dialerId, "human");
                        if (!error) router.push("/call");
                        else setFlash(error);
                      }}
                    >
                      Dial
                    </Button>
                  </div>
                ))}
                {account.phones.length === 0 ? (
                  <p className="text-sm text-cove-mute">No numbers. Skip trace required before any outreach.</p>
                ) : null}
              </div>

              <div className="mt-6 text-sm font-semibold">Skip portal</div>
              <div className="mt-2 space-y-2">
                {account.skipHits.map((hit) => (
                  <div key={hit.id} className="rounded-2xl border border-parchment-200 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{hit.kind}</span>
                      <span className="text-xs text-cove-sand">{hit.confidence}% · {hit.source}</span>
                    </div>
                    <div className="mt-0.5">{hit.value}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-parchment-200">
                      <div
                        className={`h-1.5 rounded-full ${hit.confidence >= 65 ? "bg-cove-sage" : "bg-cove-sand"}`}
                        style={{ width: pct(hit.confidence / 100, 0) }}
                      />
                    </div>
                  </div>
                ))}
                {account.skipHits.length === 0 ? (
                  <p className="text-sm text-cove-mute">No skip hits yet.</p>
                ) : null}
              </div>

              <div className="mt-6 text-sm font-semibold">Social</div>
              {account.social.map((profile) => (
                <div key={profile.network} className="mt-2 text-sm">
                  <span className="capitalize">{profile.network}</span> · {profile.handle} · {profile.confidence}%
                  <div className="text-cove-mute">{profile.note}</div>
                </div>
              ))}
              {account.social.length === 0 ? (
                <p className="mt-2 text-sm text-cove-mute">
                  No social matches. Social is reference only — never a contact channel.
                </p>
              ) : null}
            </>
          ) : null}

          {tab === "templates" ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-parchment-100 p-3 text-sm">
                Consumer pay page:{" "}
                <span className="font-mono text-cove-teal">{payUrlFor(account, origin)}</span>
              </div>
              {templates.map((template) => {
                const gate = templateBlocked(template, account);
                const rendered = renderTemplate(template, account, origin);
                return (
                  <div key={template.id} className="rounded-2xl border border-parchment-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-semibold">{template.name}</span>
                        <Badge tone={template.channel === "sms" ? "teal" : template.channel === "email" ? "sand" : "sage"}>
                          {template.channel}
                        </Badge>
                      </div>
                      <Button
                        className="min-h-9 text-xs"
                        disabled={Boolean(gate)}
                        onClick={() => run(sendTemplate(account.id, template.id), `${template.name} sent.`)}
                      >
                        Send
                      </Button>
                    </div>
                    {rendered.subject ? (
                      <div className="mt-2 text-sm font-medium">{rendered.subject}</div>
                    ) : null}
                    <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-cove-mute">{rendered.body}</pre>
                    {gate ? <p className="mt-2 text-xs text-cove-coral">{gate}</p> : null}
                    <div className="mt-2 text-xs text-cove-sand">
                      Approved by {template.approvedBy} on {template.approvedAt}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <div className="font-semibold">Take payment</div>
            <div className="mt-2 flex gap-2">
              <Field value={amount} onChange={(event) => setAmount(event.target.value)} />
              <Button onClick={() => takePayment(account.id, Number(amount) || 0, "card", "4419", "agent")}>
                Card
              </Button>
            </div>
            <Button
              tone="ghost"
              className="mt-2 w-full"
              onClick={() => takePayment(account.id, Number(amount) || 0, "ach", "1182", "agent")}
            >
              ACH
            </Button>
            <Button
              tone="ghost"
              className="mt-2 w-full"
              onClick={() => startPlan(account.id, Number(amount) || 75, "biweekly")}
            >
              Open plan
            </Button>
            <div className="mt-2 text-xs text-cove-sand">Descriptor: TF RECOVERY</div>
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
                {money(payment.amount)} {payment.method} •{payment.last4}{" "}
                <span className="text-cove-sand">{payment.channel}</span>
              </div>
            ))}
            {accountPays.length === 0 ? <p className="text-cove-mute">No payments.</p> : null}
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">Notes from the floor</div>
            <p className="mt-1 text-cove-mute">{account.notes}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
