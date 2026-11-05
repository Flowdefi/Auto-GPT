import { mergeBrand, type AgencyBrand } from "@/lib/brand";
import type { CollectionsRole } from "@/lib/collections/types";
import { loadDb, mutate } from "@/server/db";
import type { WorkspaceId } from "@/server/models";

/** Public site brand. Env wins. A saved Triton brand fills the gaps. */
export function currentBrand(): AgencyBrand {
  return mergeBrand(loadDb().agencyBrand ?? null);
}

/** Letters, notices, and the desk for one workspace. Aether does not inherit Triton's saved name. */
export function brandFor(workspaceId: WorkspaceId): AgencyBrand {
  const db = loadDb();
  const scoped = db.agencyBrands?.[workspaceId];
  if (scoped) return mergeBrand(scoped);
  if (workspaceId === "triton") return currentBrand();
  return mergeBrand(null);
}

export function saveBrand(input: Partial<AgencyBrand>, role: CollectionsRole, workspaceId: WorkspaceId = "triton"): AgencyBrand {
  if (role !== "admin") throw new Error("Only an admin can change the agency brand");
  const db = loadDb();
  const prior = db.agencyBrands?.[workspaceId] ?? (workspaceId === "triton" ? db.agencyBrand : null);
  const next = mergeBrand({ ...prior, ...input });
  mutate((state) => {
    state.agencyBrands = { ...(state.agencyBrands ?? {}), [workspaceId]: next };
    if (workspaceId === "triton") state.agencyBrand = next;
  });
  return next;
}
