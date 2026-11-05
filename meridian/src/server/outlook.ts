import type { WorkspaceId } from "@/lib/types";
import { appendLinkedActivity } from "./activities";
import { domainOf, findCompanyByDomain, findContactByEmail, isFreeMailDomain, upsertContact } from "./crm";
import { loadDb, mutate, nextId } from "./db";
import type { DeskActivityType, InboxMessage, MailboxSyncState } from "./models";
import { resolveProviderSecret } from "./secrets";
import { runAutomations } from "./workflow";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SELECT =
  "id,conversationId,subject,bodyPreview,receivedDateTime,sentDateTime,from,sender,toRecipients,ccRecipients,hasAttachments,isDraft,body,webLink";

export interface OutlookConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailboxes: string[];
}

export function outlookConfig(): OutlookConfig | null {
  const tenantId = resolveProviderSecret("MS_TENANT_ID") ?? process.env.MS_TENANT_ID;
  const clientId = resolveProviderSecret("MS_CLIENT_ID") ?? process.env.MS_CLIENT_ID;
  const clientSecret = resolveProviderSecret("MS_CLIENT_SECRET") ?? process.env.MS_CLIENT_SECRET;
  const mailboxes = (resolveProviderSecret("MS_MAILBOXES") ?? process.env.MS_MAILBOXES ?? "portfolios@debtmarket.net")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!tenantId || !clientId || !clientSecret) return null;
  return { tenantId, clientId, clientSecret, mailboxes };
}

export function outlookStatus(): {
  configured: boolean;
  mailboxes: string[];
  hint: string;
  scopesNeeded: string[];
} {
  const config = outlookConfig();
  return {
    configured: Boolean(config),
    mailboxes: config?.mailboxes ?? ["portfolios@debtmarket.net"],
    scopesNeeded: [
      "Mail.Read (application)",
      "Contacts.Read (application)",
      "Files.Read.All (application)",
    ],
    hint: config
      ? "App-only credentials present. Sync pulls Inbox, Sent Items, Drafts, and mailbox contacts."
      : "Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_MAILBOXES. Grant admin consent for Mail.Read, Contacts.Read, and Files.Read.All, then scope mail with an application access policy. The desk still runs when these are empty.",
  };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/** OAuth2 client-credentials flow. Token is cached until a minute before expiry. */
export async function accessToken(config: OutlookConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const response = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Token request failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  return cachedToken.value;
}

interface GraphRecipient {
  emailAddress?: { address?: string; name?: string };
}

interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  from?: GraphRecipient;
  sender?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  hasAttachments?: boolean;
  isDraft?: boolean;
  body?: { content?: string; contentType?: string };
  webLink?: string;
  sentDateTime?: string;
  "@removed"?: unknown;
}

interface DeltaPage {
  value: GraphMessage[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
}

function addressesOf(list: GraphRecipient[] | undefined): string[] {
  return (list ?? [])
    .map((entry) => entry.emailAddress?.address?.toLowerCase().trim())
    .filter((value): value is string => Boolean(value));
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Associates a message to CRM records: exact address first, then the company
 * domain. Free-mail domains never match a company by domain alone.
 */
export function associate(
  workspaceId: WorkspaceId,
  counterparty: string,
): { contactId?: string; companyId?: string; matchedBy: InboxMessage["matchedBy"] } {
  const contact = findContactByEmail(workspaceId, counterparty);
  if (contact) {
    return { contactId: contact.id, companyId: contact.companyId, matchedBy: "email" };
  }

  const domain = domainOf(counterparty);
  if (domain && !isFreeMailDomain(domain)) {
    const company = findCompanyByDomain(workspaceId, domain);
    if (company) return { companyId: company.id, matchedBy: "domain" };
  }

  return { matchedBy: "none" };
}

export interface SyncResult {
  mailbox: string;
  fetched: number;
  stored: number;
  associated: number;
  leadsTouched: number;
  deltaSaved: boolean;
  error?: string;
}

type MailFolder = "inbox" | "sentitems" | "drafts";

function activityTypeFor(folder: MailFolder): DeskActivityType {
  switch (folder) {
    case "inbox":
      return "inbound_inquiry";
    case "sentitems":
      return "reply_sent";
    case "drafts":
      return "draft_created";
    default: {
      const exhaustive: never = folder;
      return exhaustive;
    }
  }
}

function savedDelta(state: MailboxSyncState | undefined, folder: "inbox" | "sentitems"): string | undefined {
  if (folder === "inbox") return state?.folderDeltas?.inbox ?? state?.deltaLink;
  return state?.folderDeltas?.sentitems;
}

export async function syncMailbox(
  workspaceId: WorkspaceId,
  mailbox: string,
  options: { maxPages?: number; folder?: "inbox" | "sentitems" } = {},
): Promise<SyncResult> {
  const folder = options.folder ?? "inbox";
  const config = outlookConfig();
  const result: SyncResult = {
    mailbox,
    fetched: 0,
    stored: 0,
    associated: 0,
    leadsTouched: 0,
    deltaSaved: false,
  };

  if (!config) {
    result.error = "Microsoft Graph credentials are not configured";
    return result;
  }

  const token = await accessToken(config);
  const state = loadDb().mailboxes.find((row) => row.mailbox === mailbox);

  let url =
    savedDelta(state, folder) ??
    `${GRAPH}/users/${encodeURIComponent(mailbox)}/mailFolders/${folder}/messages/delta?$select=${SELECT}`;

  const maxPages = options.maxPages ?? 5;
  let deltaLink: string | undefined;
  const messages: GraphMessage[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Prefer: "odata.maxpagesize=50",
      },
    });

    if (response.status === 410) {
      // Graph expired our sync state; restart a full delta round.
      mutate((db) => {
        const row = db.mailboxes.find((item) => item.mailbox === mailbox);
        if (!row) return;
        row.folderDeltas = { ...row.folderDeltas, [folder]: undefined };
        if (folder === "inbox") row.deltaLink = undefined;
      });
      result.error = "Sync state expired (410). Re-run to start a fresh delta.";
      return result;
    }

    if (!response.ok) {
      result.error = `Graph ${response.status}: ${(await response.text()).slice(0, 300)}`;
      mutate((db) => {
        const row = db.mailboxes.find((item) => item.mailbox === mailbox);
        if (row) row.lastError = result.error;
      });
      return result;
    }

    const payload = (await response.json()) as DeltaPage;
    messages.push(...(payload.value ?? []));

    if (payload["@odata.nextLink"]) {
      url = payload["@odata.nextLink"];
      continue;
    }
    deltaLink = payload["@odata.deltaLink"];
    break;
  }

  result.fetched = messages.length;
  const touchedLeads = new Set<string>();

  for (const message of messages) {
    if (message["@removed"] || message.isDraft) continue;

    const from = message.from?.emailAddress?.address?.toLowerCase().trim() ?? "";
    const fromName = message.from?.emailAddress?.name ?? "";
    const to = addressesOf(message.toRecipients);
    const cc = addressesOf(message.ccRecipients);
    if (!from) continue;

    const mailboxLower = mailbox.toLowerCase();
    const direction: InboxMessage["direction"] =
      folder === "sentitems" || from === mailboxLower ? "outbound" : "inbound";
    const counterparty = direction === "inbound" ? from : to[0] ?? "";
    if (!counterparty) continue;

    const match = associate(workspaceId, counterparty);
    if (match.contactId || match.companyId) result.associated += 1;

    const stored = mutate((db) => {
      const existing = db.inbox.find((row) => row.providerId === message.id);
      const body = message.body?.contentType === "html" ? stripHtml(message.body.content ?? "") : message.body?.content ?? "";
      const record: InboxMessage = {
        id: existing?.id ?? nextId("im"),
        workspaceId,
        providerId: message.id,
        mailbox,
        direction,
        from,
        fromName,
        to,
        cc,
        subject: message.subject ?? "(no subject)",
        preview: message.bodyPreview?.slice(0, 280) ?? "",
        body: body.slice(0, 8000),
        conversationId: message.conversationId ?? message.id,
        receivedAt: message.receivedDateTime ?? message.sentDateTime ?? new Date().toISOString(),
        contactId: match.contactId,
        companyId: match.companyId,
        matchedBy: match.matchedBy,
        hasAttachments: Boolean(message.hasAttachments),
        folder,
        webLink: message.webLink,
        isDraft: Boolean(message.isDraft),
      };

      if (existing) {
        Object.assign(existing, record);
      } else {
        db.inbox.unshift(record);
        if (db.inbox.length > 2000) db.inbox.length = 2000;
      }

      if (match.contactId) {
        const contact = db.contacts.find((row) => row.id === match.contactId);
        if (contact) contact.lastActivityAt = record.receivedAt;
      }

      return record;
    });

    result.stored += 1;
    if (stored.contactId) {
      appendLinkedActivity({
        workspaceId,
        contactId: stored.contactId,
        companyId: stored.companyId,
        type: activityTypeFor(folder),
        subject: stored.subject,
        body: stored.preview,
        outlookMessageId: message.id,
        outlookConversationId: stored.conversationId,
        link: message.webLink,
        occurredAt: stored.receivedAt,
        source: "graph",
      });
    }

    if (direction === "inbound" && match.contactId) {
      const lead = loadDb().leads.find(
        (row) =>
          row.workspaceId === workspaceId &&
          row.contactId === match.contactId &&
          !["converted", "rejected"].includes(row.status),
      );
      if (lead) {
        touchedLeads.add(lead.id);
        mutate((db) => {
          const row = db.leads.find((item) => item.id === lead.id);
          if (row && !row.firstTouchAt) {
            row.firstTouchAt = stored.receivedAt;
          }
        });
        runAutomations(workspaceId, "email.received", "lead", lead.id);
      }
    }
  }

  result.leadsTouched = touchedLeads.size;

  if (deltaLink) {
    result.deltaSaved = true;
    mutate((db) => {
      const row = db.mailboxes.find((item) => item.mailbox === mailbox);
      const entry = {
        mailbox,
        deltaLink: folder === "inbox" ? deltaLink : row?.deltaLink,
        folderDeltas: { ...(row?.folderDeltas ?? {}), [folder]: deltaLink },
        lastSyncAt: new Date().toISOString(),
        lastError: undefined,
        messageCount: (row?.messageCount ?? 0) + result.stored,
      };
      if (row) Object.assign(row, entry);
      else db.mailboxes.push(entry);
    });
  }

  return result;
}

export async function syncDrafts(workspaceId: WorkspaceId, mailbox: string): Promise<SyncResult> {
  const config = outlookConfig();
  const result: SyncResult = { mailbox, fetched: 0, stored: 0, associated: 0, leadsTouched: 0, deltaSaved: false };
  if (!config) {
    result.error = "Microsoft Graph credentials are not configured";
    return result;
  }
  const token = await accessToken(config);
  const response = await fetch(
    `${GRAPH}/users/${encodeURIComponent(mailbox)}/mailFolders/drafts/messages?$top=50&$select=${SELECT}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    result.error = `Graph ${response.status}: ${(await response.text()).slice(0, 300)}`;
    return result;
  }
  const payload = (await response.json()) as { value?: GraphMessage[] };
  const messages = payload.value ?? [];
  result.fetched = messages.length;
  for (const message of messages) {
    const to = addressesOf(message.toRecipients);
    const counterparty = to[0] ?? "";
    const match = counterparty ? associate(workspaceId, counterparty) : { matchedBy: "none" as const };
    if (match.contactId || match.companyId) result.associated += 1;
    const subject = message.subject ?? "(no subject)";
    const preview = message.bodyPreview?.slice(0, 280) ?? "";
    const receivedAt = message.sentDateTime ?? message.receivedDateTime ?? new Date().toISOString();
    mutate((db) => {
      const existing = db.inbox.find((row) => row.providerId === message.id);
      const record: InboxMessage = {
        id: existing?.id ?? nextId("im"),
        workspaceId,
        providerId: message.id,
        mailbox,
        direction: "outbound",
        folder: "drafts",
        from: mailbox.toLowerCase(),
        fromName: "",
        to,
        cc: addressesOf(message.ccRecipients),
        subject,
        preview,
        body: "",
        conversationId: message.conversationId ?? message.id,
        receivedAt,
        contactId: match.contactId,
        companyId: match.companyId,
        matchedBy: match.matchedBy,
        hasAttachments: Boolean(message.hasAttachments),
        webLink: message.webLink,
        isDraft: true,
      };
      if (existing) Object.assign(existing, record);
      else db.inbox.unshift(record);
    });
    result.stored += 1;
    if (match.contactId) {
      appendLinkedActivity({
        workspaceId,
        contactId: match.contactId,
        companyId: match.companyId,
        type: activityTypeFor("drafts"),
        subject,
        body: preview,
        outlookMessageId: message.id,
        outlookConversationId: message.conversationId,
        link: message.webLink,
        occurredAt: receivedAt,
        source: "graph",
      });
    }
  }
  return result;
}

export interface ContactSyncResult {
  mailbox: string;
  fetched: number;
  upserted: number;
  error?: string;
}

export async function syncMailboxContacts(workspaceId: WorkspaceId, mailbox: string): Promise<ContactSyncResult> {
  const config = outlookConfig();
  const result: ContactSyncResult = { mailbox, fetched: 0, upserted: 0 };
  if (!config) {
    result.error = "Microsoft Graph credentials are not configured";
    return result;
  }
  const token = await accessToken(config);
  let url: string | undefined =
    `${GRAPH}/users/${encodeURIComponent(mailbox)}/contacts?$top=100&$select=displayName,emailAddresses,companyName,jobTitle,mobilePhone`;
  for (let page = 0; page < 5 && url; page += 1) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      result.error = `Graph ${response.status}: ${(await response.text()).slice(0, 300)}`;
      return result;
    }
    const payload = (await response.json()) as {
      value?: Array<{
        displayName?: string;
        companyName?: string;
        jobTitle?: string;
        mobilePhone?: string;
        emailAddresses?: Array<{ address?: string }>;
      }>;
      "@odata.nextLink"?: string;
    };
    for (const person of payload.value ?? []) {
      const address = person.emailAddresses?.find((entry) => entry.address?.includes("@"))?.address?.toLowerCase().trim();
      if (!address) continue;
      result.fetched += 1;
      const prior = findContactByEmail(workspaceId, address);
      const priorFlag = prior?.doNotEmail === true;
      const parts = (person.displayName ?? "").trim().split(/\s+/);
      const saved = upsertContact({
        workspaceId,
        email: address,
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || undefined,
        companyName: person.companyName,
        phone: person.mobilePhone,
        title: person.jobTitle,
      });
      if (prior && saved.contact.doNotEmail !== priorFlag) {
        mutate((db) => {
          const row = db.contacts.find((contact) => contact.id === saved.contact.id);
          if (row) row.doNotEmail = priorFlag;
        });
      }
      result.upserted += 1;
    }
    url = payload["@odata.nextLink"];
  }
  mutate((db) => {
    const row = db.mailboxes.find((item) => item.mailbox === mailbox);
    if (row) row.lastContactSyncAt = new Date().toISOString();
    else {
      db.mailboxes.push({
        mailbox,
        messageCount: 0,
        lastContactSyncAt: new Date().toISOString(),
      });
    }
  });
  return result;
}

export interface DriveEntry {
  id: string;
  name: string;
  webUrl?: string;
  folder: boolean;
  size?: number;
}

export async function listDrive(
  mailbox: string,
  itemId?: string,
): Promise<{ configured: boolean; hint: string; items: DriveEntry[]; error?: string }> {
  const config = outlookConfig();
  if (!config) {
    return {
      configured: false,
      hint: outlookStatus().hint,
      items: [],
    };
  }
  const token = await accessToken(config);
  const path = itemId
    ? `/users/${encodeURIComponent(mailbox)}/drive/items/${encodeURIComponent(itemId)}/children`
    : `/users/${encodeURIComponent(mailbox)}/drive/root/children`;
  const response = await fetch(`${GRAPH}${path}?$top=50&$select=id,name,webUrl,size,folder,file`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    return {
      configured: true,
      hint: outlookStatus().hint,
      items: [],
      error: `Graph ${response.status}: ${(await response.text()).slice(0, 300)}`,
    };
  }
  const payload = (await response.json()) as {
    value?: Array<{ id: string; name?: string; webUrl?: string; size?: number; folder?: unknown }>;
  };
  return {
    configured: true,
    hint: outlookStatus().hint,
    items: (payload.value ?? []).map((item) => ({
      id: item.id,
      name: item.name ?? "Untitled",
      webUrl: item.webUrl,
      folder: Boolean(item.folder),
      size: item.size,
    })),
  };
}

export async function syncAll(workspaceId: WorkspaceId): Promise<SyncResult[]> {
  const config = outlookConfig();
  if (!config) {
    return [
      {
        mailbox: "unconfigured",
        fetched: 0,
        stored: 0,
        associated: 0,
        leadsTouched: 0,
        deltaSaved: false,
        error: "Microsoft Graph credentials are not configured",
      },
    ];
  }
  const results: SyncResult[] = [];
  for (const mailbox of config.mailboxes) {
    results.push(await syncMailbox(workspaceId, mailbox, { folder: "inbox" }));
    results.push(await syncMailbox(workspaceId, mailbox, { folder: "sentitems" }));
    results.push(await syncDrafts(workspaceId, mailbox));
    await syncMailboxContacts(workspaceId, mailbox);
  }
  return results;
}

/** Re-runs association for messages stored before a contact existed. */
export function reassociate(workspaceId: WorkspaceId): { updated: number } {
  let updated = 0;
  mutate((db) => {
    for (const message of db.inbox) {
      if (message.workspaceId !== workspaceId) continue;
      if (message.contactId) continue;
      const counterparty = message.direction === "inbound" ? message.from : message.to[0] ?? "";
      if (!counterparty) continue;
      const match = associate(workspaceId, counterparty);
      if (match.contactId || match.companyId) {
        message.contactId = match.contactId;
        message.companyId = match.companyId;
        message.matchedBy = match.matchedBy;
        updated += 1;
      }
    }
  });
  return { updated };
}
