"use client";

import { useEffect, useState } from "react";
import { Button, Card, PageHeader } from "@/components/meridian/legacy";
import { collectionReportCsv } from "@/lib/collections/report-csv";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Report {
  portfolios: Array<{ portfolioId: string; accounts: number; quarantined: number; faceCents: number; collectedCents: number; recoveryRate: number }>;
  disputes: Array<{ accountRef: string; state: string; deadline: string | null }>;
  exceptions: Array<{ id: string; channel: string; reason: string }>;
  attempts: Array<{ id: string; channel: string; allowed: boolean; reason: string; at: string }>;
  remittance?: Array<{ portfolioId: string; clientName: string; collectedCents: number; feeCents: number; remittanceCents: number; paymentCount: number }>;
  collectors?: Array<{ name: string; tasksCompleted: number; calls: number; paymentsPosted: number }>;
  label?: string;
  needsCounselReview?: boolean;
}

function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CollectionReportsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [report, setReport] = useState<Report | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "report", workspaceId }),
    }).then(async (response) => {
      if (!response.ok) {
        setNotice("Sign in with a seat to view reports.");
        return;
      }
      setReport((await response.json()) as Report);
    });
  }, [workspaceId]);

  function download() {
    if (!report) return;
    const blob = new Blob([collectionReportCsv(report)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "collection-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader eyebrow="Collections" title="Reports" subtitle="Recovery, client remittance, collector activity, disputes, and blocked attempts. This is a draft operations report, not a client invoice. Counsel should confirm the fee percent. Statements omit account numbers." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {report ? (
        <div className="grid gap-4">
          <Button onClick={download}>Download CSV</Button>
          {report.portfolios.map((row) => (
            <Card key={row.portfolioId} className="p-4 text-sm">
              <div className="font-semibold">{row.portfolioId}</div>
              <p>{row.accounts} accounts, {row.quarantined} quarantined or returned</p>
              <p>Face {money(row.faceCents)} · collected {money(row.collectedCents)} · recovery {(row.recoveryRate * 100).toFixed(1)}%</p>
            </Card>
          ))}
          <Card className="p-4 text-sm">
            <div className="font-semibold">Client remittance statement</div>
            <p className="text-muted-foreground">{report.label ?? "Draft operations report. Not a client invoice. Counsel should confirm the fee percent."} Agency fee percent comes from MERIDIAN_AGENCY_FEE_PERCENT and defaults to 0.</p>
            {(report.remittance ?? []).map((row) => (
              <p key={row.portfolioId}>{row.clientName || row.portfolioId}: collected {money(row.collectedCents)} · fee {money(row.feeCents)} · remit {money(row.remittanceCents)} · {row.paymentCount} payments</p>
            ))}
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-semibold">Collector performance</div>
            {(report.collectors ?? []).map((row) => (
              <p key={row.name}>{row.name}: {row.tasksCompleted} tasks closed · {row.calls} sandbox calls · {row.paymentsPosted} payments posted</p>
            ))}
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-semibold">Disputes</div>
            {report.disputes.length === 0 ? <p>None open.</p> : report.disputes.map((row) => <p key={row.accountRef}>{row.accountRef} · {row.state} · deadline {row.deadline ?? "n/a"}</p>)}
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-semibold">Blocked attempts</div>
            {report.exceptions.slice(0, 8).map((row) => <p key={row.id}>{row.channel}: {row.reason}</p>)}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
