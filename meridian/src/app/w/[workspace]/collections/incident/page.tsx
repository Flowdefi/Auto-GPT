"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function IncidentPage() {
  const { workspaceId } = useActiveWorkspace();
  const [frozen, setFrozen] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "incident_home", workspaceId }),
    })
      .then((response) => response.json())
      .then((body: { frozen?: boolean; checklist?: string[] }) => {
        setFrozen(Boolean(body.frozen));
        setChecklist(body.checklist ?? []);
      })
      .catch(() => undefined);
  }, [workspaceId]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string; frozen?: boolean; hungUp?: number; passed?: boolean; restored?: boolean; already?: boolean; crossed?: boolean; checks?: Array<{ channel: string; reasonCode: string }> };
    if (body.checks) {
      setDrill(`${body.passed ? "Drill passed" : "Drill failed"}. ${body.already ? "Freeze was already on and was left on." : body.restored ? "Freeze was lifted." : "Freeze was not lifted."} ${body.crossed ? "The other workspace was frozen." : "The other workspace stayed open."} ${body.checks.map((row) => `${row.channel} ${row.reasonCode}`).join(", ")}`);
    }
    setNotice(body.error ?? (body.checks ? null : body.frozen === true ? `Outbound frozen. ${body.hungUp ?? 0} active calls ended.` : body.frozen === false ? "Outbound freeze lifted for this workspace." : "Tabletop recorded."));
    if (body.frozen === true) setFrozen(true);
    if (body.frozen === false) setFrozen(false);
  }

  return (
    <div>
      <PageHeader eyebrow="Compliance" title="Incident response" subtitle="Draft playbook for a suspected breach of consumer information. Counsel reviews any notice before it is sent. This page is linked from docs/GLBA-SAFEGUARDS.md." />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-4 p-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Outbound</span>
          <Badge tone={frozen ? "warn" : "good"}>{frozen ? "Frozen" : "Open"}</Badge>
        </div>
        <p className="mt-2">Freeze stops voice, SMS, email, and letters for this workspace only. Inbound calls and a consumer-started payment stay available. Live calls are hung up only when the live voice flags are on.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void post({ op: "freeze_outbound", running: frozen ? false : true })}>{frozen ? "Lift outbound freeze" : "Freeze all outbound"}</Button>
          <Button tone="soft" onClick={() => void post({ op: "freeze_drill" })}>Run freeze drill</Button>
        </div>
        <p className="mt-2">The drill freezes this workspace, checks voice, SMS, email, and letters, then lifts the freeze unless it was already on. It does not call a provider while delivery is sandbox. Active sandbox calls in this workspace end for that moment.</p>
        {drill ? <p className="mt-2">{drill}</p> : null}
      </Card>
      <Card className="grid gap-2 p-4 text-sm">
        <div className="font-semibold">Tabletop checklist</div>
        {checklist.map((item) => (
          <label key={item} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={checked.includes(item)}
              onChange={() => setChecked((current) => current.includes(item) ? current.filter((row) => row !== item) : [...current, item])}
            />
            {item}
          </label>
        ))}
        <Button className="mt-2" tone="soft" onClick={() => void post({ op: "tabletop_save", checked })}>Record tabletop</Button>
      </Card>
    </div>
  );
}
