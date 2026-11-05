"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface SettlementCase {
  id: string;
  accountId: string;
  offerCents: number;
  counterCents: number | null;
  status: string;
  ownerApprovedBy: string | null;
  complianceApprovedBy: string | null;
  holdUntil: string | null;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function SettlementDeskPage() {
  const { workspaceId } = useActiveWorkspace();
  const [cases, setCases] = useState<SettlementCase[]>([]);
  const [accountId, setAccountId] = useState("");
  const [counter, setCounter] = useState("25");
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "settlement_list", workspaceId }),
    });
    const body = (await response.json()) as { cases?: SettlementCase[]; error?: string };
    setCases(body.cases ?? []);
    setNotice(body.error ?? null);
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
    const body = (await response.json()) as { error?: string; cases?: SettlementCase[]; reason?: string };
    setNotice(body.error ?? body.reason ?? "Recorded.");
    if (body.cases) setCases(body.cases);
    else await load();
  }

  return (
    <div>
      <CollectorChrome shortcuts={[]} />
      <PageHeader eyebrow="Settlement" title="Settlement desk" subtitle="Counters stay on the account. Amounts at or above the dual-approval threshold need two different people. The settling letter waits out the hold and still stops at template approval and the compliance gate." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-2">
        <label className="grid gap-1">Account id
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Account id" />
        </label>
        <label className="grid gap-1">Counter dollars
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={counter} onChange={(event) => setCounter(event.target.value)} aria-label="Counter dollars" />
        </label>
        <Button onClick={() => void post({ op: "settlement_open", accountId })}>Open from matrix</Button>
      </Card>
      <div className="grid gap-3">
        {cases.map((row) => (
          <Card key={row.id} className="p-4 text-sm">
            <div className="flex flex-wrap gap-2">
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
