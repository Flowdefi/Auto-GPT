"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, Title } from "@/components/ui";
import { accountName, cents, money, pct } from "@/lib/format";
import { liquidationFor } from "@/lib/portfolios";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const portfolios = useCove((state) => state.portfolios);
  const accounts = useCove((state) => state.accounts);
  const plans = useCove((state) => state.plans);
  const payments = useCove((state) => state.payments);
  const setDisposition = useCove((state) => state.setDisposition);

  const portfolio = portfolios.find((item) => item.id === params.id);
  if (!portfolio) return <Title title="Portfolio not found" />;

  const row = liquidationFor(portfolio, accounts, plans);
  const mine = accounts.filter((account) => account.portfolioId === portfolio.id);
  const ids = new Set(mine.map((account) => account.id));
  const receipts = payments.filter((payment) => ids.has(payment.accountId));

  return (
    <div>
      <Title
        kicker={`${portfolio.seller} · ${portfolio.assetClass}`}
        title={portfolio.name}
        sub={portfolio.notes}
        actions={
          <Link href="/portfolios" className="self-center text-sm text-cove-mute hover:underline">
            All portfolios
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Liquidated</div>
          <div className="font-serif text-3xl">{pct(row.liquidationPct, 2)}</div>
          <div className="text-xs text-cove-mute">{money(row.collected)} collected</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Cost</div>
          <div className="font-serif text-3xl">{money(row.cost)}</div>
          <div className="text-xs text-cove-mute">{cents(row.costBasis)} on the dollar</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Net multiple</div>
          <div className="font-serif text-3xl">{row.netMultiple.toFixed(2)}x</div>
          <div className="text-xs text-cove-mute">Break-even {pct(row.breakEvenPct, 2)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">In plans</div>
          <div className="font-serif text-3xl">{money(row.pendingPlanDollars)}</div>
          <div className="text-xs text-cove-mute">{row.pendingPlanCount} active</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-cove-sand">Accounts</div>
          <div className="font-serif text-3xl">{row.accounts.toLocaleString()}</div>
          <div className="text-xs text-cove-mute">{row.contactable} contactable</div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <div className="mb-3 font-semibold">Accounts in this portfolio</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-cove-sand">
                <tr>
                  <th className="pb-2">Consumer</th>
                  <th className="pb-2">State</th>
                  <th className="pb-2 text-right">Balance</th>
                  <th className="pb-2 text-right">Collected</th>
                  <th className="pb-2">Disposition</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((account) => (
                  <tr key={account.id} className="border-t border-parchment-200">
                    <td className="py-2">
                      <Link href={`/accounts/${account.id}`} className="font-medium hover:underline">
                        {accountName(account.firstName, account.lastName)}
                      </Link>
                    </td>
                    <td className="py-2">
                      {account.state}
                      {canDialState(account.state) ? null : <span className="ml-1 text-cove-coral">gated</span>}
                    </td>
                    <td className="py-2 text-right">{money(account.balance)}</td>
                    <td className="py-2 text-right">{money(account.collected)}</td>
                    <td className="py-2">
                      <select
                        value={account.disposition}
                        onChange={(event) =>
                          setDisposition(account.id, event.target.value as typeof account.disposition)
                        }
                        className="rounded-xl border border-parchment-200 bg-parchment-50 px-2 py-1 text-xs"
                      >
                        {[
                          "active",
                          "paid",
                          "settled",
                          "bankrupt",
                          "deceased",
                          "refusal",
                          "unable_to_locate",
                          "disputed",
                          "recalled",
                        ].map((option) => (
                          <option key={option} value={option}>
                            {option.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mine.length === 0 ? (
            <p className="text-sm text-cove-mute">
              No accounts loaded for this tape yet. Face and count come from the seller&apos;s stratification.
            </p>
          ) : null}
        </Card>

        <div className="space-y-3">
          <Card className="p-4 text-sm">
            <div className="font-semibold">Purchase</div>
            <div className="mt-2 space-y-1 text-cove-mute">
              <div>Face {money(portfolio.faceValue)}</div>
              <div>Paid {money(portfolio.purchasePrice)}</div>
              <div>Accounts {portfolio.accountCount.toLocaleString()}</div>
              <div>Bought {portfolio.purchasedAt}</div>
              <div>Putback until {portfolio.putbackUntil}</div>
            </div>
            <div className="mt-3">
              {portfolio.mediaComplete ? (
                <Badge tone="sage">Media complete</Badge>
              ) : (
                <Badge tone="coral">Media gaps — putback candidates</Badge>
              )}
            </div>
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">Status mix</div>
            {row.dispositions.map((slice) => (
              <div key={slice.key} className="mt-2 flex items-center justify-between">
                <span>{slice.label}</span>
                <span className="text-cove-mute">
                  {slice.count} · {pct(slice.share, 0)}
                </span>
              </div>
            ))}
          </Card>

          <Card className="p-4 text-sm">
            <div className="font-semibold">Receipts</div>
            {receipts.length === 0 ? <p className="mt-2 text-cove-mute">No payments yet.</p> : null}
            {receipts.map((payment) => (
              <div key={payment.id} className="mt-2 flex items-center justify-between">
                <span>
                  {money(payment.amount)} {payment.method} •{payment.last4}
                </span>
                <span className="text-cove-mute">{payment.channel}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
