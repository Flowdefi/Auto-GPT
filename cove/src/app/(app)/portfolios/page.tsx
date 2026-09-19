"use client";

import Link from "next/link";
import { Badge, Card, Title } from "@/components/ui";
import { cents, money, pct } from "@/lib/format";
import { rollUp, totals, type Liquidation } from "@/lib/portfolios";
import { useCove } from "@/lib/store";

const SLICE_TONE: Record<string, string> = {
  active: "bg-cove-teal",
  paid: "bg-cove-sage",
  settled: "bg-emerald-400",
  bankrupt: "bg-amber-500",
  deceased: "bg-stone-500",
  refusal: "bg-cove-coral",
  unable_to_locate: "bg-stone-400",
  disputed: "bg-amber-300",
  recalled: "bg-stone-300",
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-cove-sand">{label}</div>
      <div className="mt-1 font-serif text-3xl tracking-tight">{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-cove-mute">{sub}</div> : null}
    </Card>
  );
}

function DispositionBar({ row }: { row: Liquidation }) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-parchment-200">
        {row.dispositions.map((slice) => (
          <div
            key={slice.key}
            className={SLICE_TONE[slice.key] ?? "bg-stone-400"}
            style={{ width: `${Math.max(slice.share * 100, 1.5)}%` }}
            title={`${slice.label} · ${slice.count}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cove-mute">
        {row.dispositions.map((slice) => (
          <span key={slice.key} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${SLICE_TONE[slice.key] ?? "bg-stone-400"}`} />
            {slice.label} {slice.count} · {pct(slice.share, 0)}
          </span>
        ))}
      </div>
    </div>
  );
}

/** How far collections have run against the price paid for the paper. */
function RecoveryRail({ row }: { row: Liquidation }) {
  const ceiling = Math.max(row.liquidationPct, row.breakEvenPct) * 1.3 || 0.01;
  return (
    <div className="relative h-2.5 rounded-full bg-parchment-200">
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${
          row.liquidationPct >= row.breakEvenPct ? "bg-cove-sage" : "bg-cove-teal"
        }`}
        style={{ width: `${Math.min(100, (row.liquidationPct / ceiling) * 100)}%` }}
      />
      <div
        className="absolute inset-y-[-3px] w-0.5 bg-cove-coral"
        style={{ left: `${Math.min(100, (row.breakEvenPct / ceiling) * 100)}%` }}
        title={`Break-even at ${pct(row.breakEvenPct, 2)} liquidation`}
      />
    </div>
  );
}

export default function PortfoliosPage() {
  const portfolios = useCove((state) => state.portfolios);
  const accounts = useCove((state) => state.accounts);
  const plans = useCove((state) => state.plans);
  const rows = rollUp(portfolios, accounts, plans);
  const all = totals(rows);

  return (
    <div>
      <Title
        kicker="Liquidation tracker"
        title="Portfolio performance"
        sub="Every tape we bought or took on contingency, scored against what it cost. The coral tick on each rail is break-even."
      />

      {all ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Liquidated"
              value={pct(all.liquidationPct, 2)}
              sub={`${money(all.collected)} collected of ${money(all.faceValue)} face`}
            />
            <Stat
              label="Cost"
              value={money(all.cost)}
              sub={`${cents(all.costBasis)} on the dollar · break-even ${pct(all.breakEvenPct, 2)}`}
            />
            <Stat
              label="Net multiple"
              value={`${all.netMultiple.toFixed(2)}x`}
              sub={`${all.profit >= 0 ? "Up" : "Down"} ${money(Math.abs(all.profit))} against cost`}
            />
            <Stat
              label="Accounts"
              value={all.accounts.toLocaleString()}
              sub={`${all.workable} workable · ${all.contactable} contactable today`}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="In payment plans"
              value={money(all.pendingPlanDollars)}
              sub={`${all.pendingPlanCount} active plans`}
            />
            <Stat label="Scheduled next 30 days" value={money(all.scheduled30)} sub="Installments already dated" />
            <Stat label="Open balance" value={money(all.openBalance)} sub="Active and disputed accounts" />
            <Stat
              label="Closed as uncollectable"
              value={pct(
                all.dispositions
                  .filter((slice) =>
                    ["bankrupt", "deceased", "refusal", "unable_to_locate"].includes(slice.key),
                  )
                  .reduce((sum, slice) => sum + slice.share, 0),
                0,
              )}
              sub={all.dispositions
                .filter((slice) => ["bankrupt", "deceased", "refusal"].includes(slice.key))
                .map((slice) => `${slice.label} ${pct(slice.share, 0)}`)
                .join(" · ") || "None yet"}
            />
          </div>

          <Card className="mt-3 p-5">
            <div className="mb-3 text-sm font-semibold">Account status mix — all portfolios</div>
            <DispositionBar row={all} />
          </Card>
        </>
      ) : null}

      <div className="mt-6 space-y-3">
        {rows.map((row) => (
          <Card key={row.portfolio.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/portfolios/${row.portfolio.id}`} className="font-serif text-xl hover:underline">
                  {row.portfolio.name}
                </Link>
                <div className="text-sm text-cove-mute">
                  {row.portfolio.seller} · {row.portfolio.assetClass} · bought {row.portfolio.purchasedAt}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.portfolio.purchasePrice === 0 ? (
                  <Badge tone="sand">Contingency</Badge>
                ) : (
                  <Badge tone="teal">{cents(row.costBasis)} basis</Badge>
                )}
                {row.portfolio.mediaComplete ? (
                  <Badge tone="sage">Media complete</Badge>
                ) : (
                  <Badge tone="coral">Media gaps</Badge>
                )}
                <Badge tone="sand">Putback to {row.portfolio.putbackUntil}</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-serif text-2xl">{pct(row.liquidationPct, 2)} liquidated</span>
                  <span className="text-cove-mute">
                    {money(row.collected)} of {money(row.faceValue)}
                  </span>
                </div>
                <div className="mt-2">
                  <RecoveryRail row={row} />
                </div>
                <div className="mt-4">
                  <DispositionBar row={row} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-cove-sand">Cost</div>
                  <div className="font-semibold">{money(row.cost)}</div>
                </div>
                <div>
                  <div className="text-xs text-cove-sand">Net multiple</div>
                  <div className={row.netMultiple >= 1 ? "font-semibold text-cove-sage" : "font-semibold"}>
                    {row.netMultiple.toFixed(2)}x
                  </div>
                </div>
                <div>
                  <div className="text-xs text-cove-sand">Accounts</div>
                  <div className="font-semibold">{row.accounts.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-cove-sand">In plans</div>
                  <div className="font-semibold">{money(row.pendingPlanDollars)}</div>
                </div>
                <div>
                  <div className="text-xs text-cove-sand">Next 30 days</div>
                  <div className="font-semibold">{money(row.scheduled30)}</div>
                </div>
                <div>
                  <div className="text-xs text-cove-sand">Open balance</div>
                  <div className="font-semibold">{money(row.openBalance)}</div>
                </div>
              </div>
            </div>

            {row.portfolio.notes ? (
              <p className="mt-4 border-t border-parchment-200 pt-3 text-sm text-cove-mute">{row.portfolio.notes}</p>
            ) : null}
          </Card>
        ))}
      </div>
    </div>
  );
}
