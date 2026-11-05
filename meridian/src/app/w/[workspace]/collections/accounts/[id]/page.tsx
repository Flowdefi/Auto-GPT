"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { PortfolioAccount } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface TimelineItem {
  at: string;
  kind: string;
  label: string;
  allowed: boolean;
}

export default function Account360Page() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useActiveWorkspace();
  const [account, setAccount] = useState<PortfolioAccount | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [templateId, setTemplateId] = useState("EML-001");
  const [channel, setChannel] = useState("email");
  const [dueOn, setDueOn] = useState("2026-12-01");
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ allowed: boolean; reason: string; citation: string; mode: string; attemptsIn7Days: number; liveWillDial: boolean } | null>(null);
  const [callId, setCallId] = useState<string | null>(null);
  const [disposition, setDisposition] = useState("no_answer");
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState("");

  async function refresh() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "account_360", workspaceId, accountId: params.id }),
    });
    const body = (await response.json()) as { error?: string; account?: PortfolioAccount; timeline?: TimelineItem[] };
    if (!response.ok || !body.account) {
      setNotice(body.error ?? "Account was not found");
      return;
    }
    setAccount(body.account);
    setTimeline(body.timeline ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, params.id]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, accountId: params.id, ...payload }),
    });
    const body = (await response.json()) as {
      error?: string;
      message?: { status?: string; reason?: string };
      allowed?: boolean;
      reason?: string;
      citation?: string;
      mode?: string;
      attemptsIn7Days?: number;
      liveWillDial?: boolean;
      id?: string;
      live?: { sandbox?: boolean; held?: string | null };
      say?: string;
    };
    if (payload.op === "dial_preview" && typeof body.allowed === "boolean") {
      setPreview({
        allowed: body.allowed,
        reason: body.reason ?? "",
        citation: body.citation ?? "",
        mode: body.mode ?? "sandbox",
        attemptsIn7Days: body.attemptsIn7Days ?? 0,
        liveWillDial: Boolean(body.liveWillDial),
      });
    }
    if (payload.op === "voice_start" && body.id) {
      setCallId(body.id);
      const mode = body.live?.held === "training" ? "Training seat. The sandbox walkthrough is open and the live adapter stayed off." : body.live?.sandbox === false ? "Live adapter accepted the call." : "Sandbox walkthrough. Nothing was dialed.";
      setNotice(body.error ?? `${mode} ${body.say ?? ""}`.trim());
    } else {
      setNotice(body.error ?? body.message?.reason ?? body.reason ?? "Recorded. The compliance gate still decides whether a message can leave.");
    }
    await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collector"
        title={account ? `${account.accountRef} · ${account.state}` : "Account"}
        subtitle="Every contact, payment, dispute, complaint, and compliance block on this account. One-click sends still stop at the gate."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {account?.promise ? <Card className="mb-4 p-4 text-sm">Promise {account.promise.status}: ${(account.promise.amountCents / 100).toFixed(2)} due {account.promise.dueOn}</Card> : null}
      <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2">
        <label className="grid gap-1">Channel
          <select className="min-h-11 rounded-xl border bg-transparent px-2" value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="Channel">
            <option value="email">email</option>
            <option value="sms">sms</option>
            <option value="letter">letter</option>
            <option value="voice_outbound">voice</option>
          </select>
        </label>
        <label className="grid gap-1">Template
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={templateId} onChange={(event) => setTemplateId(event.target.value)} aria-label="Template" />
        </label>
        <Button onClick={() => void post({ op: "channel", channel, templateId })}>Send from template</Button>
        <Button tone="soft" onClick={() => void post({ op: "dial_preview" })}>Check before dial</Button>
        <label className="grid gap-1">Promise date
          <input className="min-h-11 rounded-xl border bg-transparent px-3" type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} aria-label="Promise date" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button tone="soft" onClick={() => void post({ op: "promise_set", amountCents: 2500, dueOn })}>Promise $25</Button>
          <Button tone="soft" onClick={() => void post({ op: "promise_kept" })}>Mark kept</Button>
          <Button tone="soft" onClick={() => void post({ op: "skip_trace" })}>Skip-trace</Button>
        </div>
      </Card>
      {preview ? (
        <Card className="mb-4 p-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge tone={preview.allowed ? "good" : "warn"}>{preview.allowed ? "Gate allows the call" : "Gate blocks the call"}</Badge>
            <Badge>{preview.mode === "live" && preview.liveWillDial ? "Live adapter" : "Sandbox walkthrough"}</Badge>
          </div>
          <p className="mt-2">{preview.reason}</p>
          <p className="mt-1 text-muted-foreground">{preview.citation}</p>
          <p className="mt-1">{preview.attemptsIn7Days} telephone attempts already counted in seven days.</p>
          <Button className="mt-3" disabled={!preview.allowed} onClick={() => void post({ op: "voice_start", direction: "outbound" })}>Connect</Button>
        </Card>
      ) : null}
      {callId ? (
        <Card className="mb-4 grid gap-3 p-4 text-sm">
          <p>After-call work for this attempt. Notes stay encrypted on the call.</p>
          <label className="grid gap-1">Disposition
            <select className="min-h-11 rounded-xl border bg-transparent px-2" value={disposition} onChange={(event) => setDisposition(event.target.value)} aria-label="Disposition">
              {["connected", "no_answer", "busy", "wrong_party", "promise", "callback", "dispute", "cease", "refused"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-1">Notes
            <input className="min-h-11 rounded-xl border bg-transparent px-3" value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Call notes" />
          </label>
          <label className="grid gap-1">Callback date
            <input className="min-h-11 rounded-xl border bg-transparent px-3" type="date" value={callbackAt} onChange={(event) => setCallbackAt(event.target.value)} aria-label="Callback date" />
          </label>
          <Button onClick={() => void post({ op: "call_wrap", callId, disposition, notes, callbackAt, amountCents: disposition === "promise" ? 2500 : undefined, promiseDue: disposition === "promise" ? dueOn : undefined })}>Save wrap-up</Button>
        </Card>
      ) : null}
      <ol className="grid gap-2">
        {timeline.map((item, index) => (
          <li key={`${item.at}-${index}`}>
            <Card className="p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{item.kind}</Badge>
                <Badge tone={item.allowed ? "good" : "warn"}>{item.allowed ? "allowed" : "blocked or noted"}</Badge>
                <span className="text-muted-foreground">{item.at.slice(0, 16).replace("T", " ")}</span>
              </div>
              <p className="mt-2">{item.label}</p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
