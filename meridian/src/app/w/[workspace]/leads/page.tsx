"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { when } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface LeadRow {
  id: string;
  status: string;
  side: string;
  score: number;
  band: "hot" | "warm" | "nurture";
  source: string;
  ownerId?: string;
  slaBreached: boolean;
  slaDueAt?: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  companyName: string;
  notes: string;
}

interface TaskRow {
  id: string;
  title: string;
  dueAt: string;
  ownerId: string;
  leadId?: string;
}

const STATUSES = ["new", "working", "mql", "routed", "accepted", "sql", "nurture", "rejected", "converted"] as const;

export default function LeadsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    company: "",
    message: "",
  });

  async function refresh() {
    const response = await fetch(`/api/leads?workspace=${workspaceId}`);
    const payload = await response.json();
    setLeads(payload.leads ?? []);
    setCounts(payload.counts ?? {});
    setUsers(payload.users ?? []);
    setTasks(payload.tasks ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const visible = useMemo(
    () => (filter === "all" ? leads : leads.filter((lead) => lead.status === filter)),
    [filter, leads],
  );

  async function createLead() {
    setBusy("create");
    setNotice(null);
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...form, source: "manual" }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      setNotice(payload.error ?? "Could not create lead");
      return;
    }
    setForm({ email: "", firstName: "", lastName: "", company: "", message: "" });
    setNotice(`Lead ${payload.created ? "created" : "updated"} · score ${payload.lead.score} · ${payload.lead.band}.`);
    await refresh();
  }

  async function move(leadId: string, status: string) {
    setBusy(leadId);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, leadId, status }),
    });
    setBusy(null);
    await refresh();
  }

  async function enrich(leadId: string) {
    setBusy(leadId);
    const response = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, leadId, enrich: true }),
    });
    const payload = await response.json();
    setBusy(null);
    setNotice(payload.ok ? `Enriched ${payload.result?.domain}` : payload.error ?? "Enrichment failed");
    await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Revenue"
        title="Leads"
        subtitle="Salesforce-style capture → score → route → accept. Hot leads have a 15-minute first-touch SLA."
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium"
        >
          All {leads.length}
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium capitalize"
          >
            {status} {counts[status] ?? 0}
          </button>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {visible.length === 0 ? <Card className="p-6 text-sm text-muted-foreground">No leads in this view.</Card> : null}
          {visible.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">
                    {lead.contactName || lead.contactEmail} · {lead.companyName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lead.contactTitle} · {lead.contactEmail} · {lead.source}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={lead.band === "hot" ? "bad" : lead.band === "warm" ? "warn" : "neutral"}>{lead.band}</Badge>
                  <Badge tone={lead.slaBreached ? "bad" : "good"}>{lead.slaBreached ? "SLA breached" : lead.status}</Badge>
                  <span className="text-sm tabular-nums">{lead.score}</span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{lead.notes}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <select
                  className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm"
                  value={lead.status}
                  disabled={busy === lead.id}
                  onChange={(event) => void move(lead.id, event.target.value)}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <Button tone="soft" disabled={busy === lead.id} onClick={() => void enrich(lead.id)}>
                  Enrich company
                </Button>
                <span className="text-xs text-muted-foreground">
                  {users.find((user) => user.id === lead.ownerId)?.name ?? "Unassigned"}
                  {lead.slaDueAt ? ` · due ${when(lead.slaDueAt)}` : ""}
                </span>
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          <Card className="space-y-2 p-4">
            <div className="text-sm font-semibold">Create lead</div>
            <Field placeholder="Work email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Field placeholder="First name" value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} />
            <Field placeholder="Last name" value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} />
            <Field placeholder="Company" value={form.company} onChange={(event) => setForm({ ...form, company: event.target.value })} />
            <textarea
              className="min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm"
              placeholder="What they asked for"
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
            />
            <Button disabled={busy === "create" || !form.email} onClick={() => void createLead()}>
              {busy === "create" ? "Scoring…" : "Score and route"}
            </Button>
          </Card>
          {notice ? <Card className="p-4 text-sm">{notice}</Card> : null}
          <Card className="p-4">
            <div className="mb-2 text-sm font-semibold">Open tasks</div>
            <div className="space-y-2 text-sm">
              {tasks.length === 0 ? <div className="text-muted-foreground">None.</div> : null}
              {tasks.slice(0, 12).map((task) => (
                <div key={task.id}>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground">{when(task.dueAt)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
