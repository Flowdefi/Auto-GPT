"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Presence {
  email: string;
  status: string;
  updatedAt: string;
}

export default function DialerPage() {
  const { workspaceId } = useActiveWorkspace();
  const [board, setBoard] = useState<Presence[]>([]);

  async function load(presence?: string) {
    const response = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "presence", workspaceId, presence }),
    });
    const body = (await response.json()) as { board?: Presence[] };
    setBoard(body.board ?? []);
  }

  useEffect(() => {
    void load("available");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <div>
      <PageHeader eyebrow="Collector" title="Softphone" subtitle="Click-to-call stays on the account. This board shows who is available. A collector without a passing quiz can walk the sandbox call and cannot place a live dial." />
      <div className="mb-4 flex flex-wrap gap-2">
        {["available", "away", "wrap"].map((status) => (
          <Button key={status} tone="soft" onClick={() => void load(status)}>{status}</Button>
        ))}
      </div>
      <div className="grid gap-3">
        {board.map((row) => (
          <Card key={row.email} className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <span className="font-semibold">{row.email}</span>
            <Badge tone={row.status === "available" ? "good" : "warn"}>{row.status}</Badge>
          </Card>
        ))}
        {board.length === 0 ? <Card className="p-4 text-sm">No one is on the board yet.</Card> : null}
      </div>
    </div>
  );
}
