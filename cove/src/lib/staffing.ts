import type { AccessGrant, Agent, CallReview, Payment, TimelineEvent } from "./types";

export function grantActive(grant: AccessGrant, at = Date.now()): boolean {
  if (grant.revokedAt) return false;
  return at >= new Date(grant.startsAt).getTime() && at < new Date(grant.expiresAt).getTime();
}

export function minutesLeft(grant: AccessGrant, at = Date.now()): number {
  return Math.max(0, Math.round((new Date(grant.expiresAt).getTime() - at) / 60000));
}

/**
 * Account ids a collector may open right now. Floor leads and compliance see
 * everything; everyone else only sees what an unexpired grant hands them.
 */
export function visibleAccountIds(
  agent: Agent | undefined,
  grants: AccessGrant[],
  at = Date.now(),
): Set<string> | null {
  if (!agent) return new Set();
  if (agent.role === "Floor lead" || agent.role === "Compliance") return null;
  const ids = new Set<string>();
  for (const grant of grants) {
    if (grant.agentId !== agent.id || !grantActive(grant, at)) continue;
    for (const accountId of grant.accountIds) ids.add(accountId);
  }
  return ids;
}

export function canOpenAccount(
  agent: Agent | undefined,
  accountId: string,
  grants: AccessGrant[],
  at = Date.now(),
): boolean {
  const allowed = visibleAccountIds(agent, grants, at);
  return allowed === null || allowed.has(accountId);
}

export function leasedCount(agentId: string, grants: AccessGrant[], at = Date.now()): number {
  const ids = new Set<string>();
  for (const grant of grants) {
    if (grant.agentId !== agentId || !grantActive(grant, at)) continue;
    for (const accountId of grant.accountIds) ids.add(accountId);
  }
  return ids.size;
}

export interface AgentPerformance {
  agent: Agent;
  leased: number;
  calls: number;
  rightParty: number;
  rpcRate: number;
  promises: number;
  collected: number;
  perCall: number;
  qaScore: number;
  criticalFindings: number;
  /** Collected minus hourly burn and commission. Negative means the seat loses money. */
  margin: number;
  hoursToday: number;
}

/**
 * Longest shift we will bill to a seat. Collectors forget to clock out, and an
 * open clock-in would otherwise accrue labor cost forever and bury a good
 * collector's margin under hours nobody worked.
 */
const MAX_SHIFT_HOURS = 16;

/**
 * Hours worked *today*, not hours since the clock-in timestamp. Counts from the
 * later of the clock-in and midnight, then caps at one shift.
 */
function hoursToday(iso: string | undefined, at = Date.now()): number {
  if (!iso) return 0;
  const clockedIn = new Date(iso).getTime();
  if (Number.isNaN(clockedIn)) return 0;
  const midnight = new Date(at).setHours(0, 0, 0, 0);
  const from = Math.max(clockedIn, midnight);
  const elapsed = (at - from) / 3.6e6;
  return Math.min(MAX_SHIFT_HOURS, Math.max(0, elapsed));
}

export function performanceFor(
  agent: Agent,
  timeline: TimelineEvent[],
  payments: Payment[],
  grants: AccessGrant[],
  reviews: CallReview[],
  at = Date.now(),
): AgentPerformance {
  const mine = timeline.filter((event) => event.actor === agent.name);
  const calls = mine.filter((event) => event.channel === "call" && event.outcome === "connected").length
    + agent.callsToday;
  const rightParty = mine.filter((event) => event.outcome?.includes("RPC")).length;
  const promises = mine.filter((event) => event.outcome === "plan" || event.outcome?.includes("PTP")).length;
  const myAccountIds = new Set(
    grants.filter((grant) => grant.agentId === agent.id).flatMap((grant) => grant.accountIds),
  );
  const collected = payments
    .filter((payment) => myAccountIds.has(payment.accountId) && payment.status === "approved")
    .reduce((sum, payment) => sum + payment.amount, 0) + agent.collectedToday;
  const myReviews = reviews.filter((review) => review.agentId === agent.id);
  const criticalFindings = myReviews.reduce(
    (sum, review) => sum + review.findings.filter((finding) => finding.severity === "critical").length,
    0,
  );
  const qaScore = myReviews.length
    ? Math.round(myReviews.reduce((sum, review) => sum + review.score, 0) / myReviews.length)
    : agent.qaScore;
  const hours = hoursToday(agent.clockedInAt, at);
  const laborCost = hours * agent.hourlyCost + collected * (agent.commissionPct / 100);

  return {
    agent,
    leased: leasedCount(agent.id, grants, at),
    calls,
    rightParty,
    rpcRate: calls ? rightParty / calls : 0,
    promises,
    collected,
    perCall: calls ? collected / calls : 0,
    qaScore,
    criticalFindings,
    margin: collected - laborCost,
    hoursToday: hours,
  };
}
