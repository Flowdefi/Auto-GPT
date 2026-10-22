import type { DatabaseFile } from "./models";
import { tokenize } from "./tokenize";

const LIVE = "live:";

function clip(text: string, max = 700): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max).trim()}…`;
}

/**
 * Rebuild graph chunks for the live CRM so RAG sees contacts, companies,
 * leads, inbox, SEO issues, and workflows — not only the seed knowledge base.
 */
export function indexLiveRecords(db: DatabaseFile): void {
  db.nodes = db.nodes.filter((node) => !node.id.startsWith(LIVE));
  db.chunks = db.chunks.filter((chunk) => !chunk.id.startsWith(LIVE));

  const add = (workspaceId: DatabaseFile["companies"][number]["workspaceId"], kind: string, refId: string, title: string, text: string) => {
    const body = clip(text);
    if (!body) return;
    const id = `${LIVE}${kind}:${refId}`;
    db.nodes.push({
      id,
      workspaceId,
      kind,
      refId,
      label: title,
      text: body,
    });
    db.chunks.push({
      id,
      workspaceId,
      nodeId: id,
      title,
      text: body,
      terms: tokenize(`${title} ${body}`).slice(0, 48),
    });
  };

  for (const company of db.companies) {
    add(
      company.workspaceId,
      "company",
      company.id,
      company.name,
      `${company.domain} ${company.industry} ${company.city} ${company.state} ${company.type} ${company.notes}`,
    );
  }

  for (const contact of db.contacts) {
    const company = db.companies.find((row) => row.id === contact.companyId);
    add(
      contact.workspaceId,
      "contact",
      contact.id,
      `${contact.firstName} ${contact.lastName}`.trim() || contact.email,
      `${contact.email} ${contact.title} ${contact.lifecycle} ${company?.name ?? ""} ${contact.tags.join(" ")}`,
    );
  }

  for (const lead of db.leads) {
    const contact = db.contacts.find((row) => row.id === lead.contactId);
    const company = db.companies.find((row) => row.id === lead.companyId);
    add(
      lead.workspaceId,
      "lead",
      lead.id,
      `${company?.name ?? contact?.email ?? "Lead"} · ${lead.status}`,
      `${lead.side} score ${lead.score} ${lead.band} owner ${lead.ownerId ?? "unassigned"} ${lead.notes} ${lead.source} ${Object.values(lead.payload).join(" ")}`,
    );
  }

  const inboxByWorkspace = new Map<string, number>();
  for (const message of db.inbox) {
    const seen = inboxByWorkspace.get(message.workspaceId) ?? 0;
    if (seen >= 40) continue;
    inboxByWorkspace.set(message.workspaceId, seen + 1);
    add(
      message.workspaceId,
      "inbox",
      message.id,
      message.subject || "(no subject)",
      `From ${message.fromName} ${message.from}. ${message.preview} ${message.body}`,
    );
  }

  const issuesByWorkspace = new Map<string, number>();
  for (const issue of db.seoIssues) {
    const seen = issuesByWorkspace.get(issue.workspaceId) ?? 0;
    if (seen >= 30) continue;
    issuesByWorkspace.set(issue.workspaceId, seen + 1);
    add(issue.workspaceId, "seo-issue", issue.id, issue.title, `${issue.severity} ${issue.url} ${issue.detail} ${issue.recommendation}`);
  }

  for (const portfolio of db.portfolios) {
    add(
      portfolio.workspaceId,
      "portfolio",
      portfolio.id,
      portfolio.name,
      `${portfolio.sellerName} ${portfolio.debtType} face ${portfolio.faceValue} seller price ${portfolio.sellerPrice} ${portfolio.geography} ${portfolio.states.join(" ")} last worked ${portfolio.dateLastWorked} ${portfolio.notes} buyers ${portfolio.possibleBuyers}`,
    );
  }

  for (const workflow of db.workflows) {
    add(
      workflow.workspaceId,
      "workflow",
      workflow.id,
      workflow.name,
      `${workflow.enabled ? "enabled" : "paused"} on ${workflow.trigger.event}. ${workflow.description}`,
    );
  }
}
