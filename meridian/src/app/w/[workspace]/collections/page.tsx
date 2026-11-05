"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { CallTranscript, PortfolioAccount, VoiceCall, VoiceSettings } from "@/lib/collections/types";

type ColumnMap = Record<string, string>;
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
  const [mappingText, setMappingText] = useState("");
  const [xlsxBase64, setXlsxBase64] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [live, setLive] = useState<LiveCall | null>(null);
  const [accountId, setAccountId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [partyLast4, setPartyLast4] = useState("");
  const [partyZip, setPartyZip] = useState("");
  const [consumerLine, setConsumerLine] = useState("");

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

  async function readPortfolioFile(file: File) {
    if (file.name.toLowerCase().endsWith(".xlsx")) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      setXlsxBase64(btoa(binary));
      setCsv("");
      setNotice(`Ready to import ${file.name}. The first sheet is read. The file stays in the browser until you import.`);
      return;
    }
    setXlsxBase64(null);
    setCsv(await file.text());
    setNotice(`Ready to import ${file.name}.`);
  }

  function columnMap(): ColumnMap | undefined {
    const trimmed = mappingText.trim();
    if (!trimmed) return undefined;
    const parsed = JSON.parse(trimmed) as ColumnMap;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Column map must be a JSON object");
    }
    return parsed;
  }

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
            <p>{data.accounts.filter((item) => item.status === "quarantined" || item.status === "returned").length} accounts are quarantined or returned and are not worked.</p>
          </Card>
          <Card className="space-y-3 p-5 text-sm">
            <div className="font-semibold">Sandbox voice call</div>
            <p className="text-muted-foreground">No audio leaves this server. Outbound dials only after the gate allows them. Cell calls need recorded consent and a reassigned-number result.</p>
            {live ? (
              <>
                <p>{live.blockedReason ? <Badge tone="bad">Blocked</Badge> : <Badge>{live.phase}</Badge>} {live.direction} · {live.say}</p>
                <ul className="grid gap-1 text-xs">
                  <li>AI disclosure: {live.transcript?.aiDisclosed ? "said" : "missing"}</li>
                  <li>Recording notice: {live.transcript?.recordingAnnounced ? "said" : "missing"}</li>
                  <li>Recording consent: {live.transcript?.recordingConsent === null ? "waiting" : live.transcript?.recordingConsent ? "yes" : "no"}</li>
                  <li>Right party: {live.transcript?.verified ? "verified" : "not verified"}</li>
                  <li>Mini-Miranda: {live.transcript?.debtDisclosed ? "given after verification" : "withheld"}</li>
                </ul>
                <div className="max-h-64 space-y-2 overflow-auto rounded-xl bg-muted p-3">
                  {live.transcript?.turns.map((turn, index) => (
                    <p key={`${turn.at}-${index}`}>
                      <span className="font-medium">{turn.role}: </span>
                      {turn.text}
                    </p>
                  ))}
                </div>
                {live.qaFlags?.length ? <p>QA: {live.qaFlags.map((flag) => flag.code).join(", ")}</p> : null}
                {live.phase === "greeting" ? (
                  <div className="flex gap-2">
                    <Button onClick={() => void post({ op: "voice_turn", callId: live.id, turn: { type: "consent", accepted: true } }).then((body) => body && "id" in body && setLive(body))}>Consent to recording</Button>
                    <Button tone="soft" onClick={() => void post({ op: "voice_turn", callId: live.id, turn: { type: "consent", accepted: false } }).then((body) => body && "id" in body && setLive(body))}>Decline</Button>
                  </div>
                ) : null}
                {live.phase === "identify" ? (
                  <div className="grid gap-2">
                    <input className="min-h-11 rounded-xl border bg-transparent px-3" placeholder="Name on the account" value={partyName} onChange={(event) => setPartyName(event.target.value)} aria-label="Name on the account" />
                    <input className="min-h-11 rounded-xl border bg-transparent px-3" placeholder="Last four" value={partyLast4} onChange={(event) => setPartyLast4(event.target.value)} aria-label="Last four" />
                    <input className="min-h-11 rounded-xl border bg-transparent px-3" placeholder="ZIP" value={partyZip} onChange={(event) => setPartyZip(event.target.value)} aria-label="ZIP" />
                    <Button
                      onClick={() =>
                        void post({
                          op: "voice_turn",
                          callId: live.id,
                          turn: { type: "verify", name: partyName, checks: [{ kind: "last4", value: partyLast4 }, { kind: "zip", value: partyZip }] },
                        }).then((body) => {
                          if (body && "id" in body) setLive(body);
                        })
                      }
                    >
                      Verify right party
                    </Button>
                  </div>
                ) : null}
                {live.phase === "assist" || live.phase === "payment" ? (
                  <div className="grid gap-2">
                    <textarea className="min-h-20 rounded-xl border bg-transparent p-3" placeholder="What the consumer says" value={consumerLine} onChange={(event) => setConsumerLine(event.target.value)} aria-label="Consumer reply" />
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => void post({ op: "voice_turn", callId: live.id, turn: { type: "say", text: consumerLine || "I want to pay" } }).then((body) => body && "id" in body && setLive(body))}>Send reply</Button>
                      <Button tone="soft" onClick={() => void post({ op: "voice_turn", callId: live.id, turn: { type: "transfer" } }).then((body) => body && "id" in body && setLive(body))}>Warm transfer</Button>
                    </div>
                  </div>
                ) : null}
                {live.paymentUrl ? (
                  <p>
                    Hosted payment page:{" "}
                    <a className="underline" href={live.paymentUrl}>
                      {live.paymentUrl}
                    </a>
                  </p>
                ) : null}
                {live.transferred ? <p>Warm transfer opened a collector task. No card number was taken.</p> : null}
              </>
            ) : (
              <p>Start a sandbox inbound or outbound call. A blocked outbound attempt is stored with the gate reason.</p>
            )}
          </Card>
          <Card className="space-y-3 p-5 text-sm lg:col-span-2">
            <div className="font-semibold">Portfolio import</div>
            <p>Paste a CSV, or choose a CSV or xlsx. Files are not written into the repository. Use fake 900-range SSNs only in this public repo.</p>
            <input
              className="block text-sm"
              type="file"
              accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readPortfolioFile(file);
              }}
            />
            <textarea className="min-h-28 w-full rounded-xl border bg-transparent p-3" value={csv} onChange={(event) => { setXlsxBase64(null); setCsv(event.target.value); }} aria-label="Portfolio CSV" />
            <label className="grid gap-1">
              Column map
              <textarea
                className="min-h-16 w-full rounded-xl border bg-transparent p-3"
                placeholder='{"consumer_state":"State","ssn":"Social"}'
                value={mappingText}
                onChange={(event) => setMappingText(event.target.value)}
                aria-label="Column map"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => {
                try {
                  void post({ op: "import", csv: xlsxBase64 ? undefined : csv, xlsxBase64: xlsxBase64 ?? undefined, mapping: columnMap(), portfolioId: "pf_upload" }).then((body) => setNotice(`Imported ${body.workable ?? 0} workable, ${body.quarantined ?? 0} quarantined.`));
                } catch (error) {
                  setNotice(error instanceof Error ? error.message : "Column map is not valid JSON");
                }
              }}>
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
