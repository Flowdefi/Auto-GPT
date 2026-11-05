import type { WorkspaceId } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import type { ActivityKind } from "./activity-kinds";
import { logActivity } from "./activities";
import { listCompanies, listContacts, saveContact } from "./crm-store";
import { emailBlockReason } from "./email-block";
import { accessToken, outlookConfig, syncMailbox, type OutlookConfig } from "./outlook";

const GRAPH = "https://graph.microsoft.com/v1.0";
const FOLDERS = ["inbox", "sentitems", "drafts"] as const;
const MAX_PAGES = 4;

export interface FolderSync {
  folder: string;
  fetched: number;
  logged: number;
  createdContacts: number;
  skippedSuppressed: number;
  error?: string;
}

export interface ContactSync {
  fetched: number;
  created: number;
  merged: number;
  skippedSuppressed: number;
  error?: string;
}

export interface MailboxSync {
  mailbox: string;
  folders: FolderSync[];
  contacts: ContactSync;
  inboxError?: string;
}

export interface GraphSyncReport {
  configured: boolean;
  workspaceId: WorkspaceId;
  mailboxes: MailboxSync[];
}

export interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
  size?: number;
  modified?: string;
  folder: boolean;
}

interface GraphPage {
  value?: unknown[];
  "@odata.nextLink"?: string;
}

function emptyContacts(): ContactSync {
  return { fetched: 0, created: 0, merged: 0, skippedSuppressed: 0 };
}

async function graphGet(token: string, url: string): Promise<GraphPage> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: "odata.maxpagesize=25",
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 240);
    throw new Error(`Graph ${response.status}: ${detail}`);
  }
  return (await response.json()) as GraphPage;
}

function recipients(value: unknown): Array<{ address: string; name: string }> {
  if (!Array.isArray(value)) return [];
  const people: Array<{ address: string; name: string }> = [];
  for (const entry of value) {
    const mail = (entry as { emailAddress?: { address?: string; name?: string } }).emailAddress;
    const address = mail?.address?.toLowerCase().trim() ?? "";
    if (!address) continue;
    people.push({ address, name: mail?.name?.trim() ?? "" });
  }
  return people;
}

function splitName(name: string): { firstName?: string; lastName?: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function channelFor(folder: string, from: string, mailbox: string): ActivityKind {
  if (folder === "drafts") return "draft";
  if (folder === "sentitems" || from === mailbox) return "outbound";
  return "inbound";
}

async function syncFolder(
  workspaceId: WorkspaceId,
  token: string,
  mailbox: string,
  folder: (typeof FOLDERS)[number],
  own: Set<string>,
): Promise<FolderSync> {
  const result: FolderSync = { folder, fetched: 0, logged: 0, createdContacts: 0, skippedSuppressed: 0 };
  let url = `${GRAPH}/users/${encodeURIComponent(mailbox)}/mailFolders/${folder}/messages?$top=25&$select=id,subject,bodyPreview,receivedDateTime,sentDateTime,from,toRecipients,ccRecipients,isDraft`;
  try {
    for (let page = 0; page < MAX_PAGES && url; page += 1) {
      const payload = await graphGet(token, url);
      for (const entry of payload.value ?? []) {
        const message = entry as {
          id?: string;
          subject?: string;
          bodyPreview?: string;
          receivedDateTime?: string;
          sentDateTime?: string;
          from?: unknown;
          toRecipients?: unknown;
          ccRecipients?: unknown;
        };
        if (!message.id) continue;
        result.fetched += 1;
        const from = recipients(message.from ? [message.from] : [])[0];
        const fromAddress = from?.address ?? "";
        const kind = channelFor(folder, fromAddress, mailbox);
        const candidates = (kind === "inbound" ? [from].filter((person) => person !== undefined) : [...recipients(message.toRecipients), ...recipients(message.ccRecipients)]).filter(
          (person) => person.address && !own.has(person.address),
        );
        const counterparty = candidates[0];
        if (!counterparty) continue;
        const names = splitName(counterparty.name);
        try {
          const logged = logActivity({
            workspaceId,
            kind,
            email: counterparty.address,
            firstName: names.firstName,
            lastName: names.lastName,
            subject: message.subject,
            body: message.bodyPreview,
            at: message.receivedDateTime || message.sentDateTime,
            externalId: `graph:${mailbox}:${message.id}`,
            source: "graph",
            userId: "graph",
          });
          result.logged += 1;
          if (logged.createdContact) result.createdContacts += 1;
          if (logged.suppressed) result.skippedSuppressed += 1;
        } catch (error) {
          result.error = error instanceof Error ? error.message : "Could not log a message";
        }
      }
      url = payload["@odata.nextLink"] ?? "";
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Folder sync failed";
  }
  return result;
}

async function syncContacts(
  workspaceId: WorkspaceId,
  token: string,
  mailbox: string,
  own: Set<string>,
): Promise<ContactSync> {
  const result = emptyContacts();
  let url = `${GRAPH}/users/${encodeURIComponent(mailbox)}/contacts?$top=50&$select=givenName,surname,emailAddresses,companyName,jobTitle,mobilePhone,businessPhones`;
  try {
    const companies = listCompanies(workspaceId);
    for (let page = 0; page < MAX_PAGES && url; page += 1) {
      const payload = await graphGet(token, url);
      for (const entry of payload.value ?? []) {
        const row = entry as {
          givenName?: string;
          surname?: string;
          companyName?: string;
          jobTitle?: string;
          mobilePhone?: string;
          businessPhones?: string[];
          emailAddresses?: Array<{ address?: string }>;
        };
        const emails = [...new Set((row.emailAddresses ?? []).map((item) => item.address?.toLowerCase().trim() ?? "").filter(Boolean))];
        const email = emails.find((address) => !own.has(address));
        if (!email) continue;
        result.fetched += 1;
        const blocked = emailBlockReason(workspaceId, email) !== null;
        const existing = listContacts(workspaceId).find((contact) => emails.includes(contact.email.toLowerCase()));
        const phone = row.mobilePhone?.trim() || row.businessPhones?.[0]?.trim() || "";
        const companyId = companies.find((company) => company.name.trim().toLowerCase() === (row.companyName ?? "").trim().toLowerCase())?.id;
        if (!existing) {
          if (blocked || own.has(email)) {
            result.skippedSuppressed += 1;
            continue;
          }
          saveContact(
            workspaceId,
            {
              email,
              firstName: row.givenName?.trim() || "",
              lastName: row.surname?.trim() || "",
              title: row.jobTitle?.trim() || "",
              phone,
              companyId: companyId ?? "",
              source: "graph-contacts",
              lifecycle: "lead",
            },
            { retainSuppressions: true },
          );
          result.created += 1;
          continue;
        }
        const next = {
          ...existing,
          firstName: existing.firstName || row.givenName?.trim() || "",
          lastName: existing.lastName || row.surname?.trim() || "",
          title: existing.title || row.jobTitle?.trim() || "",
          phone: existing.phone || phone,
          companyId: existing.companyId || companyId || "",
          doNotEmail: existing.doNotEmail === true || blocked,
        };
        const changed =
          next.firstName !== existing.firstName ||
          next.lastName !== existing.lastName ||
          next.title !== existing.title ||
          next.phone !== existing.phone ||
          next.companyId !== existing.companyId ||
          next.doNotEmail !== existing.doNotEmail;
        if (!changed) continue;
        saveContact(workspaceId, next, { retainSuppressions: true });
        result.merged += 1;
      }
      url = payload["@odata.nextLink"] ?? "";
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Contact sync failed";
  }
  return result;
}

async function syncOne(workspaceId: WorkspaceId, config: OutlookConfig, mailbox: string): Promise<MailboxSync> {
  const own = new Set(config.mailboxes.map((item) => item.toLowerCase()));
  own.add(mailbox.toLowerCase());
  const token = await accessToken(config);
  const folders: FolderSync[] = [];
  for (const folder of FOLDERS) {
    folders.push(await syncFolder(workspaceId, token, mailbox, folder, own));
  }
  const contacts = await syncContacts(workspaceId, token, mailbox, own);
  let inboxError: string | undefined;
  try {
    const inbox = await syncMailbox(workspaceId, mailbox);
    inboxError = inbox.error;
  } catch (error) {
    inboxError = error instanceof Error ? error.message : "Inbox sync failed";
  }
  return { mailbox, folders, contacts, inboxError };
}

export async function syncGraph(workspaceId: WorkspaceId): Promise<GraphSyncReport> {
  const config = outlookConfig();
  if (!config) return { configured: false, workspaceId, mailboxes: [] };
  const mailboxes: MailboxSync[] = [];
  for (const mailbox of config.mailboxes) {
    try {
      mailboxes.push(await syncOne(workspaceId, config, mailbox));
    } catch (error) {
      mailboxes.push({
        mailbox,
        folders: [],
        contacts: { ...emptyContacts(), error: error instanceof Error ? error.message : "Sync failed" },
      });
    }
  }
  return { configured: true, workspaceId, mailboxes };
}

export function startGraphSyncLoop(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const ms = Number(process.env.MS_SYNC_INTERVAL_MS ?? process.env.MERIDIAN_GRAPH_SYNC_MS ?? "");
  if (!Number.isFinite(ms) || ms < 60_000) return;
  if (!outlookConfig()) return;
  const state = globalThis as { __meridianGraphTimer?: ReturnType<typeof setInterval> };
  if (state.__meridianGraphTimer) return;
  const workspace = isWorkspaceId(process.env.MERIDIAN_GRAPH_WORKSPACE) ? process.env.MERIDIAN_GRAPH_WORKSPACE : "triton";
  let running = false;
  const timer = setInterval(() => {
    if (running) return;
    running = true;
    void syncGraph(workspace)
      .catch((error) => {
        console.warn("Graph sync:", error instanceof Error ? error.message : error);
      })
      .finally(() => {
        running = false;
      });
  }, ms);
  timer.unref?.();
  state.__meridianGraphTimer = timer;
}

export async function listDriveItems(query?: string): Promise<{
  configured: boolean;
  mailbox?: string;
  error?: string;
  items: DriveItem[];
}> {
  const config = outlookConfig();
  if (!config) return { configured: false, items: [] };
  const mailbox = config.mailboxes[0];
  if (!mailbox) return { configured: true, items: [], error: "No mailbox configured" };
  try {
    const token = await accessToken(config);
    const needle = (query ?? "").replace(/['"]/g, "").trim().slice(0, 80);
    const url = needle
      ? `${GRAPH}/users/${encodeURIComponent(mailbox)}/drive/root/search(q='${encodeURIComponent(needle)}')?$top=40&$select=id,name,webUrl,size,lastModifiedDateTime,folder,file`
      : `${GRAPH}/users/${encodeURIComponent(mailbox)}/drive/root/children?$top=50&$select=id,name,webUrl,size,lastModifiedDateTime,folder,file`;
    const payload = await graphGet(token, url);
    const items: DriveItem[] = [];
    for (const entry of payload.value ?? []) {
      const row = entry as {
        id?: string;
        name?: string;
        webUrl?: string;
        size?: number;
        lastModifiedDateTime?: string;
        folder?: unknown;
      };
      if (!row.id || !row.name || !row.webUrl) continue;
      items.push({
        id: row.id,
        name: row.name,
        webUrl: row.webUrl,
        size: typeof row.size === "number" ? row.size : undefined,
        modified: row.lastModifiedDateTime,
        folder: Boolean(row.folder),
      });
    }
    return { configured: true, mailbox, items };
  } catch (error) {
    return {
      configured: true,
      mailbox,
      items: [],
      error: error instanceof Error ? error.message : "Drive lookup failed",
    };
  }
}
