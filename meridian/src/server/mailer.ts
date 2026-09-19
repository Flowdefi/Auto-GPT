import { createHash, randomBytes } from "crypto";
import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";
import { loadDb, mutate, nextId } from "./db";
import type { BulkCampaign, EmailListMember, OutboundMessage } from "./models";

const FROM_TRITON = "portfolios@debtmarket.net";

export interface MergeContext {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  unsubscribeUrl: string;
  previewText: string;
}

export function publicBaseUrl(): string {
  return (
    process.env.MERIDIAN_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function merge(template: string, ctx: MergeContext): string {
  return template
    .replaceAll("{{firstName}}", ctx.firstName || "there")
    .replaceAll("{{lastName}}", ctx.lastName)
    .replaceAll("{{company}}", ctx.company || "your firm")
    .replaceAll("{{email}}", ctx.email)
    .replaceAll("{{unsubscribeUrl}}", ctx.unsubscribeUrl)
    .replaceAll("{{previewText}}", ctx.previewText);
}

export function unsubscribeUrl(token: string): string {
  return `${publicBaseUrl()}/u/${token}`;
}

export function tokenFor(email: string, campaignId: string): string {
  return createHash("sha256")
    .update(`${email}:${campaignId}:${randomBytes(8).toString("hex")}`)
    .digest("hex")
    .slice(0, 32);
}

function isSuppressed(workspaceId: WorkspaceId, email: string): boolean {
  const db = loadDb();
  return db.suppressions.some(
    (row) => row.workspaceId === workspaceId && row.email === email.toLowerCase(),
  );
}

export function eligibleMembers(listId: string, workspaceId: WorkspaceId): EmailListMember[] {
  const db = loadDb();
  return db.members.filter(
    (member) =>
      member.listId === listId &&
      member.subscribed &&
      !isSuppressed(workspaceId, member.email),
  );
}

export function fromAddress(workspaceId: WorkspaceId): { name: string; email: string } {
  if (workspaceId === "triton") {
    return { name: "Triton Financial Solutions", email: FROM_TRITON };
  }
  return { name: "Aether Digital Markets", email: process.env.AETHER_FROM_EMAIL ?? "desk@aethermarkets.io" };
}

export async function sendCampaign(campaignId: string): Promise<BulkCampaign> {
  const db = loadDb();
  const campaign = db.campaigns.find((row) => row.id === campaignId);
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.status === "sent") return campaign;

  const members = eligibleMembers(campaign.listId, campaign.workspaceId);
  const sendable = members.filter((member) => !member.seedLocked);
  const locked = members.filter((member) => member.seedLocked);

  mutate((state) => {
    const current = state.campaigns.find((row) => row.id === campaignId);
    if (!current) return;
    current.status = "sending";
    current.intended = sendable.length;
    current.skipped = locked.length;
    for (const member of members) {
      const already = state.messages.some(
        (message) => message.campaignId === campaignId && message.to === member.email,
      );
      if (already) continue;
      state.messages.push({
        id: nextId("om"),
        campaignId,
        workspaceId: campaign.workspaceId,
        to: member.email,
        subject: merge(campaign.subject, contextFor(member, campaign, "pending")),
        status: member.seedLocked ? "skipped_seed" : "queued",
        unsubscribeToken: tokenFor(member.email, campaignId),
      });
    }
  });

  const queued = loadDb().messages.filter(
    (message) => message.campaignId === campaignId && message.status === "queued",
  );

  for (const message of queued) {
    const member = sendable.find((row) => row.email === message.to);
    if (!member) continue;
    await deliverOne(campaign, member, message);
  }

  return mutate((state) => {
    const current = state.campaigns.find((row) => row.id === campaignId);
    if (!current) throw new Error("Campaign not found");
    const related = state.messages.filter((message) => message.campaignId === campaignId);
    current.delivered = related.filter((message) => message.status === "sent" || message.status === "delivered").length;
    current.failed = related.filter((message) => message.status === "failed").length;
    current.skipped = related.filter((message) => message.status === "skipped_seed" || message.status === "suppressed").length;
    current.status = current.failed > 0 && current.delivered === 0 ? "failed" : "sent";
    current.sentAt = new Date().toISOString();
    return current;
  });
}

function contextFor(member: EmailListMember, campaign: BulkCampaign, token: string): MergeContext {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    company: member.company,
    email: member.email,
    unsubscribeUrl: unsubscribeUrl(token),
    previewText: campaign.previewText,
  };
}

async function deliverOne(
  campaign: BulkCampaign,
  member: EmailListMember,
  message: OutboundMessage,
): Promise<void> {
  const ctx = contextFor(member, campaign, message.unsubscribeToken);
  const html = merge(campaign.html, ctx);
  const text = merge(campaign.text, ctx);
  const subject = merge(campaign.subject, ctx);

  try {
    const result = await transportSend({
      fromName: campaign.fromName,
      fromEmail: campaign.fromEmail,
      replyTo: campaign.replyTo,
      to: member.email,
      subject,
      html,
      text,
      unsubscribeUrl: ctx.unsubscribeUrl,
      campaignId: campaign.id,
    });
    mutate((state) => {
      const row = state.messages.find((item) => item.id === message.id);
      if (!row) return;
      row.status = "sent";
      row.providerId = result.id;
      row.sentAt = new Date().toISOString();
      row.subject = subject;
    });
  } catch (error) {
    mutate((state) => {
      const row = state.messages.find((item) => item.id === message.id);
      if (!row) return;
      row.status = "failed";
      row.error = error instanceof Error ? error.message : "Send failed";
    });
  }
}

export async function sendTest(
  workspaceId: WorkspaceId,
  to: string,
  subject: string,
  html: string,
  text: string,
  previewText: string,
): Promise<{ id: string; provider: string }> {
  const from = fromAddress(workspaceId);
  const member: EmailListMember = {
    id: "test",
    listId: `${workspaceId}_list_test`,
    email: to.toLowerCase(),
    firstName: "Desk",
    lastName: "Test",
    company: workspaceOf(workspaceId).legalName,
    seedLocked: false,
    subscribed: true,
  };
  const token = tokenFor(to, "test");
  const ctx: MergeContext = {
    firstName: member.firstName,
    lastName: member.lastName,
    company: member.company,
    email: member.email,
    unsubscribeUrl: unsubscribeUrl(token),
    previewText,
  };
  const result = await transportSend({
    fromName: from.name,
    fromEmail: from.email,
    replyTo: from.email,
    to,
    subject: merge(subject, ctx),
    html: merge(html, ctx),
    text: merge(text, ctx),
    unsubscribeUrl: ctx.unsubscribeUrl,
    campaignId: "test",
  });
  mutate((state) => {
    state.messages.push({
      id: nextId("om"),
      campaignId: "test",
      workspaceId,
      to: to.toLowerCase(),
      subject: merge(subject, ctx),
      status: "sent",
      providerId: result.id,
      unsubscribeToken: token,
      sentAt: new Date().toISOString(),
    });
  });
  return result;
}

interface TransportInput {
  fromName: string;
  fromEmail: string;
  replyTo: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  campaignId: string;
}

async function transportSend(input: TransportInput): Promise<{ id: string; provider: string }> {
  const key = process.env.RESEND_API_KEY;
  if (key) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${input.fromName} <${input.fromEmail}>`,
        to: [input.to],
        reply_to: input.replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: {
          "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "List-Id": `meridian-${input.campaignId}.debtmarket.net`,
          Precedence: "bulk",
          "X-Entity-Ref-ID": input.campaignId,
        },
        tags: [
          { name: "campaign", value: input.campaignId },
          { name: "product", value: "meridian" },
        ],
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend ${response.status}: ${detail}`);
    }
    const payload = (await response.json()) as { id?: string };
    return { id: payload.id ?? nextId("rs"), provider: "resend" };
  }

  if (process.env.SMTP_URL) {
    throw new Error("SMTP_URL is set but the SMTP transport is not enabled in this runtime. Use RESEND_API_KEY.");
  }

  throw new Error(
    "No delivery provider. Set RESEND_API_KEY and verify debtmarket.net (SPF, DKIM, DMARC) so mail can leave as portfolios@debtmarket.net.",
  );
}

export function providerStatus(): {
  ready: boolean;
  provider: string;
  from: string;
  hint: string;
} {
  if (process.env.RESEND_API_KEY) {
    return {
      ready: true,
      provider: "resend",
      from: FROM_TRITON,
      hint: "Resend will send as portfolios@debtmarket.net once the domain is verified.",
    };
  }
  return {
    ready: false,
    provider: "none",
    from: FROM_TRITON,
    hint: "Add RESEND_API_KEY and verify debtmarket.net. Seed CRM addresses stay locked.",
  };
}
