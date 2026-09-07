"use client";

import { Badge, Card, PageHeader } from "@/components/ui";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function AutomationPage() {
  const { data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader
        eyebrow="Operations / Data Hub"
        title="Workflows"
        subtitle="Enrollment automation — forms, stages, licenses, and SLAs. Same idea as HubSpot workflows."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {data.workflows.map((workflow) => (
          <Card key={workflow.id} className="p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{workflow.name}</div>
              <Badge tone={workflow.status === "active" ? "good" : "warn"}>{workflow.status}</Badge>
            </div>
            <div className="mt-2 text-sm text-ink-600">Trigger: {workflow.trigger}</div>
            <div className="mt-1 text-sm text-ink-600">Goal: {workflow.goal}</div>
            <div className="mt-3 text-xs text-ink-400">{workflow.enrolled} enrolled</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
