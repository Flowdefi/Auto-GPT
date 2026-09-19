import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import { workspaceOf } from "@/lib/workspaces";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { tokenize } from "./tokenize";
import type {
  DatabaseFile,
  EmailList,
  EmailListMember,
  EmailTemplate,
  GraphEdge,
  GraphNode,
  RagChunk,
} from "./models";

function node(
  workspaceId: WorkspaceId,
  kind: string,
  refId: string,
  label: string,
  text: string,
): GraphNode {
  return {
    id: `${workspaceId}:${kind}:${refId}`,
    workspaceId,
    kind,
    refId,
    label,
    text,
  };
}

function edge(
  workspaceId: WorkspaceId,
  src: string,
  dst: string,
  rel: string,
  weight = 1,
): GraphEdge {
  return {
    id: `${src}|${rel}|${dst}`,
    workspaceId,
    src,
    dst,
    rel,
    weight,
  };
}

function chunkFromNode(nodeRow: GraphNode): RagChunk {
  return {
    id: `chk_${nodeRow.id}`,
    workspaceId: nodeRow.workspaceId,
    nodeId: nodeRow.id,
    title: nodeRow.label,
    text: nodeRow.text,
    terms: tokenize(`${nodeRow.label} ${nodeRow.text}`),
  };
}

function indexWorkspace(workspaceId: WorkspaceId, data: WorkspaceData, db: DatabaseFile): void {
  const config = workspaceOf(workspaceId);
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  nodes.push(
    node(
      workspaceId,
      "workspace",
      workspaceId,
      config.legalName,
      `${config.legalName} ${config.product} ${config.tagline} ${config.complianceBadges.join(" ")} From ${config.email}`,
    ),
  );

  for (const company of data.companies) {
    nodes.push(
      node(
        workspaceId,
        "company",
        company.id,
        company.name,
        `${company.name} ${company.type} ${company.industry} ${company.city} ${company.state} ${company.notes}`,
      ),
    );
    edges.push(edge(workspaceId, `${workspaceId}:workspace:${workspaceId}`, `${workspaceId}:company:${company.id}`, "HAS_ACCOUNT"));
  }

  for (const contact of data.contacts) {
    nodes.push(
      node(
        workspaceId,
        "contact",
        contact.id,
        `${contact.firstName} ${contact.lastName}`,
        `${contact.firstName} ${contact.lastName} ${contact.title} ${contact.email} ${contact.tags.join(" ")} ${contact.lifecycle}`,
      ),
    );
    edges.push(
      edge(
        workspaceId,
        `${workspaceId}:contact:${contact.id}`,
        `${workspaceId}:company:${contact.companyId}`,
        "WORKS_AT",
      ),
    );
  }

  for (const item of data.inventory) {
    nodes.push(
      node(
        workspaceId,
        "inventory",
        item.id,
        item.name,
        `${item.name} ${item.kind} face ${item.faceValue} ask ${item.askingPrice} vintage ${item.vintage} media ${item.mediaQuality} ${item.notes} states ${item.states.join(" ")}`,
      ),
    );
    edges.push(
      edge(
        workspaceId,
        `${workspaceId}:inventory:${item.id}`,
        `${workspaceId}:company:${item.sellerCompanyId}`,
        "ISSUED_BY",
      ),
    );
  }

  for (const deal of data.deals) {
    nodes.push(
      node(
        workspaceId,
        "deal",
        deal.id,
        deal.name,
        `${deal.name} stage ${deal.stage} amount ${deal.amount} forecast ${deal.forecast} next ${deal.nextStep}`,
      ),
    );
    edges.push(edge(workspaceId, `${workspaceId}:deal:${deal.id}`, `${workspaceId}:company:${deal.companyId}`, "WITH_COMPANY"));
    edges.push(edge(workspaceId, `${workspaceId}:deal:${deal.id}`, `${workspaceId}:contact:${deal.contactId}`, "PRIMARY_CONTACT"));
    if (deal.inventoryId) {
      edges.push(edge(workspaceId, `${workspaceId}:deal:${deal.id}`, `${workspaceId}:inventory:${deal.inventoryId}`, "COVERS"));
    }
  }

  for (const ticket of data.tickets) {
    nodes.push(
      node(workspaceId, "ticket", ticket.id, ticket.subject, `${ticket.subject} ${ticket.pipeline} ${ticket.preview}`),
    );
    edges.push(edge(workspaceId, `${workspaceId}:ticket:${ticket.id}`, `${workspaceId}:company:${ticket.companyId}`, "OPENED_BY"));
  }

  for (const page of data.pages) {
    nodes.push(node(workspaceId, "page", page.id, page.title, `${page.title} ${page.slug} ${page.excerpt}`));
  }

  for (const playbook of playbooks(workspaceId)) {
    nodes.push(node(workspaceId, "playbook", playbook.id, playbook.title, playbook.body));
  }

  db.nodes.push(...nodes);
  db.edges.push(...edges);
  db.chunks.push(...nodes.map(chunkFromNode));

  const buyers = data.contacts.filter((contact) => {
    const company = data.companies.find((row) => row.id === contact.companyId);
    return company?.type === "buyer" || contact.tags.includes("buyer") || contact.tags.includes("otc");
  });
  const sellers = data.contacts.filter((contact) => {
    const company = data.companies.find((row) => row.id === contact.companyId);
    return (
      company?.type === "seller" ||
      company?.type === "issuer" ||
      company?.type === "fund" ||
      contact.tags.includes("seller")
    );
  });

  const buyerList: EmailList = {
    id: `${workspaceId}_list_buyers`,
    workspaceId,
    name: workspaceId === "triton" ? "Qualified buyers" : "Desk counterparties",
    description: "Institutional buyers / trading counterparties. Seed addresses are locked until replaced.",
    kind: "buyers",
  };
  const sellerList: EmailList = {
    id: `${workspaceId}_list_sellers`,
    workspaceId,
    name: workspaceId === "triton" ? "Seller recoveries" : "Issuers & allocators",
    description: "Coverage list for sell-side / issuer outreach. Seed addresses are locked.",
    kind: "sellers",
  };
  const testList: EmailList = {
    id: `${workspaceId}_list_test`,
    workspaceId,
    name: "Proof of delivery",
    description: "Add a real inbox here. Seed CRM emails are never sent.",
    kind: "test",
  };

  db.lists.push(buyerList, sellerList, testList);
  db.members.push(
    ...buyers.map((contact) => memberFromContact(buyerList.id, contact, data)),
    ...sellers.map((contact) => memberFromContact(sellerList.id, contact, data)),
  );

  db.templates.push(...templatesFor(workspaceId));
}

function memberFromContact(
  listId: string,
  contact: WorkspaceData["contacts"][number],
  data: WorkspaceData,
): EmailListMember {
  const company = data.companies.find((row) => row.id === contact.companyId);
  return {
    id: `mem_${listId}_${contact.id}`,
    listId,
    email: contact.email.toLowerCase(),
    firstName: contact.firstName,
    lastName: contact.lastName,
    company: company?.name ?? "",
    contactId: contact.id,
    seedLocked: true,
    subscribed: true,
  };
}

function playbooks(workspaceId: WorkspaceId): Array<{ id: string; title: string; body: string }> {
  if (workspaceId === "triton") {
    return [
      {
        id: "pb_fcdpa",
        title: "Triton outbound email policy",
        body: "All marketing mail comes from portfolios@debtmarket.net. Triton is a debt buyer and broker of charged-off receivables, not a collection agency. Never discuss an individual consumer debt. Institutional counterparties only. Include physical address, unsubscribe, and no-consumer-contact line. Medical paper requires a BAA before any tape mention beyond process.",
      },
      {
        id: "pb_bid",
        title: "Bid window email pattern",
        body: "Buyer alerts state face, asking cents, media quality, vintage, bid deadline, and NDA/data-room status. Sealed bids. Put-backs for fraud and deceased. Do not attach tapes.",
      },
      {
        id: "pb_deliverability",
        title: "Outbound deliverability",
        body: "SPF, DKIM, and DMARC on debtmarket.net. List-Unsubscribe one-click. HTML plus plain text. Suppression on unsubscribe, bounce, and complaint. Seed CRM addresses stay locked. Rate-limit bulk sends. Physical address Coconut Creek FL in every footer.",
      },
      {
        id: "pb_asset_classes",
        title: "DebtMarket asset classes",
        body: "Credit card charge-off, auto deficiency, medical receivables, personal loans, telecom, private student loans, commercial paper, and fintech specialty. Typical close 14 to 45 days after a complete data room.",
      },
    ];
  }
  return [
    {
      id: "pb_travel",
      title: "Aether outbound email policy",
      body: "Institutional only. Travel Rule IVMS-101 on transfers at or above 3000 USD. Firm quotes on recorded lines. No retail onboarding from marketing lists.",
    },
  ];
}

function templatesFor(workspaceId: WorkspaceId): EmailTemplate[] {
  if (workspaceId === "triton") {
    return [
      {
        id: "tpl_triton_liquidity",
        workspaceId,
        name: "Q-charge-off liquidity",
        subject: "{{company}}: a 14–45 day path to liquidity",
        previewText: "Institutional marketplace — not a collection agency.",
        html: tritonHtml(
          "A cleaner path to liquidity",
          "<p>Hello {{firstName}},</p><p>Triton Financial Solutions operates DebtMarket as a <strong>buyer, broker, and marketplace</strong> for charged-off receivables. We do not contact consumers.</p><p>If {{company}} is monetizing credit-card, auto deficiency, personal-loan, medical, or fintech paper this quarter, we can run a documented 14–45 day process: NDA, data room, sealed bids, award, fund.</p><p>Reply to this email or write portfolios@debtmarket.net with asset class and approximate face.</p>",
        ),
        text: "Hello {{firstName}},\n\nTriton Financial Solutions operates DebtMarket as a buyer, broker, and marketplace for charged-off receivables. We do not contact consumers.\n\nIf {{company}} is monetizing paper this quarter, we can run a documented 14-45 day process.\n\nReply to portfolios@debtmarket.net\nUnsubscribe: {{unsubscribeUrl}}",
      },
      {
        id: "tpl_triton_bid",
        workspaceId,
        name: "Fresh primary bid alert",
        subject: "DebtMarket: fresh primary in market — sealed bids",
        previewText: "Face, media, and deadline — institutional buyers only.",
        html: tritonHtml(
          "Sealed bid window",
          "<p>{{firstName}}, a fresh primary book is in market on DebtMarket.</p><p>Qualified buyers with a current license pack can request data-room access. Bids are sealed. We will not share tapes over email.</p><p>Reply if {{company}} wants the package.</p>",
        ),
        text: "{{firstName}}, a fresh primary book is in market on DebtMarket. Qualified buyers can request the data room. Tapes are not sent over email.\nUnsubscribe: {{unsubscribeUrl}}",
      },
    ];
  }
  return [
    {
      id: "tpl_aether_otc",
      workspaceId,
      name: "OTC desk intro",
      subject: "{{company}} — firm quotes, Travel Rule, qualified custody",
      previewText: "Institutional blocks without the group chat.",
      html: "<p>Hello {{firstName}},</p><p>Aether Desk works institutional BTC/ETH blocks with documented settlement rails and IVMS-101 Travel Rule support.</p><p>Unsubscribe: {{unsubscribeUrl}}</p>",
      text: "Hello {{firstName}}, Aether Desk works institutional blocks with Travel Rule support.\nUnsubscribe: {{unsubscribeUrl}}",
    },
  ];
}

function tritonHtml(heading: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;background:#f4f6f8;font-family:Source Sans 3,Helvetica,Arial,sans-serif;color:#13202d;">
  <div style="display:none;max-height:0;overflow:hidden;">{{previewText}}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#0c1620;color:#c9a24a;padding:20px 28px;font-size:13px;letter-spacing:.16em;text-transform:uppercase;">DebtMarket · Triton Financial Solutions</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 16px;font-size:24px;">${heading}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:0 28px 28px;font-size:12px;color:#5f7890;line-height:1.6;">
          Triton Financial Solutions, LLC · Coconut Creek, FL · United States<br/>
          Institutional inquiries only. We do not contact consumers about individual debts.<br/>
          <a href="{{unsubscribeUrl}}">Unsubscribe</a> · portfolios@debtmarket.net · +1 (561) 254-6608
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function seedServerData(db: DatabaseFile): DatabaseFile {
  const next = emptyLike(db);
  indexWorkspace("triton", seedTriton(), next);
  indexWorkspace("aether", seedAether(), next);
  return next;
}

function emptyLike(_db: DatabaseFile): DatabaseFile {
  return {
    version: 1,
    lists: [],
    members: [],
    templates: [],
    campaigns: [],
    messages: [],
    suppressions: [],
    events: [],
    nodes: [],
    edges: [],
    chunks: [],
    companies: [],
    contacts: [],
    leads: [],
    submissions: [],
    inbox: [],
    mailboxes: [],
    workflows: [],
    runs: [],
    tasks: [],
    crawls: [],
    seoPages: [],
    seoIssues: [],
    keywords: [],
    ranks: [],
    briefs: [],
    segments: [],
    aiAudit: [],
  };
}
