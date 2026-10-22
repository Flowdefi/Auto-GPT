import type { WorkspaceId } from "@/lib/types";
import { domainOf, findCompanyByDomain, findContactByEmail, isFreeMailDomain } from "./crm";
import { loadDb, mutate, nextId } from "./db";
import type { InboxMessage } from "./models";
import { runAutomations } from "./workflow";

const GRAPH = "https://graph.microsoft.com/v1.0";
const SELECT =
  "id,conversationId,subject,bodyPreview,receivedDateTime,from,sender,toRecipients,ccRecipients,hasAttachments,isDraft,body";

export interface OutlookConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  mailboxes: string[];
}

export function outlookConfig(): OutlookConfig | null {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const mailboxes = (process.env.MS_MAILBOXES ?? "portfolios@debtmarket.net")
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
    scopesNeeded: ["Mail.ReadBasic.All or Mail.Read (application)", "User.Read.All (optional, for names)"],
    hint: config
      ? "App-only credentials present. Run a sync to pull the mailbox delta."
      : "Set MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET, and MS_MAILBOXES. Grant admin consent for Mail.Read (application) and scope it with an application access policy.",
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

export async function syncMailbox(
  workspaceId: WorkspaceId,
  mailbox: string,
  options: { maxPages?: number } = {},
): Promise<SyncResult> {
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
    state?.deltaLink ??
    `${GRAPH}/users/${encodeURIComponent(mailbox)}/mailFolders/Inbox/messages/delta?$select=${SELECT}`;

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
        if (row) row.deltaLink = undefined;
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
    const direction: InboxMessage["direction"] = from === mailboxLower ? "outbound" : "inbound";
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
        receivedAt: message.receivedDateTime ?? new Date().toISOString(),
        contactId: match.contactId,
        companyId: match.companyId,
        matchedBy: match.matchedBy,
        hasAttachments: Boolean(message.hasAttachments),
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
        deltaLink,
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
    results.push(await syncMailbox(workspaceId, mailbox));
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
