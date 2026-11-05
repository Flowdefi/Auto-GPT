import { mergeBrand, type AgencyBrand } from "@/lib/brand";
import type { CollectionsRole } from "@/lib/collections/types";
import { loadDb, mutate } from "@/server/db";

export function currentBrand(): AgencyBrand {
  return mergeBrand(loadDb().agencyBrand ?? null);
}

export function saveBrand(input: Partial<AgencyBrand>, role: CollectionsRole): AgencyBrand {
  if (role !== "admin") throw new Error("Only an admin can change the agency brand");
  const next = mergeBrand({ ...loadDb().agencyBrand, ...input });
  mutate((db) => {
    db.agencyBrand = next;
  });
  return next;
}
