"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { Complaint } from "@/lib/collections/complaints";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Report {
  total: number;
  open: number;
  overdue: number;
  cfpb: number;
  byCause: Record<string, number>;
  citation: string;
  rows: Complaint[];
}

export default function ComplaintsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [report, setReport] = useState<Report | null>(null);
  const [summary, setSummary] = useState("The consumer wrote that the validation notice was not clear.");
  const [cfpbId, setCfpbId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "complaint_report", workspaceId }),
    });
    if (!response.ok) return;
    setReport((await response.json()) as Report);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function file() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "complaint_file", workspaceId, summary, cfpbId, complaintChannel: cfpbId ? "cfpb" : "phone", rootCause: "validation", accountRef: "DEMO-1" }),
    });
    const body = (await response.json()) as { error?: string };
    setNotice(body.error ?? "Complaint opened. The response date is operational and needs counsel review.");
    await refresh();
  }

  return (
    <div>
      <CollectorChrome shortcuts={[]} />
      <PageHeader
        eyebrow="Compliance"
        title="Complaints"
        subtitle="Intake from the public site, the portal, phone, letter, or the CFPB. The 15-day date follows the CFPB company portal instruction and is marked for counsel."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {report ? (
        <Card className="mb-4 p-4 text-sm">
          <p>{report.total} complaints · {report.open} open · {report.overdue} past the response date · {report.cfpb} tied to the CFPB</p>
          <p className="mt-2">{Object.entries(report.byCause).map(([cause, count]) => `${cause} ${count}`).join(" · ") || "No root-cause tags yet."}</p>
          <p className="mt-2 text-muted-foreground">{report.citation}</p>
        </Card>
      ) : null}
      <Card className="mb-4 space-y-3 p-4 text-sm">
        <label className="grid gap-1" htmlFor="complaint-summary">Summary
          <textarea id="complaint-summary" className="min-h-24 rounded-xl border bg-transparent p-3" value={summary} onChange={(event) => setSummary(event.target.value)} />
        </label>
        <label className="grid gap-1" htmlFor="cfpb-id">CFPB complaint id, if any
          <input id="cfpb-id" className="min-h-11 rounded-xl border bg-transparent px-3" value={cfpbId} onChange={(event) => setCfpbId(event.target.value)} />
        </label>
        <Button onClick={() => void file()}>Open complaint</Button>
      </Card>
      <div className="grid gap-3">
        {(report?.rows ?? []).map((row) => (
          <Card key={row.id} className="p-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge>{row.channel}</Badge>
              <Badge>{row.rootCause}</Badge>
              <Badge tone={row.status === "open" ? "warn" : "good"}>{row.status}</Badge>
            </div>
            <p className="mt-2">{row.summary}</p>
            <p className="text-muted-foreground">Due {row.responseDueAt.slice(0, 10)}{row.cfpbId ? ` · CFPB ${row.cfpbId}` : ""}{row.accountRef ? ` · ${row.accountRef}` : ""}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
