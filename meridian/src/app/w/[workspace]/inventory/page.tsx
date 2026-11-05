"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/tables";
import { Badge, Card, PageHeader } from "@/components/meridian/legacy";
import { safeHttpUrl } from "@/lib/debt";
import { compact, fullMoney } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

type Row = InventoryItem & { sellerName?: string; buyerName?: string; dealName?: string };

export default function InventoryPage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [items, setItems] = useState<Row[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/inventory?workspace=${workspaceId}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load portfolios");
        return (await response.json()) as { items?: Row[] };
      })
      .then((body) => {
        if (!cancelled) setItems(body.items ?? []);
      })
      .catch((error: unknown) => {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not load portfolios");
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  return (
    <div>
      <PageHeader
        eyebrow={config.product}
        title={config.inventoryNounPlural}
        subtitle="Debt portfolios for sale. Import with npm run import:inventory. Re-running the same file updates matches."
      />
      {notice ? <Card className="mb-4 p-4 text-sm">{notice}</Card> : null}
      {items === null ? <Card className="p-5 text-sm text-muted-foreground">Loading portfolios…</Card> : null}
      {items && items.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">
          No portfolios yet. From the meridian directory: npm run import:inventory -- file.xlsx
        </Card>
      ) : null}
      {items && items.length > 0 ? (
        <DataTable
          headers={["Portfolio", "Paper", "Face", "Accounts", "States", "Charge-off", "Ask", "Status", "File"]}
          rows={items.map((item) => {
            const file = safeHttpUrl(item.maskedFileUrl);
            return {
              key: item.id,
              href: `/w/${workspaceId}/inventory/${item.id}`,
              cells: [
                item.name,
                item.kind || "—",
                fullMoney(item.faceValue),
                compact(item.accountCount),
                item.states.join(", ") || "—",
                item.chargeOffDates || "—",
                fullMoney(item.askingPrice),
                <Badge key={item.id} tone="accent">{item.status}</Badge>,
                file ? (
                  <a key={`${item.id}-file`} href={file} target="_blank" rel="noreferrer" className="text-[var(--brand-text)]">
                    Open
                  </a>
                ) : (
                  "—"
                ),
              ],
            };
          })}
        />
      ) : null}
    </div>
  );
}
