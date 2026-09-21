import type { WorkspaceId } from "@/lib/types";
import { workspaceOf } from "@/lib/workspaces";
import { queryRagAsync } from "../rag";
import { pickRole, resolveModels } from "./models";
import { executeTool, toolCatalog } from "./tools";

/**
 * The CTO agent runs against any OpenAI-compatible endpoint, so it works with
 * self-hosted Ollama, llama.cpp, or vLLM as well as a hosted API. With no
 * endpoint configured it falls back to a deterministic planner that still calls
 * the same tools — the platform stays useful without a model key.
 */
export interface LlmConfig {
  baseUrl: string;
  apiKey?: string;
  model: string;
}

export function llmConfig(): LlmConfig | null {
  const resolved = resolveModels();
  if (!resolved.configured) return null;
  if (resolved.provider === "anthropic" && resolved.apiKey) {
    return { baseUrl: resolved.baseUrl ?? "https://api.anthropic.com/v1", apiKey: resolved.apiKey, model: resolved.reasoner };
  }
  if (!resolved.baseUrl) return null;
  return { baseUrl: resolved.baseUrl, apiKey: resolved.apiKey, model: resolved.reasoner };
}

export function llmStatus(): {
  configured: boolean;
  model?: string;
  fast?: string;
  embed?: string;
  hint: string;
} {
  const resolved = resolveModels();
  return {
    configured: resolved.configured,
    model: resolved.reasoner,
    fast: resolved.fast,
    embed: resolved.embed,
    hint: resolved.hint,
  };
}

export function systemPrompt(workspaceId: WorkspaceId): string {
  const config = workspaceOf(workspaceId);
  const guardrails =
    workspaceId === "triton"
      ? `${config.legalName} is a buyer, broker, and marketplace for charged-off receivables. It is NOT a collection agency and never contacts consumers about individual debts. All marketing mail comes from ${config.email}. Never draft consumer-facing collection language. Medical paper requires a BAA before tape detail.`
      : `${config.legalName} is an institutional digital-asset desk. Institutional counterparties only, never retail onboarding. Travel Rule (IVMS-101) applies at or above $3,000.`;

  return `You are the CTO of Meridian, the customer platform for ${config.legalName} (${config.product}).

You have root access to the platform through tools: CRM records, leads, workflows, email, Office 365 sync, the knowledge graph, and the SEO suite. You can read and you can write.

Operating rules:
- Prefer calling a tool over guessing. Ground every number in a tool result.
- Say plainly what you changed when you write. Every write is audited.
- ${guardrails}
- Be concise and concrete. A sentence that states a number beats a paragraph that hedges.

Available tools:
${toolCatalog()
  .map((tool) => `- ${tool.name} (${tool.kind}): ${tool.description}`)
  .join("\n")}

When you want to call a tool, emit a line of exactly this form and nothing else on that line:
TOOL: <name> {"arg":"value"}
You may call several tools across turns. When you have enough, answer normally.`;
}

export interface CtoPage {
  pathname?: string;
  recordId?: string;
}

export interface CtoTurn {
  reply: string;
  toolCalls: Array<{ name: string; args: Record<string, string>; ok: boolean; result?: unknown; error?: string }>;
  grounded: string[];
  model: string;
}

const TOOL_LINE = /^TOOL:\s*([a-z_]+)\s*(\{[\s\S]*?\})?\s*$/im;

async function chatAnthropic(apiKey: string, model: string, messages: Array<{ role: string; content: string }>): Promise<string> {
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const turns = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content }));
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1200, system, messages: turns }),
  });
  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const payload = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  return payload.content?.map((block) => block.text ?? "").join("\n") ?? "";
}

async function chat(config: LlmConfig, messages: Array<{ role: string; content: string }>): Promise<string> {
  const resolved = resolveModels();
  if (resolved.provider === "anthropic" && resolved.apiKey) {
    return chatAnthropic(resolved.apiKey, config.model, messages);
  }
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: config.model, messages, temperature: 0.3, stream: false }),
  });
  if (!response.ok) {
    throw new Error(`Model endpoint ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content ?? "";
}

/** Keyword planner used when no model endpoint is configured. */
function planLocally(prompt: string): Array<{ name: string; args: Record<string, string> }> {
  const lower = prompt.toLowerCase();
  const plan: Array<{ name: string; args: Record<string, string> }> = [];

  if (/status|health|how are we|overview|what.*(running|configured)/.test(lower)) {
    plan.push({ name: "platform_status", args: {} });
  }
  if (/lead/.test(lower)) {
    plan.push({ name: "list_leads", args: {} });
  }
  if (/sla|breach|overdue|late/.test(lower)) {
    plan.push({ name: "list_leads", args: {} });
  }
  if (/crawl|audit|site health|technical seo|fix.*site/.test(lower)) {
    plan.push({ name: "seo_crawl", args: { maxPages: "20" } });
  }
  if (/keyword|rank|search volume|difficulty/.test(lower)) {
    const seed = lower.match(/(?:for|about|on)\s+["']?([a-z0-9 \-]{4,48})["']?/)?.[1];
    plan.push({ name: "seo_keywords", args: seed ? { seed } : {} });
  }
  if (/brief|outline|write.*(article|post|page)/.test(lower)) {
    const keyword = lower.match(/["']([^"']{4,60})["']/)?.[1] ?? "sell charged off debt";
    plan.push({ name: "seo_brief", args: { keyword } });
  }
  if (/email|campaign|blast|newsletter|draft.*mail/.test(lower)) {
    plan.push({ name: "list_email_lists", args: {} });
    const topic = prompt.replace(/^.*?(?:about|for|on)\s+/i, "").slice(0, 60) || "portfolio update";
    plan.push({ name: "draft_campaign", args: { topic, audience: /buyer/.test(lower) ? "buyers" : "sellers" } });
  }
  if (/automation|workflow|firing/.test(lower)) {
    plan.push({ name: "suggest_improvements", args: {} });
  }
  if (/inbox|outlook|mail sync|emails from/.test(lower)) {
    plan.push({ name: "recent_inbox", args: {} });
  }
  if (/enrich/.test(lower)) {
    plan.push({ name: "search_crm", args: { query: prompt.split(/\s+/).slice(-2).join(" ") } });
  }
  if (/suggest|what should we|recommend/.test(lower)) {
    plan.push({ name: "suggest_improvements", args: {} });
  }
  if (/auto-?improve|fix (the )?(platform|app)/.test(lower)) {
    plan.push({ name: "auto_improve", args: {} });
  }
  if (/subject line|rewrite.*(email|subject)|spam score/.test(lower)) {
    plan.push({ name: "improve_email", args: { subject: prompt.slice(0, 120), body: prompt } });
  }
  if (/meta description|title tag|apply seo|on-page fix/.test(lower)) {
    plan.push({ name: "apply_seo_fixes", args: {} });
  }
  if (plan.length === 0) {
    plan.push({ name: "query_knowledge", args: { prompt } });
  }
  return plan;
}

function summarize(prompt: string, calls: CtoTurn["toolCalls"], grounded: string[]): string {
  const lines: string[] = [];

  for (const call of calls) {
    if (!call.ok) {
      lines.push(`\`${call.name}\` failed: ${call.error}`);
      continue;
    }
    const result = call.result;

    if (call.name === "platform_status" && result && typeof result === "object") {
      const status = result as Record<string, unknown>;
      lines.push(
        `Platform: ${status.contacts} contacts, ${status.companies} companies, ${status.leads} leads, ${status.openTasks} open tasks, ${status.workflows} live workflows, ${status.graphNodes} graph nodes.`,
      );
      const mail = status.mail as { ready?: boolean; provider?: string } | undefined;
      const outlook = status.outlook as { configured?: boolean } | undefined;
      lines.push(
        `Mail provider ${mail?.ready ? mail.provider : "not configured"}. Office 365 ${outlook?.configured ? "connected" : "not connected"}.`,
      );
      continue;
    }

    if (call.name === "list_leads" && Array.isArray(result)) {
      const leads = result as Array<Record<string, unknown>>;
      if (leads.length === 0) {
        lines.push("No leads yet. The website form endpoint will create them as they arrive.");
      } else {
        const breached = leads.filter((lead) => lead.slaBreached).length;
        lines.push(`${leads.length} leads. ${breached} past SLA.`);
        for (const lead of leads.slice(0, 5)) {
          lines.push(
            `• ${lead.company ?? lead.contact} — ${lead.band} (${lead.score}) · ${lead.status} · owner ${lead.owner || "unassigned"}${lead.slaBreached ? " · SLA BREACHED" : ""}`,
          );
        }
      }
      continue;
    }

    if (call.name === "seo_crawl" && result && typeof result === "object") {
      const crawl = result as Record<string, unknown>;
      lines.push(`Crawled ${crawl.pages} pages. Site health ${crawl.health}/100 — ${crawl.errors} errors, ${crawl.warnings} warnings.`);
      for (const issue of (crawl.top as string[] | undefined) ?? []) lines.push(`• ${issue}`);
      continue;
    }

    if (call.name === "seo_keywords" && Array.isArray(result)) {
      const keywords = result as Array<Record<string, unknown>>;
      lines.push("Best opportunity-to-difficulty keywords:");
      for (const keyword of keywords.slice(0, 8)) {
        lines.push(`• ${keyword.term} — vol ~${keyword.volume}, difficulty ${keyword.difficulty}, ${keyword.intent}`);
      }
      continue;
    }

    if (call.name === "seo_brief" && result && typeof result === "object") {
      const brief = result as Record<string, unknown>;
      lines.push(`Brief for "${brief.keyword}" — target ${brief.wordTarget} words.`);
      lines.push(`Title: ${brief.title}`);
      lines.push(`Meta: ${brief.metaDescription}`);
      for (const section of (brief.outline as Array<{ heading: string }> | undefined) ?? []) {
        lines.push(`• ${section.heading}`);
      }
      continue;
    }

    if (call.name === "draft_campaign" && result && typeof result === "object") {
      const draft = result as Record<string, unknown>;
      lines.push(`Drafted a campaign template (${draft.templateId}). Subject: "${draft.subject}". It is in Marketing → Email blast.`);
      continue;
    }

    if (call.name === "list_email_lists" && Array.isArray(result)) {
      for (const list of result as Array<Record<string, unknown>>) {
        lines.push(`• ${list.name}: ${list.sendable} sendable, ${list.locked} locked`);
      }
      continue;
    }

    if (call.name === "recent_inbox" && Array.isArray(result)) {
      const messages = result as Array<Record<string, unknown>>;
      if (messages.length === 0) {
        lines.push("No synced mail yet. Connect Office 365 in Integrations, then run a sync.");
      } else {
        for (const message of messages.slice(0, 6)) {
          lines.push(`• ${message.from} — ${message.subject} (${message.matchedBy})`);
        }
      }
      continue;
    }

    if (call.name === "search_crm" && result && typeof result === "object") {
      const hits = result as { contacts?: unknown[]; companies?: unknown[] };
      lines.push(`${hits.contacts?.length ?? 0} contacts and ${hits.companies?.length ?? 0} companies matched.`);
      continue;
    }

    if (call.name === "improve_email" && result && typeof result === "object") {
      const draft = result as { subject?: string; before?: { score?: number; verdict?: string }; after?: { score?: number; verdict?: string } };
      lines.push(`Rewrote the subject to "${draft.subject}". Spam ${draft.before?.score} (${draft.before?.verdict}) → ${draft.after?.score} (${draft.after?.verdict}).`);
      continue;
    }

    if (call.name === "apply_seo_fixes" && result && typeof result === "object") {
      const fixes = (result as { fixes?: Array<{ url: string; title: string }> }).fixes ?? [];
      if (fixes.length === 0) lines.push("No crawled pages were missing a title or meta description.");
      for (const fix of fixes) lines.push(`• ${fix.title} — ${fix.url}`);
      continue;
    }

    if ((call.name === "auto_improve" || call.name === "list_improvements" || call.name === "suggest_improvements") && result && typeof result === "object") {
      const run = result as { applied?: Array<{ title: string; detail: string }>; proposed?: Array<{ title: string; detail: string }> };
      if (run.applied?.length) {
        lines.push("Applied:");
        for (const item of run.applied) lines.push(`• ${item.title} — ${item.detail}`);
      }
      if (run.proposed?.length) {
        lines.push("Recommended next:");
        for (const item of run.proposed) lines.push(`• ${item.title} — ${item.detail}`);
      }
      continue;
    }

    lines.push(`\`${call.name}\` ran.`);
  }

  if (grounded.length) {
    lines.push("", "Grounded in:", ...grounded.map((item) => `• ${item}`));
  }

  if (lines.length === 0) {
    lines.push(`I did not find a tool that answers "${prompt}". Try asking about leads, SEO, email, or platform status.`);
  }

  return lines.join("\n");
}

export async function runCto(
  workspaceId: WorkspaceId,
  prompt: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  page: CtoPage = {},
): Promise<CtoTurn> {
  const context = { workspaceId };
  const calls: CtoTurn["toolCalls"] = [];
  const rag = await queryRagAsync(workspaceId, prompt, 4);
  const grounded = rag.map((hit) => `${hit.title} (${hit.kind})`);
  const pageNote = [page.pathname ? `page ${page.pathname}` : "", page.recordId ? `record ${page.recordId}` : ""]
    .filter(Boolean)
    .join(", ");

  const resolved = resolveModels();
  const config = llmConfig();
  const role = pickRole(prompt);
  const activeModel = role === "fast" ? resolved.fast : resolved.reasoner;

  if (!config) {
    for (const step of planLocally(prompt)) {
      const outcome = await executeTool(step.name, step.args, context);
      calls.push({ name: step.name, args: step.args, ...outcome });
    }
    return { reply: summarize(prompt, calls, grounded), toolCalls: calls, grounded, model: "built-in planner" };
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt(workspaceId) },
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    {
      role: "user",
      content: [
        pageNote ? `[You are looking at ${pageNote}]` : "",
        prompt,
        rag.length ? `[Retrieved context]\n${rag.map((hit) => `- ${hit.title}: ${hit.text}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  let reply = "";
  let usedModel = activeModel;
  for (let hop = 0; hop < 4; hop += 1) {
    const hopModel = hop === 0 && role === "fast" ? activeModel : config.model;
    usedModel = hopModel;
    const raw = await chat({ ...config, model: hopModel }, messages);
    const match = raw.match(TOOL_LINE);
    if (!match) {
      reply = raw.trim();
      break;
    }

    const name = match[1]!;
    let args: Record<string, string> = {};
    try {
      args = match[2] ? (JSON.parse(match[2]) as Record<string, string>) : {};
    } catch {
      args = {};
    }

    const outcome = await executeTool(name, args, context);
    calls.push({ name, args, ...outcome });
    messages.push({ role: "assistant", content: raw });
    messages.push({
      role: "user",
      content: `[tool ${name} result]\n${JSON.stringify(outcome.result ?? outcome.error).slice(0, 4000)}`,
    });
    reply = raw.replace(TOOL_LINE, "").trim();
  }

  return {
    reply: reply || summarize(prompt, calls, grounded),
    toolCalls: calls,
    grounded,
    model: usedModel,
  };
}
