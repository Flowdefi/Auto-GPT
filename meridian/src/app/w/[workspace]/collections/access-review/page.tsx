"use client";

import { useEffect, useState } from "react";
import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface OperatorRow {
  email: string;
  role: string;
  mfaEnabled: boolean;
  canRevealPii: boolean;
  status: string;
  lastLoginAt: string | null;
}

export default function AccessReviewPage() {
  const { workspaceId } = useActiveWorkspace();
  const [rows, setRows] = useState<OperatorRow[]>([]);
  const [citation, setCitation] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "access_review", workspaceId }),
    }).then(async (response) => {
      const body = (await response.json()) as { error?: string; operators?: OperatorRow[]; citation?: string };
      if (!response.ok) {
        setNotice(body.error ?? "Sign in to review access.");
        return;
      }
      setRows(body.operators ?? []);
      setCitation(body.citation ?? "");
    });
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow="Collections"
        title="Access review"
        subtitle="Who can sign in, whether MFA is on, and who can reveal stored identifiers. Password hashes are not included. This supports the Safeguards Rule draft in docs/GLBA-SAFEGUARDS.md."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      <Card className="mb-4 p-4 text-sm">{citation}</Card>
      <div className="grid gap-3">
        {rows.map((row) => (
          <Card key={row.email} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <div className="font-semibold">{row.email}</div>
              <div className="text-muted-foreground">{row.role} · {row.status} · last login {row.lastLoginAt ? row.lastLoginAt.slice(0, 10) : "never"}</div>
            </div>
            <div className="flex gap-2">
              <Badge tone={row.mfaEnabled ? "good" : "warn"}>{row.mfaEnabled ? "MFA on" : "MFA off"}</Badge>
              <Badge tone={row.canRevealPii ? "warn" : "good"}>{row.canRevealPii ? "Can reveal identifiers" : "Cannot reveal identifiers"}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
