import type { WorkspaceId } from "@/lib/types";
import { upsertContact, findContactByEmail, findCompanyByDomain, domainOf } from "./crm";
import { loadDb, mutate, nextId } from "./db";
import type { DeskActivity, DeskActivityType, Lead } from "./models";

export { activityLabel, isDeskActivityType } from "@/lib/desk-activity";

export interface ActivityInput {
  workspaceId: WorkspaceId;
  contactEmail: string;
  contactName?: string;
  company?: string;
  type: DeskActivityType;
  subject: string;
  body?: string;
  outlookMessageId?: string;
  outlookConversationId?: string;
  link?: string;
  occurredAt?: string;
  source: DeskActivity["source"];
}

export interface ActivityResult {
  activity: DeskActivity;
  duplicate: boolean;
  contactId: string;
  companyId?: string;
  leadId?: string;
  createdContact: boolean;
  doNotEmail: boolean;
}

function splitName(value: string | undefined): { firstName?: string; lastName?: string } {
  const trimmed = value?.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName: lastName || undefined };
}

function ensureLead(workspaceId: WorkspaceId, contactId: string, companyId: string, source: string): string {
  const existing = loadDb().leads.find(
    (lead) => lead.workspaceId === workspaceId && lead.contactId === contactId && lead.status !== "rejected",
  );
  if (existing) return existing.id;
  const now = new Date().toISOString();
  const lead: Lead = {
    id: nextId("ld"),
    workspaceId,
    contactId,
    companyId,
    side: "unknown",
    status: "new",
    source,
    fitScore: 0,
    intentScore: 0,
    score: 0,
    band: "nurture",
    slaBreached: false,
    notes: "",
    payload: {},
    createdAt: now,
    updatedAt: now,
  };
  mutate((db) => {
    if (!db.leads.some((row) => row.id === lead.id)) db.leads.push(lead);
  });
  return lead.id;
}

export function recordActivity(input: ActivityInput): ActivityResult {
  const email = input.contactEmail.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("contactEmail is required");
  const subject = input.subject.trim();
  if (!subject) throw new Error("subject is required");
  const prior = findContactByEmail(input.workspaceId, email);
  const priorDoNotEmail = prior?.doNotEmail === true;
  const names = splitName(input.contactName);
  const saved = upsertContact({
    workspaceId: input.workspaceId,
    email,
    firstName: names.firstName,
    lastName: names.lastName,
    companyName: input.company,
  });
  if (prior && saved.contact.doNotEmail !== priorDoNotEmail) {
    mutate((db) => {
      const row = db.contacts.find((contact) => contact.id === saved.contact.id);
      if (row) row.doNotEmail = priorDoNotEmail;
    });
    saved.contact.doNotEmail = priorDoNotEmail;
  }
  const leadId = ensureLead(input.workspaceId, saved.contact.id, saved.company.id, input.source);
  const at = input.occurredAt && !Number.isNaN(Date.parse(input.occurredAt)) ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
  const outlookMessageId = input.outlookMessageId?.trim() || undefined;

  const stored = mutate((db) => {
    const existing = outlookMessageId
      ? (db.crmActivities ?? []).find(
          (row) =>
            row.workspaceId === input.workspaceId &&
            row.outlookMessageId === outlookMessageId &&
            row.type === input.type,
        )
      : undefined;
    if (existing) return { activity: existing, duplicate: true };
    const activity: DeskActivity = {
      id: nextId("act"),
      workspaceId: input.workspaceId,
      type: input.type,
      subject: subject.slice(0, 300),
      body: (input.body ?? "").slice(0, 8000),
      at,
      contactId: saved.contact.id,
      companyId: saved.company.id,
      leadId,
      outlookMessageId,
      outlookConversationId: input.outlookConversationId?.trim() || undefined,
      link: input.link?.trim() || undefined,
      source: input.source,
    };
    db.crmActivities = [activity, ...(db.crmActivities ?? [])].slice(0, 5000);
    const contact = db.contacts.find((row) => row.id === saved.contact.id);
    if (contact) contact.lastActivityAt = at;
    return { activity, duplicate: false };
  });

  return {
    activity: stored.activity,
    duplicate: stored.duplicate,
    contactId: saved.contact.id,
    companyId: saved.company.id,
    leadId,
    createdContact: saved.createdContact,
    doNotEmail: saved.contact.doNotEmail === true,
  };
}

/** Timeline row for a contact that already exists. Does not create contacts or change doNotEmail. */
export function appendLinkedActivity(input: {
  workspaceId: WorkspaceId;
  contactId: string;
  companyId?: string;
  type: DeskActivityType;
  subject: string;
  body?: string;
  outlookMessageId?: string;
  outlookConversationId?: string;
  link?: string;
  occurredAt?: string;
  source: DeskActivity["source"];
}): { activity: DeskActivity; duplicate: boolean } {
  const outlookMessageId = input.outlookMessageId?.trim() || undefined;
  const at = input.occurredAt && !Number.isNaN(Date.parse(input.occurredAt)) ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
  return mutate((db) => {
    const existing = outlookMessageId
      ? (db.crmActivities ?? []).find(
          (row) =>
            row.workspaceId === input.workspaceId &&
            row.outlookMessageId === outlookMessageId &&
            row.type === input.type,
        )
      : undefined;
    if (existing) return { activity: existing, duplicate: true };
    const activity: DeskActivity = {
      id: nextId("act"),
      workspaceId: input.workspaceId,
      type: input.type,
      subject: input.subject.slice(0, 300),
      body: (input.body ?? "").slice(0, 8000),
      at,
      contactId: input.contactId,
      companyId: input.companyId,
      outlookMessageId,
      outlookConversationId: input.outlookConversationId,
      link: input.link,
      source: input.source,
    };
    db.crmActivities = [activity, ...(db.crmActivities ?? [])].slice(0, 5000);
    const contact = db.contacts.find((row) => row.id === input.contactId);
    if (contact) contact.lastActivityAt = at;
    return { activity, duplicate: false };
  });
}

export function listActivities(workspaceId: WorkspaceId, filter: { contactId?: string; companyId?: string }): DeskActivity[] {
  return (loadDb().crmActivities ?? []).filter((row) => {
    if (row.workspaceId !== workspaceId) return false;
    if (filter.contactId && row.contactId !== filter.contactId) return false;
    if (filter.companyId && row.companyId !== filter.companyId) return false;
    return true;
  });
}

export function lookupContact(email: string, workspaceId?: WorkspaceId) {
  const target = email.trim().toLowerCase();
  const workspaces: WorkspaceId[] = workspaceId ? [workspaceId] : ["triton", "aether"];
  for (const id of workspaces) {
    const contact = findContactByEmail(id, target);
    if (!contact) continue;
    const company =
      loadDb().companies.find((row) => row.id === contact.companyId) ??
      findCompanyByDomain(id, domainOf(target));
    const lead = loadDb().leads.find((row) => row.workspaceId === id && row.contactId === contact.id);
    return { workspaceId: id, contact, company: company ?? null, lead: lead ?? null };
  }
  return null;
}
