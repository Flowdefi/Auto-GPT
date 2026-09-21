"use client";

import { useEffect, useState } from "react";
import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { when } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: { event: string };
  actions: Array<{ type: string }>;
  runCount: number;
  lastRunAt?: string;
}

interface RunRow {
  id: string;
  workflowId: string;
  event: string;
  at: string;
  results: Array<{ action: string; ok: boolean; detail: string }>;
}

export default function AutomationPage() {
  const { workspaceId } = useActiveWorkspace();
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);

  useEffect(() => {
    void fetch(`/api/leads?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => {
        setWorkflows(payload.workflows ?? []);
        setRuns(payload.runs ?? []);
      });
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Workflows"
        subtitle="Event-driven automations for buyers and sellers: score, route, SLA, tasks, lists. Same idea as HubSpot workflows and Salesforce Process Builder."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{workflow.name}</div>
              <Badge tone={workflow.enabled ? "good" : "warn"}>{workflow.enabled ? "active" : "paused"}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{workflow.description}</p>
            <div className="mt-3 text-xs text-muted-foreground">
              Trigger {workflow.trigger.event} · {workflow.actions.length} actions · ran {workflow.runCount}
              {workflow.lastRunAt ? ` · last ${when(workflow.lastRunAt)}` : ""}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-2 text-sm font-semibold">Recent runs</div>
        <div className="space-y-2">
          {runs.length === 0 ? <Card className="p-4 text-sm text-muted-foreground">No runs yet. Create a lead or submit the website form.</Card> : null}
          {runs.map((run) => (
            <Card key={run.id} className="p-4 text-sm">
              <div className="font-medium">
                {run.event} · {when(run.at)}
              </div>
              <div className="mt-1 text-muted-foreground">
                {run.results.map((result) => `${result.action}: ${result.detail}`).join(" · ")}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
