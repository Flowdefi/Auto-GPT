"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface MetroStatus {
  enabled: boolean;
  ownerApproved: boolean;
  complianceApproved: boolean;
}

export default function Metro2Page() {
  const { workspaceId } = useActiveWorkspace();
  const [status, setStatus] = useState<MetroStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/collections?workspace=${workspaceId}`);
    if (!response.ok) return;
    const body = (await response.json()) as { metro2?: MetroStatus };
    setStatus(body.metro2 ?? null);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function post(op: string) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, workspaceId }),
    });
    const body = (await response.json()) as { error?: string; metro2?: MetroStatus; included?: number; excluded?: unknown[] };
    setNotice(body.error ?? (body.included != null ? `Included ${body.included}. Excluded ${body.excluded?.length ?? 0}.` : "Recorded"));
    if (body.metro2) setStatus(body.metro2);
    else await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Metro 2 export"
        subtitle="Disabled unless MERIDIAN_METRO2_EXPORT=enabled and both an owner and a compliance user approve it for this workspace. Another agency's approval does not carry over. Accounts with no mailed validation notice are left out under 12 CFR § 1006.30(a). A past limitations date, and any status other than workable, also stay out until counsel maps them. Social Security numbers are not written into the file. Approval is not counsel sign-off of the layout."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="space-y-3 p-5 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge tone={status?.enabled ? "good" : "warn"}>{status?.enabled ? "Env enabled" : "Disabled by default"}</Badge>
          <Badge tone={status?.ownerApproved ? "good" : "warn"}>{status?.ownerApproved ? "Owner approved" : "Owner has not approved"}</Badge>
          <Badge tone={status?.complianceApproved ? "good" : "warn"}>{status?.complianceApproved ? "Compliance approved" : "Compliance has not approved"}</Badge>
        </div>
        <p>The file is a draft base segment. Counsel and the credit reporting agency must confirm field positions before any transmission.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void post("metro2_approve")}>Record my approval</Button>
          <Button tone="soft" onClick={() => void post("metro2_export")}>Export</Button>
        </div>
      </Card>
    </div>
  );
}
