"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import type { PortfolioAccount } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface SettlementCase {
  id: string;
  accountId: string;
  accountRef: string;
  offerCents: number;
  counterCents: number | null;
  status: string;
  ownerApprovedBy: string | null;
  complianceApprovedBy: string | null;
  holdUntil: string | null;
}

interface Preview {
  accountRef: string;
  state: string;
  balanceCents: number;
  openingCents: number;
  floorCents: number;
  blockedReason: string | null;
  needsCounselReview: boolean;
  needsDualApproval: boolean;
  dualThresholdCents: number;
  holdDays: number;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SettlementDeskPage() {
  const { workspaceId } = useActiveWorkspace();
  const [cases, setCases] = useState<SettlementCase[]>([]);
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [accountId, setAccountId] = useState("");
  const [counter, setCounter] = useState("25");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [list, snap] = await Promise.all([
      fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "settlement_list", workspaceId }) }).then((response) => response.json()) as Promise<{ cases?: SettlementCase[] }>,
      fetch(`/api/collections?workspace=${workspaceId}`).then((response) => response.ok ? response.json() : { accounts: [] }) as Promise<{ accounts?: PortfolioAccount[] }>,
    ]);
    setCases(list.cases ?? []);
    const rows = snap.accounts ?? [];
    setAccounts(rows);
    const fromQuery = new URLSearchParams(window.location.search).get("account");
    setAccountId((current) => current || fromQuery || rows[0]?.id || "");
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string; cases?: SettlementCase[]; reason?: string; preview?: Preview };
    if (body.preview) setPreview(body.preview);
    setNotice(body.error ?? body.reason ?? (body.preview ? null : "Recorded."));
    if (body.cases) setCases(body.cases);
    else if (!body.preview) await load();
  }

  return (
    <div>
      <CollectorChrome shortcuts={[{ key: "p", label: "Preview the selected account", run: () => void post({ op: "settlement_preview", accountId }) }]} />
      <PageHeader eyebrow="Settlement" title="Settlement desk" subtitle="Preview the matrix before a case is opened. Amounts at or above the threshold need two different people. The settling letter waits out the hold, then still stops if the template is unapproved or the gate blocks it. These offers are drafts for counsel." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2">
        <label className="grid gap-1">Account
          <select className="min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={(event) => { setAccountId(event.target.value); setPreview(null); }} aria-label="Account">
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.accountRef} · {account.state} · {money(account.balanceCents)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">Counter dollars
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={counter} onChange={(event) => setCounter(event.target.value)} aria-label="Counter dollars" />
        </label>
        <Button tone="soft" onClick={() => void post({ op: "settlement_preview", accountId })}>Preview</Button>
        <Button disabled={Boolean(preview?.blockedReason)} onClick={() => void post({ op: "settlement_open", accountId })}>Open from matrix</Button>
      </Card>
      {preview ? (
        <Card className="mb-4 p-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge tone={preview.blockedReason ? "warn" : "good"}>{preview.blockedReason ? "Offer blocked" : "Offer can open"}</Badge>
            <Badge tone="warn">Counsel review</Badge>
            {preview.needsDualApproval ? <Badge>Dual approval</Badge> : <Badge>One approval</Badge>}
          </div>
          <p className="mt-2">{preview.accountRef} · {preview.state} · balance {money(preview.balanceCents)}</p>
          <p>Opening {money(preview.openingCents)} · floor {money(preview.floorCents)} · dual approval at {money(preview.dualThresholdCents)} · hold {preview.holdDays} days</p>
          {preview.blockedReason ? <p className="mt-2">{preview.blockedReason}</p> : null}
        </Card>
      ) : null}
      <div className="grid gap-3">
        {cases.map((row) => (
          <Card key={row.id} className="p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="font-semibold">{row.accountRef || row.accountId}</span>
              <Badge>{row.status}</Badge>
              <span>Offer {money(row.offerCents)}{row.counterCents ? ` · counter ${money(row.counterCents)}` : ""}</span>
            </div>
            <p className="mt-2">Owner {row.ownerApprovedBy ?? "—"} · compliance {row.complianceApprovedBy ?? "—"} · hold until {row.holdUntil ?? "—"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button tone="soft" onClick={() => void post({ op: "settlement_counter", caseId: row.id, counterCents: Math.round(Number(counter) * 100) })}>Save counter</Button>
              <Button tone="soft" onClick={() => void post({ op: "settlement_approve", caseId: row.id })}>Approve</Button>
              <Button tone="soft" onClick={() => void post({ op: "settlement_release", caseId: row.id })}>Release letter</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
