"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { when } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface LeadDetail {
  id: string;
  status: string;
  side: string;
  score: number;
  fitScore: number;
  intentScore: number;
  band: string;
  source: string;
  ownerId?: string;
  assignmentRule?: string;
  slaBreached: boolean;
  slaDueAt?: string;
  notes: string;
  payload: Record<string, string>;
  contactName: string;
  contactEmail: string;
  companyName: string;
  companyId: string;
  enriched: boolean;
}

const STATUSES = ["new", "working", "mql", "routed", "accepted", "sql", "nurture", "rejected", "converted"];

export default function LeadRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useActiveWorkspace();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [runs, setRuns] = useState<Array<{ id: string; event: string; at: string; subjectId: string; results: Array<{ action: string; detail: string }> }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const response = await fetch(`/api/leads?workspace=${workspaceId}`);
    const payload = await response.json();
    setLead((payload.leads ?? []).find((row: LeadDetail) => row.id === params.id) ?? null);
    setRuns((payload.runs ?? []).filter((run: { subjectId: string }) => run.subjectId === params.id));
    setUsers(payload.users ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, workspaceId]);

  async function move(status: string) {
    setBusy(true);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, leadId: params.id, status }),
    });
    setBusy(false);
    await refresh();
  }

  async function enrich() {
    setBusy(true);
    const response = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, leadId: params.id, enrich: true }),
    });
    const payload = await response.json();
    setBusy(false);
    setNotice(payload.ok ? `Enriched ${payload.result?.domain ?? "company"}` : payload.error ?? "Enrichment failed");
    await refresh();
  }

  if (!lead) {
    return <PageHeader title="Lead" subtitle="Loading the server record…" />;
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${lead.side} · ${lead.source}`}
        title={lead.companyName || lead.contactName}
        subtitle={lead.contactEmail}
        actions={
          <Link href={`/w/${workspaceId}/leads`} className="text-sm font-medium">
            All leads
          </Link>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={lead.band === "hot" ? "bad" : lead.band === "warm" ? "warn" : "neutral"}>{lead.band}</Badge>
        <Badge tone={lead.slaBreached ? "bad" : "good"}>{lead.slaBreached ? "SLA breached" : lead.status}</Badge>
        <Badge>{lead.enriched ? "enriched" : "not enriched"}</Badge>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="grid gap-3 p-5 text-sm sm:grid-cols-3">
            <div>Score {lead.score}</div>
            <div>Fit {lead.fitScore}</div>
            <div>Intent {lead.intentScore}</div>
            <div className="sm:col-span-3 text-muted-foreground">{lead.notes}</div>
          </Card>
          <Card className="p-5 text-sm">
            <div className="font-semibold">Capture payload</div>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify(lead.payload ?? {}, null, 2)}</pre>
          </Card>
          <Card className="p-5 text-sm">
            <div className="font-semibold">Workflow runs</div>
            {runs.length === 0 ? <p className="mt-2 text-muted-foreground">None yet.</p> : null}
            {runs.map((run) => (
              <div key={run.id} className="mt-3">
                <div className="font-medium">{run.event} · {when(run.at)}</div>
                {run.results?.map((result) => (
                  <div key={result.action} className="text-muted-foreground">
                    {result.action}: {result.detail}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>
        <Card className="space-y-3 p-5 text-sm">
          <div>Owner {users.find((user) => user.id === lead.ownerId)?.name ?? "Unassigned"}</div>
          <div>Rule {lead.assignmentRule || "—"}</div>
          <div>SLA {lead.slaDueAt ? when(lead.slaDueAt) : "—"}</div>
          <select
            className="min-h-11 w-full rounded-xl border border-input bg-background px-3"
            value={lead.status}
            disabled={busy}
            onChange={(event) => void move(event.target.value)}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Button tone="soft" disabled={busy} onClick={() => void enrich()}>
            Enrich company
          </Button>
          {notice ? <p className="text-muted-foreground">{notice}</p> : null}
          {lead.companyId ? (
            <Link href={`/w/${workspaceId}/crm/companies/${lead.companyId}`} className="block text-sm font-medium">
              Open company
            </Link>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
