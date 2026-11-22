"use client";

import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/meridian/legacy";
import { CollectorChrome } from "@/components/collections/collector-chrome";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface Scorecard {
  calls: number;
  paymentsPosted: number;
  promisesOpen: number;
  promisesBroken: number;
  promisesKept: number;
  collectors: { name: string; tasksClosed: number }[];
}

export default function ScorecardPage() {
  const { workspaceId } = useActiveWorkspace();
  const [card, setCard] = useState<Scorecard | null>(null);

  useEffect(() => {
    void fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "scorecard", workspaceId }),
    })
      .then((response) => response.json())
      .then((body: Scorecard) => setCard(body))
      .catch(() => undefined);
  }, [workspaceId]);

  return (
    <div>
      <CollectorChrome shortcuts={[]} />
      <PageHeader eyebrow="Collector" title="Daily scorecard" subtitle="Today's calls, payments, and promises for the desk. Closed tasks are counted for the collector who finished them. A promise past its date becomes a broken-promise task the next time jobs run." />
      {card ? (
        <div className="grid gap-3">
          <Card className="p-4 text-sm">
            <div className="font-semibold">Desk today</div>
            <p>{card.calls} calls · {card.paymentsPosted} payments</p>
            <p>{card.promisesOpen} promises open · {card.promisesKept} kept · {card.promisesBroken} broken</p>
          </Card>
          {card.collectors.map((row) => (
            <Card key={row.name} className="p-4 text-sm">
              <div className="font-semibold">{row.name}</div>
              <p>{row.tasksClosed} tasks closed today</p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
