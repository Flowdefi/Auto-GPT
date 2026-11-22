import type { WorkspaceId } from "@/lib/types";
import type { ScrubEvent } from "@/lib/collections/launch";
import { loadDb, mutate, nextId } from "@/server/db";
import type { FetchLike } from "./providers";

function vendorOn(flag: string, urlFlag: string): boolean {
  return process.env[flag] === "vendor" && process.env.MERIDIAN_CHANNEL_DELIVER === "live" && Boolean(process.env[urlFlag]);
}

export function bankruptcyLive(): boolean {
  return vendorOn("MERIDIAN_BANKRUPTCY_PROVIDER", "MERIDIAN_BANKRUPTCY_API_URL");
}

export function deceasedLive(): boolean {
  return vendorOn("MERIDIAN_DECEASED_PROVIDER", "MERIDIAN_DECEASED_API_URL");
}

async function askVendor(url: string, key: string | undefined, body: Record<string, string>, fetchImpl: FetchLike): Promise<"hit" | "no_hit" | "unknown"> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!response.ok) return "unknown";
  const payload = (await response.json()) as { status?: string };
  if (payload.status === "hit" || payload.status === "no_hit") return payload.status;
  return "unknown";
}

export async function runScrub(
  workspaceId: WorkspaceId,
  accountId: string,
  kind: "bankruptcy" | "deceased",
  fetchImpl: FetchLike = fetch,
): Promise<ScrubEvent> {
  const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === accountId && item.workspaceId === workspaceId);
  if (!account) throw new Error("Account not found");
  const live = kind === "bankruptcy" ? bankruptcyLive() : deceasedLive();
  let status: ScrubEvent["status"] = "unknown";
  let source: ScrubEvent["source"] = "sandbox";
  if (live) {
    source = "vendor";
    const url = kind === "bankruptcy" ? process.env.MERIDIAN_BANKRUPTCY_API_URL ?? "" : process.env.MERIDIAN_DECEASED_API_URL ?? "";
    const key = kind === "bankruptcy" ? process.env.MERIDIAN_BANKRUPTCY_API_KEY : process.env.MERIDIAN_DECEASED_API_KEY;
    status = await askVendor(url, key, { accountRef: account.accountRef, state: account.state }, fetchImpl);
  }
  return recordScrubResult({ workspaceId, accountId, kind, status, source });
}

export function recordScrubResult(input: { workspaceId: WorkspaceId; accountId: string; kind: ScrubEvent["kind"]; status: ScrubEvent["status"]; source: ScrubEvent["source"] }): ScrubEvent {
  const event: ScrubEvent = { id: nextId("scrub"), ...input, at: new Date().toISOString() };
  mutate((db) => {
    db.scrubEvents = [event, ...(db.scrubEvents ?? [])].slice(0, 1000);
    if (input.status === "hit") {
      const nextStatus = input.kind === "bankruptcy" ? "bankruptcy" as const : "deceased" as const;
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === input.accountId ? { ...item, status: nextStatus } : item));
    }
  });
  return event;
}

export function scrubHistory(workspaceId: WorkspaceId, accountId?: string): ScrubEvent[] {
  return (loadDb().scrubEvents ?? [])
    .filter((event) => event.workspaceId === workspaceId && (!accountId || event.accountId === accountId))
    .slice(0, 100);
}
