"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { RecordingParty, RecordingRule } from "@/lib/collections/recording";
import { useActiveWorkspace } from "@/lib/use-workspace";

const PARTIES: RecordingParty[] = ["all", "one", "uncertain"];

export default function RecordingTablePage() {
  const { workspaceId } = useActiveWorkspace();
  const [rules, setRules] = useState<RecordingRule[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/collections?workspace=${workspaceId}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { recordingRules?: RecordingRule[] };
        setRules(body.recordingRules ?? []);
      })
      .catch(() => undefined);
  }, [workspaceId]);

  async function save() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "recording_save", workspaceId, recordingRules: rules }),
    });
    const body = (await response.json()) as { error?: string; rules?: RecordingRule[] };
    setNotice(body.error ?? "Saved. Every row still needs counsel review. Uncertain states ask for recording consent.");
    if (body.rules) setRules(body.rules);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Call recording consent"
        subtitle="This workspace has its own table. All-party states stop in the voice greeting until the person consents. One-party states announce recording and continue. Uncertain states ask for consent. Saving keeps the counsel-review flag. Citations are a starting set, not a legal opinion."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Button className="mb-4" onClick={() => void save()}>Save table</Button>
      <div className="grid gap-3">
        {rules.map((rule) => (
          <Card key={rule.code} className="grid gap-2 p-4 text-sm sm:grid-cols-[72px_140px_1fr]">
            <div className="font-semibold">{rule.code}</div>
            <label className="grid gap-1">
              Consent
              <select
                className="min-h-11 rounded-xl border bg-transparent px-2"
                value={rule.party}
                aria-label={`${rule.code} recording consent`}
                onChange={(event) => setRules((current) => current.map((item) => (item.code === rule.code ? { ...item, party: event.target.value as RecordingParty } : item)))}
              >
                {PARTIES.map((party) => <option key={party} value={party}>{party}</option>)}
              </select>
            </label>
            <div>
              <Badge tone="warn">Counsel review</Badge>
              <p className="mt-2 text-muted-foreground">{rule.citation}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
