"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, Title } from "@/components/ui";
import { id, money } from "@/lib/format";
import { parsePortfolioCsv, portfolioFromPreview, SAMPLE_CSV } from "@/lib/import";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";

export default function ImportPage() {
  const router = useRouter();
  const importPortfolio = useCove((state) => state.importPortfolio);
  const [csv, setCsv] = useState("");
  const [name, setName] = useState("");
  const [seller, setSeller] = useState("");
  const [assetClass, setAssetClass] = useState("Credit card · charge-off");
  const [price, setPrice] = useState("0");
  const [portfolioId] = useState(() => id("pf"));
  const [done, setDone] = useState<string | null>(null);

  const preview = useMemo(
    () => (csv.trim() ? parsePortfolioCsv(csv, portfolioId) : null),
    [csv, portfolioId],
  );
  const errors = preview?.issues.filter((issue) => issue.level === "error") ?? [];
  const warnings = preview?.issues.filter((issue) => issue.level === "warning") ?? [];
  const basis = preview && preview.faceValue ? Number(price) / preview.faceValue : 0;

  async function onFile(file: File) {
    setCsv(await file.text());
  }

  return (
    <div>
      <Title
        kicker="Portfolio intake"
        title="Import a tape"
        sub="Drop the seller's CSV. Columns are matched by name, gated states are flagged and held, and nothing goes to the dialer until validation is mailed."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-semibold">Account file</div>
            <div className="flex gap-2">
              <Button tone="ghost" className="min-h-9 text-xs" onClick={() => setCsv(SAMPLE_CSV)}>
                Load sample tape
              </Button>
              <label className="inline-flex min-h-9 cursor-pointer items-center rounded-2xl bg-parchment-100 px-4 text-xs font-semibold">
                Choose CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onFile(file);
                  }}
                />
              </label>
            </div>
          </div>
          <textarea
            value={csv}
            onChange={(event) => setCsv(event.target.value)}
            placeholder="first,last,phone,state,balance,creditor…"
            className="mt-3 h-52 w-full rounded-2xl border border-parchment-200 bg-parchment-50 p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-cove-teal"
          />

          {preview ? (
            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold">Column mapping</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(preview.mapping).map(([field, header]) => (
                  <span
                    key={field}
                    className={`rounded-full px-2 py-1 ${
                      header ? "bg-cove-tealSoft text-cove-teal" : "bg-cove-coralSoft text-cove-coral"
                    }`}
                  >
                    {field} → {header ?? "not found"}
                  </span>
                ))}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-cove-sand">
                    <tr>
                      <th className="pb-2">Consumer</th>
                      <th className="pb-2">State</th>
                      <th className="pb-2 text-right">Balance</th>
                      <th className="pb-2">Intake</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.accounts.slice(0, 25).map((account) => (
                      <tr key={account.id} className="border-t border-parchment-200">
                        <td className="py-2">
                          {account.firstName} {account.lastName}
                        </td>
                        <td className="py-2">{account.state}</td>
                        <td className="py-2 text-right">{money(account.balance)}</td>
                        <td className="py-2">
                          {canDialState(account.state) ? (
                            <Badge tone="sage">workable</Badge>
                          ) : (
                            <Badge tone="coral">held — license</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.accounts.length > 25 ? (
                <div className="mt-2 text-xs text-cove-mute">
                  Showing 25 of {preview.accounts.length} rows.
                </div>
              ) : null}
            </div>
          ) : null}
        </Card>

        <div className="space-y-3">
          <Card className="space-y-2 p-4">
            <div className="font-semibold">Portfolio</div>
            <Field value={name} onChange={(event) => setName(event.target.value)} placeholder="Portfolio name" />
            <Field value={seller} onChange={(event) => setSeller(event.target.value)} placeholder="Seller" />
            <Field
              value={assetClass}
              onChange={(event) => setAssetClass(event.target.value)}
              placeholder="Asset class"
            />
            <Field
              value={price}
              inputMode="decimal"
              onChange={(event) => setPrice(event.target.value)}
              placeholder="Purchase price (0 for contingency)"
            />
            {preview ? (
              <div className="pt-1 text-xs text-cove-mute">
                Face {money(preview.faceValue)} · basis {(basis * 100).toFixed(2)}¢ on the dollar ·{" "}
                {preview.accounts.length} accounts
              </div>
            ) : null}
            <Button
              className="w-full"
              disabled={!preview || preview.accounts.length === 0 || errors.length > 0 || !name.trim()}
              onClick={() => {
                if (!preview) return;
                const portfolio = portfolioFromPreview(preview, {
                  id: portfolioId,
                  name: name.trim(),
                  seller: seller.trim() || "Unknown seller",
                  purchasePrice: Number(price) || 0,
                  assetClass,
                });
                importPortfolio(portfolio, preview.accounts);
                setDone(portfolio.id);
              }}
            >
              Import {preview ? `${preview.accounts.length} accounts` : "portfolio"}
            </Button>
            {done ? (
              <Button tone="sage" className="w-full" onClick={() => router.push(`/portfolios/${done}`)}>
                Open liquidation tracker
              </Button>
            ) : null}
          </Card>

          {errors.length > 0 ? (
            <Card className="p-4 text-sm">
              <div className="font-semibold text-cove-coral">Blocking ({errors.length})</div>
              {errors.slice(0, 8).map((issue, index) => (
                <div key={index} className="mt-1 text-cove-mute">
                  Row {issue.row}: {issue.message}
                </div>
              ))}
            </Card>
          ) : null}

          {warnings.length > 0 ? (
            <Card className="p-4 text-sm">
              <div className="font-semibold">Flags ({warnings.length})</div>
              {warnings.slice(0, 10).map((issue, index) => (
                <div key={index} className="mt-1 text-cove-mute">
                  Row {issue.row}: {issue.message}
                </div>
              ))}
            </Card>
          ) : null}

          <Card className="p-4 text-sm">
            <div className="font-semibold">What intake does</div>
            <ul className="mt-2 space-y-1.5 text-cove-mute">
              <li>Matches columns by header name across common seller formats.</li>
              <li>Rejects unknown states and nameless rows rather than importing junk.</li>
              <li>Holds accounts in licensed states — the dialer refuses them.</li>
              <li>Sets SMS and email consent to false until the seller&apos;s media proves it.</li>
              <li>Marks every account validation-pending and issues a TF Recovery portal code.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
