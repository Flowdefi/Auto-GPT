import type { WorkspaceId } from "./types";

interface PromptRule {
  match: RegExp;
  triton: string[];
  aether: string[];
}

/**
 * Suggested prompts are derived from the route the user is standing on, so the
 * AI opens with work that is relevant to the screen rather than generic starters.
 */
const RULES: PromptRule[] = [
  {
    match: /\/leads/,
    triton: [
      "Which leads breach SLA next?",
      "Qualify the newest inbound lead",
      "Draft a first-touch email for the top lead",
      "Why is this lead scored the way it is?",
    ],
    aether: ["Which desk leads are hot?", "Draft an RFQ reply", "Score the newest counterparty"],
  },
  {
    match: /\/crm\/contacts/,
    triton: [
      "Enrich this contact from Gravatar and Wikidata",
      "What phone, title, LinkedIn, and notes are missing?",
      "Draft a coverage note for this seller contact",
      "Summarize this contact's lifecycle and score",
    ],
    aether: [
      "Enrich this contact from public sources",
      "What title, city, and LinkedIn are missing?",
      "Draft a desk intro for this counterparty",
    ],
  },
  {
    match: /\/crm\/companies/,
    triton: ["Enrich this company", "Who else should we know here?", "Draft a seller coverage plan"],
    aether: ["Enrich this firm", "Map the trading relationship", "Draft a custody intro"],
  },
  {
    match: /\/sales\/deals/,
    triton: [
      "Score this portfolio",
      "What is the fair bid range?",
      "Draft the next-step email",
      "What risks should I flag to compliance?",
    ],
    aether: ["Price this block", "Draft a firm quote", "Summarize settlement risk"],
  },
  {
    match: /\/sales\/forecast/,
    triton: ["Forecast September", "Which deals are at risk?", "Explain the weighted pipeline"],
    aether: ["Forecast desk revenue", "Which mandates slip?", "Explain the pipeline"],
  },
  {
    match: /\/marketing\/social/,
    triton: [
      "Draft this week's social pack for the newest portfolio",
      "Write a LinkedIn post that says marketplace, not a collection agency",
      "Give me an X post under 280 characters for the open tape",
      "Mark the Google Business draft scheduled after I review it",
    ],
    aether: [
      "Draft a four-channel social pack for the newest block",
      "Write a LinkedIn note for the desk",
      "Give me a short X post for the open RFQ",
    ],
  },
  {
    match: /\/marketing\/bulk/,
    triton: [
      "Write a buyer alert for the newest portfolio",
      "Improve this subject line",
      "Check this email for FDCPA language",
      "Which segment should receive this?",
    ],
    aether: ["Draft an OTC desk blast", "Improve this subject line", "Check compliance language"],
  },
  {
    match: /\/marketing/,
    triton: ["Plan a seller-acquisition campaign", "What content is missing?", "Write three subject lines"],
    aether: ["Plan a desk awareness campaign", "Write three subject lines"],
  },
  {
    match: /\/seo/,
    triton: [
      "Build a path to #1 for sell charged-off debt",
      "Which tracked keywords are still unmeasured?",
      "What on-page changes get the homepage to #1?",
      "What should we fix first on debtmarket.net?",
    ],
    aether: [
      "Build a path to #1 for institutional OTC crypto",
      "Which tracked keywords are still unmeasured?",
      "Audit the desk site",
    ],
  },
  {
    match: /\/content/,
    triton: ["Draft a blog post on media quality", "Improve this page for search", "Suggest internal links"],
    aether: ["Draft a market note", "Improve this page for search"],
  },
  {
    match: /\/conversations|\/inbox/,
    triton: ["Summarize unread threads", "Draft a reply to the newest email", "Which threads need a human today?"],
    aether: ["Summarize unread threads", "Draft a reply", "Flag anything time-sensitive"],
  },
  {
    match: /\/automation|\/settings/,
    triton: [
      "Build a workflow for new seller leads",
      "Which automations are not firing?",
      "Route hot leads to Maya",
    ],
    aether: ["Build a workflow for new RFQs", "Route hot leads to the desk lead"],
  },
  {
    match: /\/portfolios|\/marketplace/,
    triton: [
      "Which portfolios have not been worked in 14 days?",
      "What is total face value versus seller price?",
      "Who are the possible buyers on the newest tape?",
      "Draft a bid-window note for the stale book",
    ],
    aether: [
      "Which listings have not been worked in 14 days?",
      "What is total notional versus ask?",
      "Draft a listing note for the newest block",
    ],
  },
  {
    match: /\/compliance/,
    triton: ["Review our outbound language", "What does RMAI expect here?", "Draft a no-consumer-contact disclaimer"],
    aether: ["Review Travel Rule coverage", "Draft a KYC follow-up"],
  },
  {
    match: /\/reporting|\/data\/graph/,
    triton: [
      "Where are SLA breaches concentrated?",
      "How many form submissions became leads?",
      "What is email delivery versus intended?",
      "Summarize first-party page views and SEO health",
    ],
    aether: [
      "Where are SLA breaches concentrated?",
      "What is email delivery versus intended?",
      "Summarize first-party traffic and open tasks",
    ],
  },
  {
    match: /\/home/,
    triton: ["What needs me today?", "Forecast September", "Score the FHB Q3 tape", "Draft email to Lena"],
    aether: ["What needs me today?", "Forecast the desk", "Score the newest block"],
  },
];

const FALLBACK: Record<WorkspaceId, string[]> = {
  triton: ["What needs me today?", "Score the FHB Q3 tape", "Forecast September", "Compliance language for ACCU"],
  aether: ["What needs me today?", "Price the newest block", "Forecast the desk", "Travel Rule status"],
};

export function promptsForPath(pathname: string, workspaceId: WorkspaceId): string[] {
  const rule = RULES.find((entry) => entry.match.test(pathname));
  if (!rule) return FALLBACK[workspaceId];
  return workspaceId === "triton" ? rule.triton : rule.aether;
}
