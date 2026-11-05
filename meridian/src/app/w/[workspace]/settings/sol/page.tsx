"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import type { SolRule } from "@/lib/collections/sol";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function SolTablePage() {
  const { workspaceId } = useActiveWorkspace();
  const [rules, setRules] = useState<SolRule[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/collections?workspace=${workspaceId}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { solRules?: SolRule[] };
        setRules(body.solRules ?? []);
      })
      .catch(() => undefined);
  }, [workspaceId]);

  function edit(code: string, years: string) {
    setRules((current) => current.map((rule) => (rule.code === code ? { ...rule, years: years.trim() === "" ? null : Number(years) } : rule)));
  }

  async function save() {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "sol_save", workspaceId, solRules: rules }),
    });
    const body = (await response.json()) as { error?: string; rules?: SolRule[] };
    setNotice(body.error ?? "Saved. Blank states still do not get a calculated date.");
    if (body.rules) setRules(body.rules);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Limitations table"
        subtitle="Only Texas and Georgia start with a reviewed period. Leave every other state blank until counsel enters one. Accrual is last payment, otherwise charge-off, and that choice needs counsel review."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Button className="mb-4" onClick={() => void save()}>Save table</Button>
      <div className="grid gap-3">
        {rules.map((rule) => (
          <Card key={rule.code} className="grid gap-2 p-4 text-sm sm:grid-cols-[80px_120px_1fr]">
            <div className="font-semibold">{rule.code}</div>
            <label className="grid gap-1">
              Years
              <input className="min-h-11 rounded-xl border bg-transparent px-3" value={rule.years ?? ""} onChange={(event) => edit(rule.code, event.target.value)} aria-label={`${rule.code} years`} />
            </label>
            <div>
              {rule.needsCounselReview ? <Badge tone="warn">Counsel review</Badge> : null}
              <p className="mt-2 text-muted-foreground">{rule.citation}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
