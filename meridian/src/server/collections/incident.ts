import type { WorkspaceId } from "@/lib/types";
import type { TabletopRun } from "@/lib/collections/launch";
import { loadDb, mutate, nextId } from "@/server/db";
import { hangupActiveCalls } from "./voice-live";
import type { FetchLike } from "./providers";

export const TABLETOP_ITEMS = [
  "Name the incident lead and the Qualified Individual",
  "Freeze outbound voice, SMS, email, and letters",
  "Preserve logs without copying consumer files into chat or email",
  "Identify which workspaces and vendors had access",
  "Draft the notice counsel will review before anyone is told",
  "Record the time the freeze started and who ordered it",
] as const;

export function workspaceFrozen(workspaceId: WorkspaceId): boolean {
  return (loadDb().frozenWorkspaces ?? []).includes(workspaceId);
}

export function liftOutboundFreeze(workspaceId: WorkspaceId): { frozen: false } {
  mutate((db) => {
    db.frozenWorkspaces = (db.frozenWorkspaces ?? []).filter((id) => id !== workspaceId);
  });
  return { frozen: false };
}

export async function freezeOutbound(workspaceId: WorkspaceId, fetchImpl?: FetchLike): Promise<{ frozen: true; hungUp: number }> {
  mutate((db) => {
    const current = new Set(db.frozenWorkspaces ?? []);
    current.add(workspaceId);
    db.frozenWorkspaces = [...current];
  });
  const hungUp = await hangupActiveCalls(fetchImpl, workspaceId);
  return { frozen: true, hungUp };
}

export function recordTabletop(workspaceId: WorkspaceId, checked: string[]): TabletopRun {
  const allowed = new Set<string>(TABLETOP_ITEMS);
  const run: TabletopRun = {
    id: nextId("top"),
    workspaceId,
    at: new Date().toISOString(),
    checked: checked.filter((item) => allowed.has(item)).slice(0, TABLETOP_ITEMS.length),
  };
  mutate((db) => {
    db.tabletopRuns = [run, ...(db.tabletopRuns ?? [])].slice(0, 50);
  });
  return run;
}

export function incidentHome(workspaceId: WorkspaceId) {
  return {
    frozen: workspaceFrozen(workspaceId),
    checklist: TABLETOP_ITEMS,
    runs: (loadDb().tabletopRuns ?? []).filter((run) => run.workspaceId === workspaceId).slice(0, 10),
  };
}
