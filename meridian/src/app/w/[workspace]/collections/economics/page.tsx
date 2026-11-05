"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Row {
  portfolioId: string;
  sellerName: string;
  costCents: number;
  faceCents: number;
  collectedCents: number;
  cashOnCash: number | null;
  irrAnnual: number | null;
  closedAt: string | null;
  label: string;
}

interface Seller {
  sellerName: string;
  accounts: number;
  collectedCents: number;
  costCents: number;
  cashOnCash: number | null;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function EconomicsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [rows, setRows] = useState<Row[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [portfolioId, setPortfolioId] = useState("");
  const [cost, setCost] = useState("1000");
  const [seller, setSeller] = useState("Example Seller");
  const [statement, setStatement] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "economics", workspaceId }),
    });
    const body = (await response.json()) as { rows?: Row[]; sellers?: Seller[] };
    setRows(body.rows ?? []);
    setSellers(body.sellers ?? []);
    if (!portfolioId && body.rows?.[0]) setPortfolioId(body.rows[0].portfolioId);
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
    const body = (await response.json()) as { error?: string; statement?: { remittanceCents: number; label: string } };
    setStatement(body.error ?? (body.statement ? `Final remittance ${money(body.statement.remittanceCents)}. ${body.statement.label}` : "Saved."));
    await load();
  }

  const label = rows[0]?.label ?? "Model estimate. Not a forecast and not financial, legal, or investment advice.";

  return (
    <div>
      <CollectorChrome shortcuts={[{ key: "r", label: "Reload economics", run: () => void load() }]} />
      <PageHeader eyebrow="Portfolio" title="Portfolio economics" subtitle={label} />
      {statement ? <Card className="mb-4 p-4 text-sm">{statement}</Card> : null}
      <Card className="mb-4 grid gap-3 p-4 text-sm sm:grid-cols-3">
        <label className="grid gap-1">Portfolio
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={portfolioId} onChange={(event) => setPortfolioId(event.target.value)} aria-label="Portfolio id" />
        </label>
        <label className="grid gap-1">Purchase or placement cost (dollars)
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={cost} onChange={(event) => setCost(event.target.value)} aria-label="Cost in dollars" />
        </label>
        <label className="grid gap-1">Seller
          <input className="min-h-11 rounded-xl border bg-transparent px-3" value={seller} onChange={(event) => setSeller(event.target.value)} aria-label="Seller name" />
        </label>
        <Button onClick={() => void post({ op: "cost_save", portfolioId, sellerName: seller, costCents: Math.round(Number(cost) * 100) })}>Save cost</Button>
        <Button tone="soft" onClick={() => void post({ op: "portfolio_close", portfolioId })}>Close and issue final statement</Button>
      </Card>
      <div className="mb-4 grid gap-3">
        {rows.map((row) => (
          <Card key={row.portfolioId} className="p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <span className="font-semibold">{row.portfolioId}</span>
              <Badge>{row.sellerName || "Seller not set"}</Badge>
              {row.closedAt ? <Badge tone="warn">Closed</Badge> : null}
            </div>
            <p className="mt-2">Face {money(row.faceCents)} · cost {money(row.costCents)} · collected {money(row.collectedCents)}</p>
            <p>Cash-on-cash {row.cashOnCash === null ? "—" : row.cashOnCash} · model IRR {row.irrAnnual === null ? "—" : `${(row.irrAnnual * 100).toFixed(1)}%`}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4 text-sm">
        <div className="font-semibold">Seller scorecard</div>
        {sellers.map((item) => (
          <p key={item.sellerName} className="mt-2">{item.sellerName}: {item.accounts} accounts · collected {money(item.collectedCents)} · cash-on-cash {item.cashOnCash === null ? "—" : item.cashOnCash}</p>
        ))}
      </Card>
    </div>
  );
}
