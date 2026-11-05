"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { CallTranscript, PortfolioAccount, VoiceCall, VoiceSettings } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Snapshot {
  settings: VoiceSettings;
  accounts: PortfolioAccount[];
  calls: VoiceCall[];
  templates: Array<{ id: string; name: string; channel: string; counselReviewed: boolean }>;
  events: Array<{ id: string; channel: string; allowed: boolean; reason: string }>;
}

interface LiveCall extends VoiceCall {
  say?: string;
  transcript?: CallTranscript;
  paymentUrl?: string | null;
}

export default function CollectionsDeskPage() {
  const { workspaceId } = useActiveWorkspace();
  const [data, setData] = useState<Snapshot | null>(null);
  const [csv, setCsv] = useState(
    "account_ref,consumer_name,consumer_state,zip,last4,portal_code,phone_type,seller,balance\nDEMO-OH-1,Example Ohioan,OH,44101,3333,OH33,landline,Sample Seller,80",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [live, setLive] = useState<LiveCall | null>(null);
  const [accountId, setAccountId] = useState("");

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) {
      setNotice("Sign in with a seat to use the collections desk.");
      return;
    }
    const body = (await response.json()) as Snapshot;
    setData(body);
    if (!accountId && body.accounts[0]) setAccountId(body.accounts[0].id);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function post(payload: Record<string, unknown>) {
    setNotice(null);
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string } & LiveCall & { workable?: number; quarantined?: number; returned?: number; message?: { status: string; reason: string | null } };
    if (!response.ok) {
      setNotice(body.error ?? "Request failed");
      return body;
    }
    await refresh();
    return body;
  }

  const account = data?.accounts.find((item) => item.id === accountId);

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Voice and channels"
        subtitle="Sandbox only. Outbound AI voice, SMS, email, letters, and voicemail drops stop at the compliance gate. No card numbers are taken on the call."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3 p-5 text-sm">
            <div className="font-semibold">Controls</div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.settings.killSwitch}
                onChange={(event) => void post({ op: "settings", killSwitch: event.target.checked })}
              />
              Outbound kill switch
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.settings.rndSandboxClear}
                onChange={(event) => void post({ op: "settings", rndSandboxClear: event.target.checked })}
              />
              Sandbox reassigned-number clear (not the FCC database)
            </label>
            <p>Daily cap {data.settings.dailyOutboundCap}. Settlement authority {data.settings.maxDiscountPercent}% / {data.settings.maxPlanMonths} months.</p>
            <label className="grid gap-1">
              Account
              <select className="min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
                {data.accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.consumerName} · {item.state} · {item.status}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <Button tone="soft" onClick={() => void post({ op: "consent", accountId, channel: "voice_cell", source: "sandbox written consent" })}>
                Record cell consent
              </Button>
              <Button
                onClick={() =>
                  void post({ op: "voice_start", direction: "outbound", accountId }).then((body) => {
                    if (body && "id" in body) setLive(body);
                  })
                }
              >
                Outbound AI call
              </Button>
              <Button
                tone="soft"
                onClick={() =>
                  void post({ op: "voice_start", direction: "inbound", accountId }).then((body) => {
                    if (body && "id" in body) setLive(body);
                  })
                }
              >
                Inbound AI call
              </Button>
            </div>
            {account ? (
              <p>
                {account.status === "quarantined" ? <Badge tone="bad">Quarantined</Badge> : <Badge tone="good">{account.status}</Badge>}{" "}
                {account.quarantineReason}
              </p>
            ) : null}
          </Card>
          <Card className="space-y-3 p-5 text-sm">
            <div className="font-semibold">Call</div>
            {live ? (
              <>
                <p>{live.blockedReason ? <Badge tone="bad">Blocked</Badge> : <Badge>{live.phase}</Badge>} {live.say}</p>
                <div className="max-h-64 space-y-2 overflow-auto">
                  {live.transcript?.turns.map((turn, index) => (
                    <p key={`${turn.at}-${index}`}>
                      <span className="font-medium">{turn.role}: </span>
                      {turn.text}
                    </p>
                  ))}
                </div>
                {live.qaFlags?.length ? <p>QA: {live.qaFlags.map((flag) => flag.code).join(", ")}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    tone="soft"
                    onClick={() =>
                      void post({
                        op: "voice_turn",
                        callId: live.id,
                        turn: { type: "verify", name: account?.consumerName ?? "", checks: [{ kind: "last4", value: account?.last4 ?? "" }, { kind: "zip", value: account?.zip ?? "" }] },
                      }).then((body) => {
                        if (body && "id" in body) setLive(body);
                      })
                    }
                  >
                    Verify right party
                  </Button>
                  <Button tone="soft" onClick={() => void post({ op: "voice_turn", callId: live.id, turn: { type: "transfer" } }).then((body) => body && "id" in body && setLive(body))}>
                    Transfer to person
                  </Button>
                  <Button tone="soft" onClick={() => void post({ op: "voice_turn", callId: live.id, turn: { type: "say", text: "Please stop calling" } }).then((body) => body && "id" in body && setLive(body))}>
                    Cease
                  </Button>
                </div>
              </>
            ) : (
              <p>Start a sandbox call. The gate result is stored even when the call is blocked.</p>
            )}
          </Card>
          <Card className="space-y-3 p-5 text-sm lg:col-span-2">
            <div className="font-semibold">Portfolio import</div>
            <textarea className="min-h-28 w-full rounded-xl border bg-transparent p-3" value={csv} onChange={(event) => setCsv(event.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => void post({ op: "import", csv, portfolioId: "pf_upload" }).then((body) => setNotice(`Imported ${body.workable ?? 0} workable, ${body.quarantined ?? 0} quarantined.`))}>
                Import
              </Button>
              <Button tone="soft" onClick={() => void post({ op: "return", portfolioId: "pf_upload" }).then((body) => setNotice(`Returned ${body.returned ?? 0} quarantined accounts.`))}>
                Return quarantined
              </Button>
              <Button tone="soft" onClick={() => void post({ op: "channel", accountId, channel: "letter", body: "Counsel-reviewed letter body is required before a real drop." })}>
                Sandbox letter
              </Button>
              <Button tone="soft" onClick={() => void post({ op: "templates" })}>
                Sync templates
              </Button>
            </div>
            <p>{data.templates.length} templates loaded. {data.events[0] ? `Latest gate: ${data.events[0].channel} ${data.events[0].allowed ? "allowed" : "blocked"} — ${data.events[0].reason}` : "No gate events yet."}</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
