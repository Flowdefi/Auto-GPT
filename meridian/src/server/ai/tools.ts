import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";
import { analyticsSnapshot } from "../analytics";
import { companiesOf, contactsOf } from "../crm";
import { loadDb, mutate, nextId } from "../db";
import { enrichCompanyRecord, enrichContactRecord } from "../enrich";
import { portfoliosOf, updatePortfolio } from "../portfolios";
import { generateSocialPack } from "../social";
import { providerStatus } from "../mailer";
import { outlookStatus, syncAll } from "../outlook";
import { queryRag } from "../rag";
import { crawlSite } from "../seo/crawler";
import { buildBrief, optimizePage, researchKeywords, seoRankPlan } from "../seo/keywords";
import { applySeoFixes, autoImprove, improveEmailDraft, suggestImprovements } from "./improve";
import { createLead, runAutomations, setLeadStatus, sweepSla } from "../workflow";
import type { LeadStatus } from "../models";

export interface ToolContext {
  workspaceId: WorkspaceId;
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** Read tools are safe to auto-run; write tools are logged and can be gated. */
  kind: "read" | "write";
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  run: (args: Record<string, string>, context: ToolContext) => Promise<unknown> | unknown;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const TOOLS: ToolDefinition[] = [
  {
    name: "platform_status",
    description: "Health of the whole platform: database counts, mail provider, Outlook, SEO crawls.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) => {
      const db = loadDb();
      return {
        workspace: workspaceOf(workspaceId).legalName,
        contacts: db.contacts.filter((row) => row.workspaceId === workspaceId).length,
        companies: db.companies.filter((row) => row.workspaceId === workspaceId).length,
        leads: db.leads.filter((row) => row.workspaceId === workspaceId).length,
        openTasks: db.tasks.filter((row) => row.workspaceId === workspaceId && row.status === "open").length,
        workflows: db.workflows.filter((row) => row.workspaceId === workspaceId && row.enabled).length,
        inboxMessages: db.inbox.filter((row) => row.workspaceId === workspaceId).length,
        graphNodes: db.nodes.filter((row) => row.workspaceId === workspaceId).length,
        crawls: db.crawls.filter((row) => row.workspaceId === workspaceId).length,
        mail: providerStatus(),
        outlook: outlookStatus(),
      };
    },
  },
  {
    name: "search_crm",
    description: "Search contacts and companies by name, email, domain, or title.",
    kind: "read",
    parameters: { query: { type: "string", description: "Search text", required: true } },
    run: (args, { workspaceId }) => {
      const query = (args.query ?? "").toLowerCase();
      const contacts = contactsOf(workspaceId)
        .filter((contact) =>
          `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.title}`.toLowerCase().includes(query),
        )
        .slice(0, 10);
      const companies = companiesOf(workspaceId)
        .filter((company) => `${company.name} ${company.domain} ${company.industry}`.toLowerCase().includes(query))
        .slice(0, 10);
      return { contacts, companies };
    },
  },
  {
    name: "query_knowledge",
    description: "Retrieve grounded context from the CRM knowledge graph and RAG index.",
    kind: "read",
    parameters: { prompt: { type: "string", description: "What to look up", required: true } },
    run: (args, { workspaceId }) => queryRag(workspaceId, args.prompt ?? "", 6),
  },
  {
    name: "list_leads",
    description: "List leads with score, band, owner, and SLA state. Optional status filter.",
    kind: "read",
    parameters: { status: { type: "string", description: "Lead status filter" } },
    run: (args, { workspaceId }) => {
      sweepSla(workspaceId);
      const db = loadDb();
      return db.leads
        .filter((lead) => lead.workspaceId === workspaceId)
        .filter((lead) => (args.status ? lead.status === args.status : true))
        .slice(0, 25)
        .map((lead) => ({
          id: lead.id,
          status: lead.status,
          side: lead.side,
          score: lead.score,
          band: lead.band,
          owner: lead.ownerId,
          slaBreached: lead.slaBreached,
          source: lead.source,
          contact: db.contacts.find((row) => row.id === lead.contactId)?.email,
          company: db.companies.find((row) => row.id === lead.companyId)?.name,
        }));
    },
  },
  {
    name: "create_lead",
    description: "Create a lead from an email address. Scores, routes, and fires automations.",
    kind: "write",
    parameters: {
      email: { type: "string", description: "Contact email", required: true },
      firstName: { type: "string", description: "First name" },
      lastName: { type: "string", description: "Last name" },
      company: { type: "string", description: "Company name" },
      message: { type: "string", description: "What they asked for" },
    },
    run: (args, { workspaceId }) => {
      const result = createLead({
        workspaceId,
        source: "ai-cto",
        payload: args.message ? { message: args.message } : {},
        contact: {
          workspaceId,
          email: args.email ?? "",
          firstName: args.firstName,
          lastName: args.lastName,
          companyName: args.company,
          tags: ["ai-created"],
        },
      });
      return { leadId: result.lead.id, score: result.lead.score, band: result.lead.band, owner: result.lead.ownerId };
    },
  },
  {
    name: "update_lead_status",
    description: "Move a lead through the lifecycle (mql, routed, accepted, sql, nurture, rejected, converted).",
    kind: "write",
    parameters: {
      leadId: { type: "string", description: "Lead id", required: true },
      status: { type: "string", description: "New status", required: true },
      reason: { type: "string", description: "Reason, required when rejecting" },
    },
    run: (args, { workspaceId }) =>
      setLeadStatus(workspaceId, args.leadId ?? "", (args.status ?? "routed") as LeadStatus, {
        reason: args.reason,
      }),
  },
  {
    name: "enrich_company",
    description: "Enrich a company from public sources: site metadata, schema, DNS, MX, socials, tech stack.",
    kind: "write",
    parameters: { companyId: { type: "string", description: "Company id", required: true } },
    run: (args, { workspaceId }) => enrichCompanyRecord(workspaceId, args.companyId ?? ""),
  },
  {
    name: "create_task",
    description: "Create a task for a rep.",
    kind: "write",
    parameters: {
      title: { type: "string", description: "Task title", required: true },
      ownerId: { type: "string", description: "Owner user id" },
      dueMinutes: { type: "string", description: "Minutes until due" },
      body: { type: "string", description: "Details" },
    },
    run: (args, { workspaceId }) =>
      mutate((db) => {
        const task = {
          id: nextId("tk"),
          workspaceId,
          title: args.title ?? "Follow up",
          body: args.body ?? "",
          ownerId: args.ownerId ?? "",
          dueAt: new Date(Date.now() + num(args.dueMinutes, 60) * 60_000).toISOString(),
          status: "open" as const,
          source: "ai-cto",
          createdAt: new Date().toISOString(),
        };
        db.tasks.unshift(task);
        return task;
      }),
  },
  {
    name: "run_automations",
    description: "Fire a workflow trigger manually against a subject.",
    kind: "write",
    parameters: {
      event: { type: "string", description: "Trigger event", required: true },
      subjectId: { type: "string", description: "Lead id", required: true },
    },
    run: (args, { workspaceId }) =>
      runAutomations(
        workspaceId,
        (args.event ?? "lead.created") as Parameters<typeof runAutomations>[1],
        "lead",
        args.subjectId ?? "",
      ),
  },
  {
    name: "sync_outlook",
    description: "Pull the Office 365 mailbox delta and associate messages to CRM records.",
    kind: "write",
    parameters: {},
    run: (_args, { workspaceId }) => syncAll(workspaceId),
  },
  {
    name: "seo_crawl",
    description: "Crawl a site and produce a technical audit with weighted issues.",
    kind: "write",
    parameters: {
      url: { type: "string", description: "Start URL" },
      maxPages: { type: "string", description: "Page cap" },
    },
    run: async (args, { workspaceId }) => {
      const start = args.url || (workspaceId === "triton" ? "https://www.debtmarket.net" : "https://aethermarkets.io");
      const result = await crawlSite({ workspaceId, startUrl: start, maxPages: num(args.maxPages, 25) });
      const db = loadDb();
      const crawl = db.crawls.find((row) => row.id === result.crawlId);
      const issues = db.seoIssues.filter((row) => row.crawlId === result.crawlId);
      return {
        health: crawl?.health,
        pages: crawl?.pagesCrawled,
        errors: issues.filter((issue) => issue.severity === "error").length,
        warnings: issues.filter((issue) => issue.severity === "warning").length,
        top: issues.slice(0, 8).map((issue) => `${issue.title} — ${issue.url}`),
      };
    },
  },
  {
    name: "seo_keywords",
    description: "Research keywords with intent, estimated volume, and difficulty.",
    kind: "read",
    parameters: { seed: { type: "string", description: "Seed topic" } },
    run: (args, { workspaceId }) => researchKeywords(workspaceId, { seed: args.seed, limit: 20 }),
  },
  {
    name: "seo_brief",
    description: "Generate an SEO content brief: title, meta, outline, questions, internal links.",
    kind: "write",
    parameters: {
      keyword: { type: "string", description: "Target keyword", required: true },
      targetUrl: { type: "string", description: "Page to optimize" },
    },
    run: (args, { workspaceId }) => buildBrief(workspaceId, args.keyword ?? "", args.targetUrl),
  },
  {
    name: "seo_optimize",
    description: "Score a crawled page against a keyword and list what to fix.",
    kind: "read",
    parameters: {
      url: { type: "string", description: "Page URL", required: true },
      keyword: { type: "string", description: "Target keyword", required: true },
    },
    run: (args, { workspaceId }) => optimizePage(workspaceId, args.url ?? "", args.keyword ?? ""),
  },
  {
    name: "list_email_lists",
    description: "Show marketing lists with sendable and locked counts.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) => {
      const db = loadDb();
      return db.lists
        .filter((list) => list.workspaceId === workspaceId)
        .map((list) => {
          const members = db.members.filter((member) => member.listId === list.id);
          return {
            id: list.id,
            name: list.name,
            total: members.length,
            sendable: members.filter((member) => member.subscribed && !member.seedLocked).length,
            locked: members.filter((member) => member.seedLocked).length,
          };
        });
    },
  },
  {
    name: "draft_campaign",
    description: "Draft a marketing email (subject, preview, HTML, text) and save it as a template.",
    kind: "write",
    parameters: {
      topic: { type: "string", description: "What the email is about", required: true },
      audience: { type: "string", description: "buyers | sellers" },
    },
    run: (args, { workspaceId }) => {
      const config = workspaceOf(workspaceId);
      const topic = args.topic ?? "portfolio update";
      const audience = args.audience === "buyers" ? "buyers" : "sellers";
      const subject =
        workspaceId === "triton"
          ? audience === "buyers"
            ? `New paper in market — ${topic}`
            : `{{company}}: a documented path to liquidity — ${topic}`
          : `Desk note — ${topic}`;

      const bodyHtml =
        workspaceId === "triton"
          ? `<p>Hello {{firstName}},</p><p>${
              audience === "buyers"
                ? `A new book is in market on DebtMarket regarding ${topic}. Qualified buyers with a current license pack can request data-room access. Bids are sealed and tapes are never attached to email.`
                : `Triton Financial Solutions operates DebtMarket as a buyer, broker, and marketplace for charged-off receivables. We do not contact consumers. On ${topic}, we can run a documented 14–45 day process: NDA, data room, sealed bids, award, fund.`
            }</p><p>Reply here or write portfolios@debtmarket.net.</p>`
          : `<p>Hello {{firstName}},</p><p>Aether Desk is covering ${topic} with documented settlement rails and IVMS-101 Travel Rule support.</p>`;

      return mutate((db) => {
        const template = {
          id: nextId("tpl"),
          workspaceId,
          name: `AI draft — ${topic}`.slice(0, 60),
          subject,
          previewText:
            workspaceId === "triton"
              ? "Institutional marketplace — not a collection agency."
              : "Institutional desk coverage.",
          html: `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Helvetica,Arial,sans-serif;color:#13202d;"><div style="display:none;max-height:0;overflow:hidden;">{{previewText}}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;"><tr><td style="background:${
            workspaceId === "triton" ? "#0c1620" : "#070d13"
          };color:${config.theme.accent};padding:20px 28px;font-size:13px;letter-spacing:.16em;text-transform:uppercase;">${
            config.product
          } · ${config.legalName}</td></tr><tr><td style="padding:28px;">${bodyHtml}</td></tr><tr><td style="padding:0 28px 28px;font-size:12px;color:#5f7890;line-height:1.6;">${
            config.legalName
          } · ${config.city} · United States<br/>${
            workspaceId === "triton"
              ? "Institutional inquiries only. We do not contact consumers about individual debts.<br/>"
              : "Institutional counterparties only.<br/>"
          }<a href="{{unsubscribeUrl}}">Unsubscribe</a> · ${config.email} · ${config.phone}</td></tr></table></td></tr></table></body></html>`,
          text: `Hello {{firstName}},\n\n${topic}\n\nReply to ${config.email}\nUnsubscribe: {{unsubscribeUrl}}`,
        };
        db.templates.unshift(template);
        return { templateId: template.id, subject: template.subject };
      });
    },
  },
  {
    name: "list_improvements",
    description: "Preview recommended fixes without applying them.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) => suggestImprovements(workspaceId),
  },
  {
    name: "suggest_improvements",
    description: "Scan SLA breaches, missing SEO titles, unenriched companies, and stale leads. Read only.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) => suggestImprovements(workspaceId),
  },
  {
    name: "improve_email",
    description: "Rewrite a subject and body to lower the spam score and strip collection language.",
    kind: "read",
    parameters: {
      subject: { type: "string", description: "Current subject", required: true },
      body: { type: "string", description: "Plain or HTML body" },
    },
    run: (args) =>
      improveEmailDraft({
        subject: args.subject ?? "",
        html: args.body ?? "",
        text: args.body ?? "",
      }),
  },
  {
    name: "apply_seo_fixes",
    description: "Fill missing titles and meta descriptions on the latest crawl.",
    kind: "write",
    parameters: {},
    run: (_args, { workspaceId }) => applySeoFixes(workspaceId),
  },
  {
    name: "auto_improve",
    description: "Sweep SLAs, re-associate inbox, seed segments/keywords, and list the next recommended fixes.",
    kind: "write",
    parameters: {},
    run: (_args, { workspaceId }) => autoImprove(workspaceId),
  },
  {
    name: "list_portfolios",
    description: "List marketplace portfolios with seller, seller price, face value, debt type, and date last worked.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) =>
      portfoliosOf(workspaceId).map((row) => ({
        id: row.id,
        name: row.name,
        seller: row.sellerName,
        sellerPrice: row.sellerPrice,
        faceValue: row.faceValue,
        debtType: row.debtType,
        accountCount: row.accountCount,
        geography: row.geography,
        states: row.states,
        dateListed: row.dateListed,
        dateLastWorked: row.dateLastWorked,
        status: row.status,
        possibleBuyers: row.possibleBuyers,
      })),
  },
  {
    name: "update_portfolio",
    description: "Update a portfolio field and append a history entry. Does not replace history.",
    kind: "write",
    parameters: {
      id: { type: "string", description: "Portfolio id", required: true },
      name: { type: "string", description: "Portfolio name" },
      seller: { type: "string", description: "Seller company name or id" },
      sellerPrice: { type: "string", description: "Seller asking price" },
      faceValue: { type: "string", description: "Face value" },
      notes: { type: "string", description: "Notes" },
      debtType: { type: "string", description: "Type of debt" },
      possibleBuyers: { type: "string", description: "Possible buyers" },
      dateLastWorked: { type: "string", description: "YYYY-MM-DD" },
    },
    run: (args, { workspaceId }) => {
      const price = args.sellerPrice ? Number(args.sellerPrice) : undefined;
      const face = args.faceValue ? Number(args.faceValue) : undefined;
      if (args.sellerPrice && !Number.isFinite(price)) throw new Error("sellerPrice must be a number");
      if (args.faceValue && !Number.isFinite(face)) throw new Error("faceValue must be a number");
      return updatePortfolio(
        workspaceId,
        args.id ?? "",
        {
          name: args.name,
          seller: args.seller,
          sellerPrice: price,
          faceValue: face,
          notes: args.notes,
          debtType: args.debtType,
          possibleBuyers: args.possibleBuyers,
          dateLastWorked: args.dateLastWorked,
        },
        "ai-cto",
      );
    },
  },
  {
    name: "draft_social",
    description: "Draft a social pack for X, Facebook, Google Business, and LinkedIn. Stores drafts. Does not publish.",
    kind: "write",
    parameters: {},
    run: (_args, { workspaceId }) => {
      const posts = generateSocialPack(workspaceId);
      return posts.map((post) => ({ id: post.id, channel: post.channel, status: post.status, body: post.body }));
    },
  },
  {
    name: "seo_rank_plan",
    description: "Path to #1 for tracked keywords. Uses stored rank points only and never invents a position.",
    kind: "read",
    parameters: { keyword: { type: "string", description: "Optional keyword filter" } },
    run: (args, { workspaceId }) => seoRankPlan(workspaceId, args.keyword),
  },
  {
    name: "analytics_summary",
    description: "Live counts: leads, SLA breaches, tasks, portfolio value, email delivery, forms, SEO health, first-party page views.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) => analyticsSnapshot(workspaceId),
  },
  {
    name: "enrich_contact",
    description: "Enrich a contact from Gravatar, Wikidata, and the corporate domain. No API key.",
    kind: "write",
    parameters: { contactId: { type: "string", description: "Contact id", required: true } },
    run: (args, { workspaceId }) => enrichContactRecord(workspaceId, args.contactId ?? ""),
  },
  {
    name: "recent_inbox",
    description: "Most recent synced emails with their CRM association.",
    kind: "read",
    parameters: {},
    run: (_args, { workspaceId }) => {
      const db = loadDb();
      return db.inbox
        .filter((message) => message.workspaceId === workspaceId)
        .slice(0, 15)
        .map((message) => ({
          from: message.from,
          subject: message.subject,
          receivedAt: message.receivedAt,
          matchedBy: message.matchedBy,
          contactId: message.contactId,
        }));
    },
  },
];

export function toolByName(name: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

export function toolCatalog() {
  return TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    kind: tool.kind,
    parameters: tool.parameters,
  }));
}

export async function executeTool(
  name: string,
  args: Record<string, string>,
  context: ToolContext,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const tool = toolByName(name);
  if (!tool) return { ok: false, error: `Unknown tool "${name}"` };

  for (const [key, spec] of Object.entries(tool.parameters)) {
    if (spec.required && !args[key]) {
      return { ok: false, error: `${name} requires "${key}"` };
    }
  }

  try {
    const result = await tool.run(args, context);
    mutate((db) => {
      db.aiAudit.unshift({
        id: nextId("aud"),
        workspaceId: context.workspaceId,
        actor: "cto",
        tool: name,
        args,
        ok: true,
        summary: `${tool.kind} · ${name}`,
        at: new Date().toISOString(),
      });
      if (db.aiAudit.length > 300) db.aiAudit.length = 300;
    });
    return { ok: true, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool failed";
    mutate((db) => {
      db.aiAudit.unshift({
        id: nextId("aud"),
        workspaceId: context.workspaceId,
        actor: "cto",
        tool: name,
        args,
        ok: false,
        summary: message,
        at: new Date().toISOString(),
      });
    });
    return { ok: false, error: message };
  }
}
