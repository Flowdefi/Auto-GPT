import { blankCompany, blankContact, isCompanyKind, normalizeCompany, normalizeContact } from "@/lib/debt";
import type { Company, Contact, WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "./db";
import type { CrmCompany, CrmContact, DatabaseFile, SuppressionReason } from "./models";
import { openCrmRecord, sealCrmRecord } from "./at-rest";
import { sqliteAll, sqliteExec, sqliteGet, sqliteRun } from "./sqlite";

export interface SuppressionEdit {
  add: SuppressionReason[];
  remove: SuppressionReason[];
}

export function suppressionEdits(
  existing: Array<{ email: string; reason: SuppressionReason }>,
  contact: Contact,
  options?: { retainExisting?: boolean },
): SuppressionEdit {
  const email = contact.email.trim().toLowerCase();
  const add: SuppressionReason[] = [];
  const remove: SuppressionReason[] = [];
  if (!email) return { add, remove };
  const has = (reason: SuppressionReason) =>
    existing.some((row) => row.email.toLowerCase() === email && row.reason === reason);
  if (contact.doNotEmail && !has("do_not_email")) add.push("do_not_email");
  if (!options?.retainExisting && !contact.doNotEmail && has("do_not_email")) remove.push("do_not_email");
  if (contact.emailStatus === "invalid" && !has("invalid_email")) add.push("invalid_email");
  if (!options?.retainExisting && contact.emailStatus !== "invalid" && has("invalid_email")) {
    remove.push("invalid_email");
  }
  if (contact.emailStatus === "bounced" && !has("bounce")) add.push("bounce");
  return { add, remove };
}

export function reconcileContactSuppression(
  db: DatabaseFile,
  workspaceId: WorkspaceId,
  contact: Contact,
  at = new Date().toISOString(),
  options?: { retainExisting?: boolean },
): void {
  const email = contact.email.trim().toLowerCase();
  if (!email) return;
  const edits = suppressionEdits(db.suppressions, contact, options);
  for (const reason of edits.remove) {
    const index = db.suppressions.findIndex(
      (row) => row.workspaceId === workspaceId && row.email.toLowerCase() === email && row.reason === reason,
    );
    if (index >= 0) db.suppressions.splice(index, 1);
  }
  for (const reason of edits.add) {
    db.suppressions.push({ id: nextId("sup"), workspaceId, email, reason, at });
  }
}

export function contactToCrm(workspaceId: WorkspaceId, contact: Contact, previous?: CrmContact): CrmContact {
  return {
    enrichedAt: previous?.enrichedAt,
    enrichment: previous?.enrichment,
    ...contact,
    id: contact.id,
    workspaceId,
    email: contact.email.toLowerCase(),
    doNotEmail: contact.doNotEmail === true,
    createdAt: previous?.createdAt ?? contact.createdAt ?? new Date().toISOString(),
    lastActivityAt: contact.lastActivityAt || previous?.lastActivityAt || new Date().toISOString(),
  };
}

export function companyToCrm(workspaceId: WorkspaceId, company: Company, previous?: CrmCompany): CrmCompany {
  return {
    enrichedAt: previous?.enrichedAt,
    enrichment: previous?.enrichment,
    ...company,
    id: company.id,
    workspaceId,
    type: company.type,
    createdAt: previous?.createdAt ?? new Date().toISOString(),
  };
}

export function crmToContact(row: CrmContact): Contact {
  return normalizeContact({
    ...blankContact(),
    ...(row as Partial<Contact>),
    id: row.id,
    lifecycle: normalizeLifecycleSafe(row.lifecycle),
    tags: row.tags ?? [],
  });
}

export function crmToCompany(row: CrmCompany): Company {
  return normalizeCompany({
    ...blankCompany(),
    ...(row as Partial<Company>),
    id: row.id,
    type: isCompanyKind(row.type) ? row.type : "other",
    lifecycle: normalizeLifecycleSafe(row.lifecycle),
    debtRoles: row.debtRoles ?? [],
  });
}

function normalizeLifecycleSafe(value: string): Contact["lifecycle"] {
  const allowed = ["subscriber", "lead", "mql", "sql", "opportunity", "customer", "evangelist"] as const;
  return allowed.includes(value as Contact["lifecycle"]) ? (value as Contact["lifecycle"]) : "lead";
}

function readRaw(workspaceId: WorkspaceId, kind: "contacts" | "companies"): Array<Record<string, unknown>> | null {
  try {
    return sqliteAll(
      "SELECT json FROM crm_records WHERE workspace_id = ? AND kind = ?",
      workspaceId,
      kind,
    ).flatMap((row) => {
      try {
        const parsed = JSON.parse(String(row.json)) as Record<string, unknown>;
        return parsed && typeof parsed === "object" ? [parsed] : [];
      } catch {
        return [];
      }
    });
  } catch (error) {
    console.warn(`crm_records ${kind} read failed:`, error instanceof Error ? error.message : error);
    return null;
  }
}

export function doNotEmailAddresses(workspaceId: WorkspaceId): Set<string> {
  const emails = new Set<string>();
  for (const contact of loadDb().contacts) {
    if (contact.workspaceId === workspaceId && contact.doNotEmail && contact.email) {
      emails.add(contact.email.toLowerCase());
    }
  }
  for (const row of readRaw(workspaceId, "contacts") ?? []) {
    if (row.doNotEmail === true && typeof row.email === "string" && row.email.trim()) {
      emails.add(row.email.toLowerCase());
    }
  }
  return emails;
}

export function listContacts(workspaceId: WorkspaceId): Contact[] {
  const merged = new Map<string, Contact>();
  for (const row of loadDb().contacts) {
    if (row.workspaceId === workspaceId) merged.set(row.id, crmToContact(row));
  }
  for (const row of readRaw(workspaceId, "contacts") ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    const current = merged.get(id);
    merged.set(
      id,
      normalizeContact({
        ...blankContact(),
        ...(current ?? {}),
        ...(row as Partial<Contact>),
        id,
      }),
    );
  }
  return [...merged.values()].sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.email.localeCompare(b.email),
  );
}

export function listCompanies(workspaceId: WorkspaceId): Company[] {
  const merged = new Map<string, Company>();
  for (const row of loadDb().companies) {
    if (row.workspaceId === workspaceId) merged.set(row.id, crmToCompany(row));
  }
  for (const row of readRaw(workspaceId, "companies") ?? []) {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    const current = merged.get(id);
    merged.set(
      id,
      normalizeCompany({
        ...blankCompany(),
        ...(current ?? {}),
        ...(row as Partial<Company>),
        id,
      }),
    );
  }
  return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getContact(workspaceId: WorkspaceId, id: string): Contact | null {
  return listContacts(workspaceId).find((contact) => contact.id === id) ?? null;
}

export function getCompany(workspaceId: WorkspaceId, id: string): Company | null {
  return listCompanies(workspaceId).find((company) => company.id === id) ?? null;
}

export function mergeContact(db: DatabaseFile, workspaceId: WorkspaceId, contact: Contact): void {
  const index = db.contacts.findIndex((row) => row.workspaceId === workspaceId && row.id === contact.id);
  const previous = index >= 0 ? db.contacts[index] : undefined;
  const next = contactToCrm(workspaceId, contact, previous);
  if (index >= 0) db.contacts[index] = next;
  else db.contacts.push(next);
}

export function mergeCompany(db: DatabaseFile, workspaceId: WorkspaceId, company: Company): void {
  const index = db.companies.findIndex((row) => row.workspaceId === workspaceId && row.id === company.id);
  const previous = index >= 0 ? db.companies[index] : undefined;
  const next = companyToCrm(workspaceId, company, previous);
  if (index >= 0) db.companies[index] = next;
  else db.companies.push(next);
}

function contactLabel(contact: Contact): string {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return name || contact.email || contact.id;
}

export function readCrmJson(workspaceId: WorkspaceId, kind: string): Array<Record<string, unknown>> {
  try {
    return sqliteAll(
      "SELECT json FROM crm_records WHERE workspace_id = ? AND kind = ? ORDER BY updated_at DESC",
      workspaceId,
      kind,
    ).flatMap((row) => {
      try {
        const parsed = JSON.parse(String(row.json)) as Record<string, unknown>;
        return parsed && typeof parsed === "object" ? [openCrmRecord(kind, parsed)] : [];
      } catch {
        return [];
      }
    });
  } catch (error) {
    console.warn(`crm_records ${kind} read failed:`, error instanceof Error ? error.message : error);
    return [];
  }
}

export function readCrmOne(workspaceId: WorkspaceId, kind: string, id: string): Record<string, unknown> | null {
  try {
    const row = sqliteGet(
      "SELECT json FROM crm_records WHERE workspace_id = ? AND kind = ? AND id = ?",
      workspaceId,
      kind,
      id,
    );
    if (!row?.json) return null;
    const parsed = JSON.parse(String(row.json)) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? openCrmRecord(kind, parsed) : null;
  } catch {
    return null;
  }
}

export function patchCrmJson(
  workspaceId: WorkspaceId,
  kind: string,
  id: string,
  label: string,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const current = readCrmOne(workspaceId, kind, id) ?? { id };
  const next = { ...current, ...patch, id };
  writeCrmBlobs(workspaceId, kind, [{ id, label, json: JSON.stringify(next) }]);
  return next;
}

export function writeCrmBlobs(
  workspaceId: WorkspaceId,
  kind: string,
  records: Array<{ id: string; label: string; json: string }>,
): void {
  if (records.length === 0) return;
  const now = new Date().toISOString();
  sqliteExec("BEGIN");
  try {
    for (const record of records) {
      sqliteRun(
        `INSERT INTO crm_records (workspace_id, kind, id, label, json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(workspace_id, kind, id) DO UPDATE SET
           label = excluded.label,
           json = excluded.json,
           updated_at = excluded.updated_at`,
        workspaceId,
        kind,
        record.id,
        record.label,
        sealCrmRecord(kind, record.json),
        now,
      );
    }
    sqliteExec("COMMIT");
  } catch (error) {
    try {
      sqliteExec("ROLLBACK");
    } catch {
      /* transaction already closed */
    }
    throw error;
  }
}

export function deleteWorkspaceRecords(workspaceId: WorkspaceId, ids: Array<{ kind: string; id: string }>): number {
  if (ids.length === 0) return 0;
  let removed = 0;
  sqliteExec("BEGIN");
  try {
    for (const record of ids) {
      const result = sqliteRun(
        "DELETE FROM crm_records WHERE workspace_id = ? AND kind = ? AND id = ?",
        workspaceId,
        record.kind,
        record.id,
      );
      removed += result.changes ?? 0;
    }
    sqliteExec("COMMIT");
  } catch (error) {
    try {
      sqliteExec("ROLLBACK");
    } catch {
      /* transaction already closed */
    }
    throw error;
  }
  return removed;
}

export function markDemoPurged(workspaceId: WorkspaceId): void {
  sqliteRun(
    "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    `demo_purged_${workspaceId}`,
    "1",
  );
}

export function saveContact(
  workspaceId: WorkspaceId,
  input: Partial<Contact> & { id?: string },
  options?: { retainSuppressions?: boolean },
): Contact {
  const contact = normalizeContact({ ...blankContact(), ...input, id: input.id?.trim() || nextId("ct") });
  if (!contact.firstName && !contact.lastName && !contact.email) {
    throw new Error("A name or email is required");
  }
  mutate((db) => {
    mergeContact(db, workspaceId, contact);
    reconcileContactSuppression(
      db,
      workspaceId,
      contact,
      new Date().toISOString(),
      options?.retainSuppressions ? { retainExisting: true } : undefined,
    );
  });
  writeCrmBlobs(workspaceId, "contacts", [
    { id: contact.id, label: contactLabel(contact), json: JSON.stringify(contact) },
  ]);
  return contact;
}

export function saveCompany(workspaceId: WorkspaceId, input: Partial<Company> & { id?: string }): Company {
  const company = normalizeCompany({ ...blankCompany(), ...input, id: input.id?.trim() || nextId("co") });
  if (!company.name && !company.domain) {
    throw new Error("A company name or domain is required");
  }
  mutate((db) => {
    mergeCompany(db, workspaceId, company);
  });
  writeCrmBlobs(workspaceId, "companies", [
    { id: company.id, label: company.name || company.domain, json: JSON.stringify(company) },
  ]);
  return company;
}
