"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, Empty, PageHeader } from "@/components/meridian/legacy";
import { compact, money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface PortfolioCard {
  id: string;
  name: string;
  debtType: string;
  sellerName: string;
  faceValue: number;
  sellerPrice: number;
  accountCount: number;
  states: string[];
  chargeoffYear: string;
  status: string;
}

export default function MarketplacePage() {
  const { workspaceId, config } = useActiveWorkspace();
  const [rows, setRows] = useState<PortfolioCard[]>([]);

  useEffect(() => {
    void fetch(`/api/crm/portfolios?workspace=${workspaceId}`)
      .then((response) => response.json())
      .then((payload) => setRows(payload.portfolios ?? []));
  }, [workspaceId]);

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow={config.product}
        title={config.inventoryNounPlural}
        subtitle="Cards and the spreadsheet edit the same server records."
        actions={
          <Link href={`/w/${workspaceId}/portfolios`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand)] px-4 text-sm font-medium text-white">
            Open spreadsheet
          </Link>
        }
      />
      {rows.length === 0 ? (
        <Empty title="No portfolios yet" body="Add one from the spreadsheet. It will show up here on the next load." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <Link key={item.id} href={`/w/${workspaceId}/portfolios/${item.id}`}>
              <Card className="h-full p-5 transition hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.debtType}</div>
                  </div>
                  <Badge tone="accent">{item.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Face</div>
                    <div className="font-medium">{money(item.faceValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Seller price</div>
                    <div className="font-medium">{money(item.sellerPrice)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Accounts</div>
                    <div className="font-medium">{compact(item.accountCount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Charge-off</div>
                    <div className="font-medium">{item.chargeoffYear || "—"}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {item.sellerName || "Seller unset"} · {item.states.join(", ") || "—"}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
