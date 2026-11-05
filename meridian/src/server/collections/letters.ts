import type { WorkspaceId } from "@/lib/types";
import type { MailJob } from "@/lib/collections/desk";
import { textPdf } from "@/lib/collections/text-pdf";
import { loadDb, mutate, nextId } from "@/server/db";
import { sendChannel, renderTemplatePreview, syncCollectionTemplates } from "./service";

const LETTER_CHANNELS = new Set(["letter", "letter_block", "validation"]);

export function queueLetter(workspaceId: WorkspaceId, accountId: string, templateId: string): MailJob {
  syncCollectionTemplates();
  const template = (loadDb().collectionTemplates ?? []).find((item) => item.id === templateId);
  if (!template || !LETTER_CHANNELS.has(template.channel)) throw new Error("Template is not a letter");
  const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === accountId && item.workspaceId === workspaceId);
  if (!account) throw new Error("Account not found");
  const preview = renderTemplatePreview(workspaceId, templateId, accountId);
  const pdf = Buffer.from(textPdf(preview.subject || template.id, preview.body)).toString("base64");
  let status: MailJob["status"] = "queued";
  let reason: string | null = null;
  if (account.addressStatus === "returned") {
    status = "paused";
    reason = "Returned mail is on file. Letter sequences stay paused until the address is reviewed.";
  } else if (preview.missing.length > 0) {
    status = "paused";
    reason = "Required merge fields are empty.";
  } else if (!template.ownerApproved) {
    status = "paused";
    reason = "Template stays disabled until an owner approves it for sending.";
  }
  const job: MailJob = {
    id: nextId("mail"),
    workspaceId,
    accountId,
    templateId,
    status,
    provider: "sandbox",
    providerId: null,
    reason,
    pdfBase64: pdf,
    createdAt: new Date().toISOString(),
  };
  mutate((db) => {
    db.mailJobs = [job, ...(db.mailJobs ?? [])].slice(0, 200);
  });
  return job;
}

export function listMailJobs(workspaceId: WorkspaceId): Array<Omit<MailJob, "pdfBase64"> & { accountRef: string }> {
  const accounts = loadDb().portfolioAccounts ?? [];
  return (loadDb().mailJobs ?? [])
    .filter((job) => job.workspaceId === workspaceId)
    .slice(0, 50)
    .map((job) => ({
      id: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      templateId: job.templateId,
      status: job.status,
      provider: job.provider,
      providerId: job.providerId,
      reason: job.reason,
      createdAt: job.createdAt,
      accountRef: accounts.find((account) => account.id === job.accountId)?.accountRef ?? "",
    }));
}

export function mailPdf(workspaceId: WorkspaceId, mailJobId: string): string {
  const job = (loadDb().mailJobs ?? []).find((item) => item.id === mailJobId && item.workspaceId === workspaceId);
  if (!job) throw new Error("Mail job not found");
  return job.pdfBase64;
}

/** Files queued letters through the same gate and Lob path as a one-off send. */
export async function runMailQueue(workspaceId?: WorkspaceId): Promise<number> {
  const queued = (loadDb().mailJobs ?? []).filter((job) => job.status === "queued" && (!workspaceId || job.workspaceId === workspaceId));
  let filed = 0;
  for (const job of queued.slice(0, 20)) {
    const message = await sendChannel({
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      channel: "letter",
      body: "",
      templateId: job.templateId,
    });
    const status: MailJob["status"] = message.status === "blocked"
      ? "paused"
      : message.provider === "sandbox"
        ? "sandbox_filed"
        : "provider_accepted";
    mutate((db) => {
      db.mailJobs = (db.mailJobs ?? []).map((item) =>
        item.id === job.id ? { ...item, status, provider: message.provider, providerId: message.providerId, reason: message.reason } : item,
      );
    });
    if (status !== "paused") filed += 1;
  }
  return filed;
}

export function markMailReturned(workspaceId: WorkspaceId, mailJobId: string): number {
  let paused = 0;
  mutate((db) => {
    const job = (db.mailJobs ?? []).find((item) => item.id === mailJobId && item.workspaceId === workspaceId);
    if (!job) throw new Error("Mail job not found");
    db.mailJobs = (db.mailJobs ?? []).map((item) => (item.id === job.id ? { ...item, status: "returned", reason: "Returned mail" } : item));
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((account) =>
      account.id === job.accountId ? { ...account, addressStatus: "returned" } : account,
    );
    db.jobs = (db.jobs ?? []).map((item) => {
      if (item.status !== "pending" || item.payload.accountId !== job.accountId || item.payload.channel !== "letter") return item;
      paused += 1;
      return { ...item, status: "blocked", result: "returned mail" };
    });
  });
  return paused;
}
