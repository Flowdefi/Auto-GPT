import { createHash } from "node:crypto";
import type { Activity, ActivityType, Contact, WorkspaceId } from "@/lib/types";
import { parseActivityKind, shouldCreateContact, type ActivityKind } from "./activity-kinds";
import { listContacts, readCrmJson, readCrmOne, saveContact, writeCrmBlobs } from "./crm-store";
import { nextId } from "./db";
import { emailBlockReason } from "./email-block";

export interface LogActivityInput {
  workspaceId: WorkspaceId;
  kind?: unknown;
  subject?: string;
  body?: string;
  at?: string;
  email?: string;
  contactId?: string;
  companyId?: string;
  dealId?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
  source?: string;
  userId?: string;
  /** Defaults to true. Suppressed addresses are never created. */
  allowCreate?: boolean;
}

export interface LogActivityResult {
  activity: Activity;
  contact: Contact | null;
  companyId?: string;
  createdContact: boolean;
  suppressed: boolean;
}

function activityType(kind: ActivityKind): ActivityType {
  switch (kind) {
    case "inbound":
    case "outbound":
    case "draft":
    case "nda":
      return "email";
    case "note":
      return "note";
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

function defaultSubject(kind: ActivityKind): string {
  switch (kind) {
    case "inbound":
      return "Inbound email";
    case "outbound":
      return "Outbound email";
    case "draft":
      return "Draft email";
    case "nda":
      return "NDA";
    case "note":
      return "Note";
    default: {
      const neverKind: never = kind;
      return neverKind;
    }
  }
}

function namesFromEmail(email: string): { firstName: string; lastName: string } {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const title = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  if (parts.length >= 2) {
    return { firstName: title(parts[0] ?? "Contact"), lastName: parts.slice(1).map(title).join(" ") };
  }
  return { firstName: title(local || "Contact"), lastName: "" };
}

function activityId(externalId?: string): string {
  if (!externalId) return nextId("act");
  return `act_${createHash("sha256").update(externalId).digest("hex").slice(0, 20)}`;
}

function asActivity(row: Record<string, unknown>): Activity | null {
  if (typeof row.id !== "string" || typeof row.subject !== "string") return null;
  const type = row.type;
  if (type !== "note" && type !== "email" && type !== "call" && type !== "meeting" && type !== "task" && type !== "sms" && type !== "ai" && type !== "system") {
    return null;
  }
  return {
    id: row.id,
    type,
    subject: row.subject,
    body: typeof row.body === "string" ? row.body : "",
    at: typeof row.at === "string" ? row.at : "",
    userId: typeof row.userId === "string" ? row.userId : "system",
    contactId: typeof row.contactId === "string" ? row.contactId : undefined,
    companyId: typeof row.companyId === "string" ? row.companyId : undefined,
    dealId: typeof row.dealId === "string" ? row.dealId : undefined,
    ticketId: typeof row.ticketId === "string" ? row.ticketId : undefined,
    channel: parseActivityKind(row.channel) ?? undefined,
    externalId: typeof row.externalId === "string" ? row.externalId : undefined,
    email: typeof row.email === "string" ? row.email : undefined,
    source: typeof row.source === "string" ? row.source : undefined,
  };
}

export function listActivities(
  workspaceId: WorkspaceId,
  filter: { contactId?: string; companyId?: string; dealId?: string; email?: string; limit?: number } = {},
): Activity[] {
  const email = filter.email?.trim().toLowerCase();
  const limit = filter.limit ?? 300;
  return readCrmJson(workspaceId, "activities")
    .flatMap((row) => {
      const activity = asActivity(row);
      return activity ? [activity] : [];
    })
    .filter((activity) => {
      if (filter.contactId && activity.contactId !== filter.contactId) return false;
      if (filter.companyId && activity.companyId !== filter.companyId) return false;
      if (filter.dealId && activity.dealId !== filter.dealId) return false;
      if (email && activity.email?.toLowerCase() !== email) return false;
      return true;
    })
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, limit);
}

export function logActivity(input: LogActivityInput): LogActivityResult {
  const kind = parseActivityKind(input.kind);
  if (!kind) throw new Error("kind must be inbound, outbound, draft, nda, or note");
  const email = input.email?.trim().toLowerCase() ?? "";
  if (email && !email.includes("@")) throw new Error("email is not valid");
  const contactId = input.contactId?.trim() ?? "";
  const companyIdInput = input.companyId?.trim() ?? "";
  if (!email && !contactId && !companyIdInput) {
    throw new Error("email, contactId, or companyId is required");
  }
  const subject = (input.subject?.trim() || defaultSubject(kind)).slice(0, 300);
  const body = (input.body ?? "").trim().slice(0, 4000);

  const atDate = input.at ? new Date(input.at) : new Date();
  const at = Number.isNaN(atDate.getTime()) ? new Date().toISOString() : atDate.toISOString();
  const contacts = listContacts(input.workspaceId);
  let contact = contactId ? contacts.find((row) => row.id === contactId) ?? null : null;
  if (!contact && email) {
    contact = contacts.find((row) => row.email.toLowerCase() === email) ?? null;
  }
  const blocked = email ? emailBlockReason(input.workspaceId, email) !== null : false;
  let createdContact = false;
  if (
    shouldCreateContact({
      exists: Boolean(contact),
      suppressed: blocked,
      allowCreate: input.allowCreate !== false && Boolean(email),
    })
  ) {
    const names = namesFromEmail(email);
    contact = saveContact(
      input.workspaceId,
      {
        email,
        firstName: input.firstName?.trim() || names.firstName,
        lastName: input.lastName?.trim() || names.lastName,
        companyId: companyIdInput,
        source: input.source || "api",
        lifecycle: "lead",
        lastActivityAt: at,
      },
      { retainSuppressions: true },
    );
    createdContact = true;
  } else if (contact && (blocked || kind === "nda" || contact.lastActivityAt !== at)) {
    const ndaSigned = kind === "nda" && !contact.ndaSigned ? at.slice(0, 10) : contact.ndaSigned;
    contact = saveContact(
      input.workspaceId,
      {
        ...contact,
        doNotEmail: contact.doNotEmail === true || blocked,
        ndaSigned,
        lastActivityAt: at,
      },
      { retainSuppressions: true },
    );
  }

  const companyId = companyIdInput || contact?.companyId || undefined;
  const externalId = input.externalId?.trim() || undefined;
  const id = activityId(externalId);
  const previous = asActivity(readCrmOne(input.workspaceId, "activities", id) ?? {});
  const activity: Activity = {
    id,
    type: activityType(kind),
    subject,
    body,
    at,
    userId: input.userId || previous?.userId || "system",
    contactId: contact?.id,
    companyId,
    dealId: input.dealId?.trim() || previous?.dealId,
    channel: kind,
    externalId,
    email: email || contact?.email || undefined,
    source: input.source || previous?.source || "api",
  };
  writeCrmBlobs(input.workspaceId, "activities", [
    {
      id: activity.id,
      label: activity.subject,
      json: JSON.stringify(activity),
    },
  ]);
  return {
    activity,
    contact,
    companyId: companyId || undefined,
    createdContact,
    suppressed: blocked && !createdContact,
  };
}
