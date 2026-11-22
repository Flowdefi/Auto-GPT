"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface TierRow {
  tier_id: string;
  opening_offer_pct?: { value: number; is_default?: boolean };
  floor_pct?: { value: number; is_default?: boolean };
}

interface MatrixFile {
  tiers: TierRow[];
}

function percent(tier: TierRow, key: "opening_offer_pct" | "floor_pct"): string {
  const field = tier[key];
  return field ? String(field.value) : "";
}

export default function SettlementAuthorityPage() {
  const { workspaceId } = useActiveWorkspace();
  const [matrix, setMatrix] = useState<MatrixFile | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/collections?workspace=${workspaceId}`)
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { settlementMatrix?: MatrixFile };
        if (body.settlementMatrix) setMatrix(body.settlementMatrix);
      })
      .catch(() => undefined);
  }, [workspaceId]);

  function editTier(tierId: string, key: "opening_offer_pct" | "floor_pct", raw: string) {
    setMatrix((current) => {
      if (!current) return current;
      return {
        ...current,
        tiers: current.tiers.map((tier) => {
          if (tier.tier_id !== tierId || !tier[key]) return tier;
          return { ...tier, [key]: { ...tier[key], value: Number(raw) } };
        }),
      };
    });
  }

  async function save() {
    if (!matrix) return;
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "matrix", workspaceId, matrix }),
    });
    const body = (await response.json()) as { error?: string; matrix?: MatrixFile };
    setNotice(body.error ?? "Saved. Default flags are cleared, so offers can be calculated.");
    if (body.matrix) setMatrix(body.matrix);
  }

  const defaults = matrix?.tiers.some((tier) => tier.opening_offer_pct?.is_default || tier.floor_pct?.is_default);
  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Settlement authority"
        subtitle="Offers come from this matrix. Packaged numbers stay inactive until an owner saves them. This is not legal advice."
      />
      {defaults ? <Badge tone="warn">Defaults still active — offers are blocked</Badge> : <Badge tone="good">Owner values active</Badge>}
      {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
      <div className="mt-4 space-y-3">
        {(matrix?.tiers ?? []).filter((tier) => tier.opening_offer_pct).map((tier) => (
          <Card key={tier.tier_id} className="grid gap-3 p-4 text-sm sm:grid-cols-3">
            <div className="font-semibold">{tier.tier_id}</div>
            <label className="grid gap-1">
              Opening %
              <input className="min-h-11 rounded-xl border bg-transparent px-3" value={percent(tier, "opening_offer_pct")} onChange={(event) => editTier(tier.tier_id, "opening_offer_pct", event.target.value)} />
            </label>
            <label className="grid gap-1">
              Floor %
              <input className="min-h-11 rounded-xl border bg-transparent px-3" value={percent(tier, "floor_pct")} onChange={(event) => editTier(tier.tier_id, "floor_pct", event.target.value)} />
            </label>
          </Card>
        ))}
      </div>
      <Button className="mt-4" onClick={() => void save()}>Save owner values</Button>
    </div>
  );
}
