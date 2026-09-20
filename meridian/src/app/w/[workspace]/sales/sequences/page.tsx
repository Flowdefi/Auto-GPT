"use client";

import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function SequencesPage() {
  const { workspaceId, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader eyebrow="Sales Hub" title="Sequences" subtitle="Multi-touch cadences for seller recovery and buyer onboarding." />
      <Subnav
        current={`/w/${workspaceId}/sales/sequences`}
        items={[
          { href: `/w/${workspaceId}/sales/deals`, label: "Pipeline" },
          { href: `/w/${workspaceId}/sales/forecast`, label: "Forecast" },
          { href: `/w/${workspaceId}/sales/sequences`, label: "Sequences" },
        ]}
      />
      <DataTable
        headers={["Sequence", "Steps", "Enrolled", "Replied", "Meetings"]}
        rows={data.sequences.map((sequence) => ({
          key: sequence.id,
          cells: [sequence.name, String(sequence.steps), String(sequence.enrolled), String(sequence.replied), String(sequence.meetings)],
        }))}
      />
    </div>
  );
}
