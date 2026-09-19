import { createHash, randomBytes } from "crypto";
import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";
import { loadDb, mutate, nextId } from "./db";
import type { BulkCampaign, EmailListMember, OutboundMessage } from "./models";

const FROM_TRITON = "portfolios@debtmarket.net";
const AGENTMAIL_TRITON = process.env.AGENTMAIL_INBOX_TRITON ?? "portfolios@agentmail.to";
const AGENTMAIL_AETHER = process.env.AGENTMAIL_INBOX_AETHER ?? "desk@agentmail.to";
const SEND_GAP_MS = 400;
const MAX_CAMPAIGN = 100;

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
  const sendable = members.filter((member) => !member.seedLocked).slice(0, MAX_CAMPAIGN);
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
    await sleep(SEND_GAP_MS);
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
  const html = withTracking(merge(campaign.html, ctx), message.id);
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
      unsubscribeToken: message.unsubscribeToken,
      campaignId: campaign.id,
    });
    mutate((state) => {
      const row = state.messages.find((item) => item.id === message.id);
      if (!row) return;
      row.status = "sent";
      row.provider = result.provider;
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
    html: withTracking(merge(html, ctx), `test_${token}`),
    text: merge(text, ctx),
    unsubscribeUrl: ctx.unsubscribeUrl,
    unsubscribeToken: token,
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
      provider: result.provider,
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
  unsubscribeToken: string;
  campaignId: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTracking(html: string, messageId: string): string {
  const base = publicBaseUrl();
  const pixel = `<img src="${base}/api/email/track/open?m=${encodeURIComponent(messageId)}" width="1" height="1" alt="" style="display:none;border:0;" />`;
  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/gi, (full, url: string) => {
    if (url.includes("/u/") || url.includes("unsubscribe") || url.includes("/api/email/track/")) {
      return full;
    }
    return `href="${base}/api/email/track/click?m=${encodeURIComponent(messageId)}&u=${encodeURIComponent(url)}"`;
  });
  if (rewritten.includes("</body>")) {
    return rewritten.replace("</body>", `${pixel}</body>`);
  }
  return `${rewritten}${pixel}`;
}

function agentmailInbox(fromEmail: string): string {
  if (fromEmail.includes("aether")) return AGENTMAIL_AETHER;
  return AGENTMAIL_TRITON;
}

async function sendViaAgentmail(input: TransportInput): Promise<{ id: string; provider: string }> {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key) throw new Error("AGENTMAIL_API_KEY missing");
  const inbox = agentmailInbox(input.fromEmail);
  const response = await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: [input.to],
      reply_to: [input.replyTo],
      subject: input.subject,
      html: input.html,
      text: input.text,
      labels: ["meridian", input.campaignId],
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`AgentMail ${response.status}: ${detail}`);
  }
  const payload = (await response.json()) as { message_id?: string; messageId?: string };
  return { id: payload.messageId ?? payload.message_id ?? nextId("am"), provider: "agentmail" };
}

async function transportSend(input: TransportInput): Promise<{ id: string; provider: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
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
          "List-Unsubscribe": `<${publicBaseUrl()}/api/email/unsubscribe?token=${encodeURIComponent(input.unsubscribeToken)}>`,
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

  if (process.env.AGENTMAIL_API_KEY) {
    return sendViaAgentmail(input);
  }

  if (process.env.SMTP_URL) {
    throw new Error("SMTP_URL is set but the SMTP transport is not enabled in this runtime. Use RESEND_API_KEY or AGENTMAIL_API_KEY.");
  }

  throw new Error(
    "No delivery provider. Set RESEND_API_KEY (custom From portfolios@debtmarket.net after SPF/DKIM/DMARC) or AGENTMAIL_API_KEY (delivers now via portfolios@agentmail.to with Reply-To portfolios@debtmarket.net).",
  );
}

export function recordMailEvent(messageId: string, type: "open" | "click" | "bounce" | "complaint", url?: string): boolean {
  return mutate((state) => {
    const message = state.messages.find((row) => row.id === messageId);
    if (!message) return false;
    state.events.push({
      id: nextId("ev"),
      messageId,
      type,
      at: new Date().toISOString(),
      url,
    });
    if (type === "open") message.opened = (message.opened ?? 0) + 1;
    if (type === "click") message.clicked = (message.clicked ?? 0) + 1;
    if (type === "bounce" || type === "complaint") {
      message.status = "failed";
      if (!state.suppressions.some((row) => row.email === message.to && row.workspaceId === message.workspaceId)) {
        state.suppressions.push({
          id: `sup_${message.to}_${type}`,
          workspaceId: message.workspaceId,
          email: message.to,
          reason: type === "bounce" ? "bounce" : "complaint",
          at: new Date().toISOString(),
        });
      }
    }
    return true;
  });
}

export function providerStatus(): {
  ready: boolean;
  provider: string;
  from: string;
  envelope?: string;
  hint: string;
} {
  if (process.env.RESEND_API_KEY) {
    return {
      ready: true,
      provider: "resend",
      from: FROM_TRITON,
      envelope: FROM_TRITON,
      hint: "Resend will send as portfolios@debtmarket.net once the domain is verified.",
    };
  }
  if (process.env.AGENTMAIL_API_KEY) {
    return {
      ready: true,
      provider: "agentmail",
      from: FROM_TRITON,
      envelope: AGENTMAIL_TRITON,
      hint: `Delivering now via ${AGENTMAIL_TRITON} with Reply-To ${FROM_TRITON}. Seed CRM addresses stay locked.`,
    };
  }
  return {
    ready: false,
    provider: "none",
    from: FROM_TRITON,
    envelope: AGENTMAIL_TRITON,
    hint: "A proof message already reached ayflow@pm.me. Add AGENTMAIL_API_KEY or RESEND_API_KEY so this UI can send the next campaign. Seed addresses stay locked.",
  };
}
