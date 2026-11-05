"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { triLabel } from "@/lib/collections/eligibility";
import type { StateEligibility } from "@/lib/collections/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function EligibilityPage() {
  const { workspaceId } = useActiveWorkspace();
  const [rows, setRows] = useState<StateEligibility[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) {
      setNotice("Sign in with a seat to edit state eligibility.");
      return;
    }
    const body = (await response.json()) as { eligibility: StateEligibility[] };
    setRows(body.eligibility ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function save(row: StateEligibility, eligible: boolean) {
    setNotice(null);
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "eligibility", workspaceId, code: row.code, eligible, notes: row.notes, needsCounselReview: row.needsCounselReview }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setNotice(body.error ?? "Save failed");
      return;
    }
    await refresh();
  }

  const eligible = rows.filter((row) => row.eligible);
  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="State eligibility"
        subtitle="Collection is limited to states with no collector or debt-buyer license, plus Texas. Eligibility follows the consumer's state. This table is not legal advice."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <p className="mb-4 text-sm">Eligible now: {eligible.map((row) => row.code).join(", ") || "none"}.</p>
      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.code} className="p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-semibold">{row.name}</div>
              {row.eligible ? <Badge tone="good">Eligible</Badge> : <Badge tone="bad">Quarantine</Badge>}
              {row.needsCounselReview ? <Badge tone="warn">Counsel review</Badge> : null}
              <span>Collector license {triLabel(row.collectorLicenseRequired)}</span>
              <span>Debt-buyer license {triLabel(row.debtBuyerLicenseRequired)}</span>
              <Button tone="soft" onClick={() => void save(row, !row.eligible)}>
                {row.eligible ? "Mark ineligible" : "Mark eligible"}
              </Button>
            </div>
            <p className="mt-2">{row.bondOrRegistration}</p>
            <p className="mt-2">{row.notes}</p>
            <p className="mt-2 text-muted-foreground">
              {row.citation} Reviewed {row.lastReviewed}.{" "}
              <a className="underline" href={row.citationUrl}>
                Source
              </a>
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
