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
      "Summarize this contact's history",
      "Draft a re-engagement email",
      "What is missing from this record?",
      "Enrich this company from public sources",
    ],
    aether: ["Summarize this counterparty", "Draft a desk intro", "Check Travel Rule readiness"],
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
      "What should we fix first on debtmarket.net?",
      "Build a content brief for 'sell charged-off debt'",
      "Which keywords can we realistically win?",
      "Write meta descriptions for the weakest pages",
    ],
    aether: ["Audit the desk site", "Build a brief for 'institutional OTC crypto'", "Find keyword gaps"],
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
    match: /\/marketplace/,
    triton: ["Score the open portfolios", "Which buyers fit this tape?", "Draft a bid-window alert"],
    aether: ["Which counterparties fit this block?", "Draft a listing note"],
  },
  {
    match: /\/compliance/,
    triton: ["Review our outbound language", "What does RMAI expect here?", "Draft a no-consumer-contact disclaimer"],
    aether: ["Review Travel Rule coverage", "Draft a KYC follow-up"],
  },
  {
    match: /\/reporting|\/data\/graph/,
    triton: ["What changed this week?", "Explain the graph around FHB", "Where is pipeline leaking?"],
    aether: ["What changed this week?", "Explain the desk graph"],
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
