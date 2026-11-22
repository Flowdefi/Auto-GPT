import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { deleteWorkspaceRecords, markDemoPurged } from "./crm-store";
import { loadDb, mutate } from "./db";
import { CRM_KINDS } from "./sqlite";

const DEMO_LEAD_IDS = ["ld_lena", "ld_omar", "ld_ruth", "ld_sasha", "ld_amira", "ld_theo"] as const;

export interface PurgeDemoResult {
  workspaceId: WorkspaceId;
  dryRun: boolean;
  crmRecords: number;
  contacts: number;
  companies: number;
  leads: number;
}

export function purgeDemoRecords(workspaceId: WorkspaceId, dryRun = false): PurgeDemoResult {
  const data: WorkspaceData = workspaceId === "triton" ? seedTriton() : seedAether();
  const records: Array<{ kind: string; id: string }> = [];
  for (const kind of CRM_KINDS) {
    const rows = data[kind] as Array<{ id: string }>;
    for (const row of rows) records.push({ kind, id: row.id });
  }
  const contactIds = new Set(data.contacts.map((contact) => contact.id));
  const companyIds = new Set(data.companies.map((company) => company.id));
  const leadIds = new Set<string>(DEMO_LEAD_IDS.filter((id) => (workspaceId === "aether" ? id === "ld_theo" : id !== "ld_theo")));

  const current = loadDb();
  const contacts = current.contacts.filter(
    (contact) => contact.workspaceId === workspaceId && contactIds.has(contact.id),
  ).length;
  const companies = current.companies.filter(
    (company) => company.workspaceId === workspaceId && companyIds.has(company.id),
  ).length;
  const leads = current.leads.filter((lead) => lead.workspaceId === workspaceId && leadIds.has(lead.id)).length;
  if (dryRun) {
    return { workspaceId, dryRun, crmRecords: records.length, contacts, companies, leads };
  }

  markDemoPurged(workspaceId);
  const crmRecords = deleteWorkspaceRecords(workspaceId, records);
  mutate((db) => {
    db.contacts = db.contacts.filter((contact) => !(contact.workspaceId === workspaceId && contactIds.has(contact.id)));
    db.companies = db.companies.filter(
      (company) => !(company.workspaceId === workspaceId && companyIds.has(company.id)),
    );
    db.leads = db.leads.filter((lead) => !(lead.workspaceId === workspaceId && leadIds.has(lead.id)));
    const purged = new Set(db.demoPurgedWorkspaces ?? []);
    purged.add(workspaceId);
    db.demoPurgedWorkspaces = [...purged];
  });

  return {
    workspaceId,
    dryRun,
    crmRecords,
    contacts,
    companies,
    leads,
  };
}

export function parsePurgeArgs(argv: string[]): { workspaceId: WorkspaceId; dryRun: boolean } {
  const workspaceFlag = argv.indexOf("--workspace");
  const workspaceId = workspaceFlag >= 0 ? argv[workspaceFlag + 1] : undefined;
  if (!isWorkspaceId(workspaceId)) {
    throw new Error("Usage: npm run purge:demo -- --workspace <triton|aether> [--dry-run]");
  }
  return { workspaceId, dryRun: argv.includes("--dry-run") };
}
