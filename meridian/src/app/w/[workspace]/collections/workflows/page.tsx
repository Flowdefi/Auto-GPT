"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { CollectionSequence, SequenceStep } from "@/lib/collections/jobs";
import type { CollectionTemplate, PortfolioAccount } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

const CHANNELS = ["email", "sms", "letter", "voice_outbound"] as const;

export default function WorkflowBuilderPage() {
  const { workspaceId } = useActiveWorkspace();
  const [sequences, setSequences] = useState<CollectionSequence[]>([]);
  const [templates, setTemplates] = useState<CollectionTemplate[]>([]);
  const [accounts, setAccounts] = useState<PortfolioAccount[]>([]);
  const [name, setName] = useState("Example sequence");
  const [steps, setSteps] = useState<SequenceStep[]>([
    { id: "step_1", channel: "email", templateId: "EML-001", delayDays: 0 },
    { id: "step_2", channel: "sms", templateId: "SMS-002", delayDays: 3 },
  ]);
  const [accountId, setAccountId] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) return;
    const body = (await response.json()) as { sequences?: CollectionSequence[]; templates?: CollectionTemplate[]; accounts?: PortfolioAccount[] };
    setSequences(body.sequences ?? []);
    setTemplates(body.templates ?? []);
    setAccounts(body.accounts ?? []);
    if (!accountId && body.accounts?.[0]) setAccountId(body.accounts[0].id);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function post(payload: Record<string, unknown>) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, ...payload }),
    });
    const body = (await response.json()) as { error?: string; sequence?: CollectionSequence; enqueued?: number; jobs?: unknown[] };
    setNotice(body.error ?? (body.enqueued != null ? `Enqueued ${body.enqueued} gated steps.` : body.jobs ? "Due jobs ran in sandbox." : "Saved"));
    if (body.sequence) setSequenceId(body.sequence.id);
    await refresh();
  }

  function updateStep(index: number, patch: Partial<SequenceStep>) {
    setSteps((current) => current.map((step, item) => (item === index ? { ...step, ...patch } : step)));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Sequence builder"
        subtitle="Each step is email, SMS, letter, or voice. The job runner sends it only if the compliance gate allows it. Delivery stays in sandbox unless live provider flags are set."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card className="p-5">
          <label className="grid gap-1 text-sm">
            Sequence name
            <input className="min-h-11 rounded-xl border bg-transparent px-3" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <ol className="mt-6 space-y-0 border-l-2 border-[var(--brand)] pl-6">
            {steps.map((step, index) => (
              <li key={step.id} className="relative mb-4">
                <span className="absolute -left-[31px] top-4 size-3 rounded-full bg-[var(--brand)]" />
                <div className="grid gap-2 rounded-xl border p-3 text-sm sm:grid-cols-4">
                  <select className="min-h-11 rounded-xl border bg-transparent px-2" value={step.channel} onChange={(event) => updateStep(index, { channel: event.target.value as SequenceStep["channel"] })} aria-label={`Channel ${index + 1}`}>
                    {CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
                  </select>
                  <input className="min-h-11 rounded-xl border bg-transparent px-2" value={step.templateId} onChange={(event) => updateStep(index, { templateId: event.target.value })} aria-label={`Template ${index + 1}`} list="template-ids" />
                  <input className="min-h-11 rounded-xl border bg-transparent px-2" type="number" min={0} value={step.delayDays} onChange={(event) => updateStep(index, { delayDays: Number(event.target.value) })} aria-label={`Delay days ${index + 1}`} />
                  <input className="min-h-11 rounded-xl border bg-transparent px-2" value={step.destination ?? ""} placeholder="Live destination" onChange={(event) => updateStep(index, { destination: event.target.value })} aria-label={`Destination ${index + 1}`} />
                </div>
              </li>
            ))}
          </ol>
          <datalist id="template-ids">
            {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </datalist>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button tone="soft" onClick={() => setSteps((current) => [...current, { id: `step_${current.length + 1}`, channel: "letter", templateId: "LTR-003", delayDays: 7 }])}>Add step</Button>
            <Button onClick={() => void post({ op: "sequence_save", sequence: { id: sequenceId || `seq_${Date.now()}`, workspaceId, name, steps, enabled: true } })}>Save sequence</Button>
            <Button tone="soft" onClick={() => void post({ op: "jobs_run" })}>Run due jobs</Button>
          </div>
        </Card>
        <Card className="space-y-3 p-5 text-sm">
          <div className="font-semibold">Enroll</div>
          <select className="min-h-11 w-full rounded-xl border bg-transparent px-2" value={sequenceId} onChange={(event) => setSequenceId(event.target.value)} aria-label="Saved sequence">
            <option value="">Select a saved sequence</option>
            {sequences.map((sequence) => <option key={sequence.id} value={sequence.id}>{sequence.name}</option>)}
          </select>
          <select className="min-h-11 w-full rounded-xl border bg-transparent px-2" value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-label="Account">
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.accountRef} · {account.state}</option>)}
          </select>
          <Button onClick={() => void post({ op: "sequence_enroll", sequenceId, accountId })}>Enroll account</Button>
          <p className="text-muted-foreground">{sequences.length} saved. Every step still has to pass the compliance gate.</p>
          {templates.slice(0, 4).map((template) => <Badge key={template.id}>{template.id}</Badge>)}
        </Card>
      </div>
    </div>
  );
}
