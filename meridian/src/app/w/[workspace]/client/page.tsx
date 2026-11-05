"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ClientRow {
  sellerName: string;
  accounts: number;
  workable: number;
  quarantined: number;
  returned: number;
  faceCents: number;
  collectedCents: number;
  portfolios: string[];
}

export default function ClientPortalPage() {
  const { workspaceId } = useActiveWorkspace();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [seller, setSeller] = useState<string | null>(null);
  const [csv, setCsv] = useState("account_ref,consumer_name,consumer_state,zip,last4,balance\nCL-1,Example Client,OH,44101,3333,40.00\n");
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "client_home", workspaceId }),
    });
    const body = (await response.json()) as { error?: string; clients?: ClientRow[]; seller?: string | null };
    if (!response.ok) {
      setNotice(body.error ?? "Sign in to open the client portal.");
      return;
    }
    setRows(body.clients ?? []);
    setSeller(body.seller ?? null);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function place() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "client_place", workspaceId, csv }),
    });
    const body = (await response.json()) as { error?: string; created?: number; quarantined?: number };
    setNotice(body.error ?? `Placed ${body.created ?? 0}. Quarantined ${body.quarantined ?? 0}.`);
    await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Clients"
        title="Client portal"
        subtitle={seller ? `You are signed in for ${seller}. Other sellers are hidden.` : "An admin sees every seller. A client login sees only the seller it is bound to."}
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.sellerName} className="p-4 text-sm">
            <div className="font-semibold">{row.sellerName}</div>
            <p>{row.accounts} accounts · {row.workable} workable · {row.quarantined} quarantined · {row.returned} recalled</p>
            <p>Face ${(row.faceCents / 100).toFixed(2)} · recovered ${(row.collectedCents / 100).toFixed(2)}</p>
            <p className="text-muted-foreground">Portfolios {row.portfolios.join(", ") || "none"}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-4 space-y-3 p-4 text-sm">
        <h2 className="font-semibold">Place accounts</h2>
        <p>A client can place only its own seller. Rows that name another seller are rejected.</p>
        <label className="grid gap-1" htmlFor="client-csv">Placement file
          <textarea id="client-csv" className="min-h-28 rounded-xl border bg-transparent p-3" value={csv} onChange={(event) => setCsv(event.target.value)} />
        </label>
        <Button onClick={() => void place()}>Place</Button>
      </Card>
    </div>
  );
}
