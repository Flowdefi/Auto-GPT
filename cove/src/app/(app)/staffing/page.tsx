"use client";

import { useMemo, useState } from "react";
import { Badge, Button, Card, Field, Title } from "@/components/ui";
import { accountName, money, pct, when } from "@/lib/format";
import { useCove } from "@/lib/store";
import { canDialState } from "@/lib/states";
import { grantActive, minutesLeft, performanceFor } from "@/lib/staffing";

export default function StaffingPage() {
  const agents = useCove((state) => state.agents);
  const accounts = useCove((state) => state.accounts);
  const portfolios = useCove((state) => state.portfolios);
  const timeline = useCove((state) => state.timeline);
  const payments = useCove((state) => state.payments);
  const grants = useCove((state) => state.grants);
  const reviews = useCove((state) => state.reviews);
  const grantAccess = useCove((state) => state.grantAccess);
  const revokeGrant = useCove((state) => state.revokeGrant);
  const extendGrant = useCove((state) => state.extendGrant);

  const [agentId, setAgentId] = useState("ag_devon");
  const [portfolioId, setPortfolioId] = useState("pf_harborpoint");
  const [hours, setHours] = useState("8");
  const [reason, setReason] = useState("Shift lease");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const collectors = agents.filter((agent) => agent.role === "Collector");
  const pool = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.portfolioId === portfolioId &&
          account.disposition === "active" &&
          canDialState(account.state),
      ),
    [accounts, portfolioId],
  );
  const rows = agents.map((agent) => performanceFor(agent, timeline, payments, grants, reviews));

  return (
    <div>
      <Title
        kicker="Remote staffing"
        title="Collector leasing & performance"
        sub="Hand a 1099 collector a slice of one portfolio for a fixed window. Access closes on its own — nobody keeps the whole book on their screen."
      />

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="space-y-3 p-5">
          <div className="font-semibold">Lease accounts</div>

          <label className="block text-xs text-cove-sand">Collector</label>
          <select
            value={agentId}
            onChange={(event) => setAgentId(event.target.value)}
            className="min-h-11 w-full rounded-2xl border border-parchment-200 bg-parchment-50 px-3 text-sm"
          >
            {collectors.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · {agent.employment.toUpperCase()} · cap {agent.maxAccounts}
              </option>
            ))}
          </select>

          <label className="block text-xs text-cove-sand">Portfolio</label>
          <select
            value={portfolioId}
            onChange={(event) => {
              setPortfolioId(event.target.value);
              setPicked([]);
            }}
            className="min-h-11 w-full rounded-2xl border border-parchment-200 bg-parchment-50 px-3 text-sm"
          >
            {portfolios.map((portfolio) => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-cove-sand">Window (hours)</label>
              <Field value={hours} inputMode="numeric" onChange={(event) => setHours(event.target.value)} />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs text-cove-sand">Reason</label>
              <Field value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-parchment-200 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-cove-sand">
              <span>Workable accounts ({pool.length})</span>
              <button
                type="button"
                className="text-cove-teal"
                onClick={() => setPicked(picked.length === pool.length ? [] : pool.map((item) => item.id))}
              >
                {picked.length === pool.length && pool.length > 0 ? "Clear" : "Select all"}
              </button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {pool.map((account) => (
                <label key={account.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={picked.includes(account.id)}
                    onChange={(event) =>
                      setPicked(
                        event.target.checked
                          ? [...picked, account.id]
                          : picked.filter((value) => value !== account.id),
                      )
                    }
                  />
                  <span className="flex-1">{accountName(account.firstName, account.lastName)}</span>
                  <span className="text-cove-mute">{money(account.balance)}</span>
                </label>
              ))}
              {pool.length === 0 ? (
                <p className="text-sm text-cove-mute">Nothing workable in this portfolio right now.</p>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-cove-coral">{error}</p> : null}
          <Button
            className="w-full"
            onClick={() => {
              const result = grantAccess(agentId, picked, Number(hours) || 8, reason);
              setError(result);
              if (!result) setPicked([]);
            }}
          >
            Grant {picked.length} accounts for {hours}h
          </Button>
        </Card>

        <div className="space-y-3">
          <Card className="p-5">
            <div className="mb-3 font-semibold">Active and recent leases</div>
            <div className="space-y-2">
              {grants.map((grant) => {
                const agent = agents.find((item) => item.id === grant.agentId);
                const live = grantActive(grant);
                return (
                  <div
                    key={grant.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-parchment-200 p-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold">
                        {agent?.name ?? grant.agentId}{" "}
                        {live ? (
                          <Badge tone="sage">{minutesLeft(grant)}m left</Badge>
                        ) : (
                          <Badge tone="sand">{grant.revokedAt ? "revoked" : "expired"}</Badge>
                        )}
                      </div>
                      <div className="text-cove-mute">
                        {grant.accountIds.length} accounts · {grant.reason} · by {grant.grantedBy}
                      </div>
                      <div className="text-xs text-cove-sand">
                        {when(grant.startsAt)} → {when(grant.expiresAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button tone="ghost" className="min-h-9 text-xs" onClick={() => extendGrant(grant.id, 2)}>
                        +2h
                      </Button>
                      <Button
                        tone="coral"
                        className="min-h-9 text-xs"
                        disabled={!live}
                        onClick={() => revokeGrant(grant.id)}
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 font-semibold">Performance</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-cove-sand">
                  <tr>
                    <th className="pb-2">Collector</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2 text-right">Leased</th>
                    <th className="pb-2 text-right">Calls</th>
                    <th className="pb-2 text-right">RPC</th>
                    <th className="pb-2 text-right">Collected</th>
                    <th className="pb-2 text-right">QA</th>
                    <th className="pb-2 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.agent.id} className="border-t border-parchment-200">
                      <td className="py-2">
                        <div className="font-medium">{row.agent.name}</div>
                        <div className="text-xs text-cove-mute">
                          {row.agent.remote ? "Remote" : "On-site"} · {row.agent.location}
                        </div>
                      </td>
                      <td className="py-2">
                        <Badge tone={row.agent.employment === "w2" ? "teal" : "sand"}>
                          {row.agent.employment.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        {row.leased}/{row.agent.maxAccounts}
                      </td>
                      <td className="py-2 text-right">{row.calls}</td>
                      <td className="py-2 text-right">{pct(row.rpcRate, 0)}</td>
                      <td className="py-2 text-right">{money(row.collected)}</td>
                      <td className="py-2 text-right">
                        <span className={row.qaScore < 85 ? "text-cove-coral" : "text-cove-sage"}>{row.qaScore}</span>
                        {row.criticalFindings > 0 ? (
                          <span className="ml-1 text-xs text-cove-coral">({row.criticalFindings})</span>
                        ) : null}
                      </td>
                      <td className={`py-2 text-right ${row.margin >= 0 ? "" : "text-cove-coral"}`}>
                        {money(row.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-cove-mute">
              Margin is collected dollars minus hourly burn and commission. A 1099 seat with no hourly cost only goes
              negative on chargebacks, which is the point of staffing this way early.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
