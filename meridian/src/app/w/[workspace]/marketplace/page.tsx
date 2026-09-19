"use client";

import Link from "next/link";
import { Badge, Card, PageHeader } from "@/components/ui";
import { centsOnDollar, compact, money } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function MarketplacePage() {
  const { workspaceId, config, data } = useActiveWorkspace();
  return (
    <div>
      <PageHeader
        eyebrow={config.product}
        title={config.inventoryNounPlural}
        subtitle={
          config.id === "triton"
            ? "Charged-off books on the DebtMarket desk — face, ask, media, vintage, and bid status."
            : "Blocks, listings, and mandates on the Aether desk."
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {data.inventory.map((item) => {
          const seller = data.companies.find((company) => company.id === item.sellerCompanyId);
          return (
            <Link key={item.id} href={`/w/${workspaceId}/marketplace/${item.id}`}>
              <Card className="h-full p-5 transition hover:shadow-pop">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{item.name}</div>
                    <div className="text-sm text-ink-500">{item.kind}</div>
                  </div>
                  <Badge tone="accent">{item.status}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-400">Face / notional</div>
                    <div className="font-medium">{money(item.faceValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400">Ask</div>
                    <div className="font-medium">
                      {money(item.askingPrice)} · {centsOnDollar(item.faceValue, item.askingPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400">Accounts / units</div>
                    <div className="font-medium">{compact(item.accountCount)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-400">Media</div>
                    <div className="font-medium">{item.mediaQuality}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-ink-500">
                  {seller?.name} · {item.states.join(", ")} · {item.vintage}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
