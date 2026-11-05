"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Metrics {
  blockedByReason: Record<string, number>;
  callConnectRate: number | null;
  recoveryByPortfolio: { portfolioId: string; collectedCents: number; balanceCents: number }[];
  jobLagSeconds: number;
  errorRate: number;
}

interface Digest {
  id: string;
  at: string;
  summary: string;
  delivery: string;
  recipientCount: number;
}

export default function OpsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [digests, setDigests] = useState<Digest[]>([]);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "ops", workspaceId }),
    })
      .then((response) => response.json())
      .then((body: { metrics?: Metrics; digests?: Digest[] }) => {
        setMetrics(body.metrics ?? null);
        setDigests(body.digests ?? []);
      })
      .catch(() => undefined);
  }, [workspaceId]);

  return (
    <div>
      <PageHeader eyebrow="Compliance" title="Operations" subtitle="Counts only. Labels are reason codes, portfolio ids, and rates. A weekly digest is stored for the compliance role and is emailed only when the digest flag, live delivery, and a mail key are all set." />
      {metrics ? (
        <div className="mb-4 grid gap-3">
          <Card className="p-4 text-sm">
            <div className="font-semibold">Sends blocked by reason</div>
            <p className="mt-2">{Object.entries(metrics.blockedByReason).map(([code, count]) => `${code} ${count}`).join(" · ") || "None recorded"}</p>
          </Card>
          <Card className="p-4 text-sm">
            <p>Call connect rate {metrics.callConnectRate === null ? "—" : metrics.callConnectRate}</p>
            <p>Job lag {metrics.jobLagSeconds} seconds · error rate {metrics.errorRate}</p>
          </Card>
          <Card className="p-4 text-sm">
            <div className="font-semibold">Recovery by portfolio</div>
            {metrics.recoveryByPortfolio.slice(0, 8).map((row) => (
              <p key={row.portfolioId}>{row.portfolioId}: ${(row.collectedCents / 100).toFixed(2)} posted · ${(row.balanceCents / 100).toFixed(2)} still on file</p>
            ))}
          </Card>
        </div>
      ) : null}
      <div className="grid gap-3">
        {digests.map((digest) => (
          <Card key={digest.id} className="p-4 text-sm">
            <div className="font-semibold">{digest.delivery} · {digest.recipientCount} compliance seats · {digest.at.slice(0, 10)}</div>
            <p className="mt-2">{digest.summary}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
