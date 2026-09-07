import { centsOnDollar, money } from "./format";
import type { WorkspaceConfig, WorkspaceData } from "./types";

export interface AiReply {
  body: string;
  subject?: string;
  dealId?: string;
  contactId?: string;
}

function findDeal(data: WorkspaceData, text: string) {
  const lower = text.toLowerCase();
  return data.deals.find((deal) => {
    const inventory = data.inventory.find((item) => item.id === deal.inventoryId);
    return (
      lower.includes(deal.name.toLowerCase().slice(0, 8)) ||
      lower.includes(deal.id) ||
      (inventory && lower.includes(inventory.name.toLowerCase().slice(0, 6))) ||
      data.companies.some(
        (company) =>
          company.id === deal.companyId && lower.includes(company.name.toLowerCase().split(" ")[0] ?? ""),
      )
    );
  });
}

function portfolioBrief(data: WorkspaceData, workspace: WorkspaceConfig): string {
  const open = data.inventory.filter((item) => item.status !== "closed");
  const lines = open.map((item) => {
    const seller = data.companies.find((company) => company.id === item.sellerCompanyId);
    return `• ${item.name} (${item.kind}) — face ${money(item.faceValue)} · ask ${money(item.askingPrice)} (${centsOnDollar(item.faceValue, item.askingPrice)}) · ${item.accountCount.toLocaleString()} accts · media ${item.mediaQuality} · ${seller?.name ?? "—"} · ${item.status}`;
  });
  return `${workspace.inventoryNounPlural} in market:\n${lines.join("\n")}`;
}

function forecast(data: WorkspaceData): string {
  const weighted = data.deals.reduce((sum, deal) => sum + deal.amount * (deal.probability / 100), 0);
  const commit = data.deals
    .filter((deal) => deal.forecast === "commit")
    .reduce((sum, deal) => sum + deal.amount, 0);
  const best = data.deals
    .filter((deal) => deal.forecast === "best_case" || deal.forecast === "commit")
    .reduce((sum, deal) => sum + deal.amount, 0);
  return `Weighted pipeline ${money(weighted)}. Commit ${money(commit)}. Best case ${money(best)}.`;
}

function draftEmail(data: WorkspaceData, workspace: WorkspaceConfig, text: string): AiReply {
  const deal = findDeal(data, text) ?? data.deals[0];
  if (!deal) {
    return { body: "I need a live deal to draft against. Open Sales and pick a record." };
  }
  const contact = data.contacts.find((item) => item.id === deal.contactId);
  const company = data.companies.find((item) => item.id === deal.companyId);
  const inventory = data.inventory.find((item) => item.id === deal.inventoryId);
  const first = contact?.firstName ?? "there";

  if (workspace.id === "triton") {
    return {
      subject: `Draft email — ${deal.name}`,
      dealId: deal.id,
      contactId: contact?.id,
      body: `Draft to ${first} at ${company?.name ?? "the counterparty"}:\n\n${first} —\n\nTriton Financial Solutions is working ${inventory?.name ?? deal.name} as broker, not as a collection agency. We do not contact consumers.\n\nFace ${inventory ? money(inventory.faceValue) : money(deal.amount)} · asking ${inventory ? `${centsOnDollar(inventory.faceValue, inventory.askingPrice)} (${money(inventory.askingPrice)})` : money(deal.amount)} · ${inventory?.accountCount.toLocaleString() ?? "—"} accounts · media ${inventory?.mediaQuality ?? "n/a"} · vintage ${inventory?.vintage ?? "n/a"}.\n\nNext step: ${deal.nextStep}\nStage: ${deal.stage}. Target close ${deal.closeDate}.\n\nInstitutional inquiries only. FDCPA-aware / RMAI-aligned process. NDA before any tape.\n\nAlex Chen\nTriton Financial Solutions · DebtMarket\nportfolios@debtmarket.net · +1 (561) 254-6608`,
    };
  }

  return {
    subject: `Draft email — ${deal.name}`,
    dealId: deal.id,
    contactId: contact?.id,
    body: `Draft to ${first} at ${company?.name ?? "the desk"}:\n\n${first} —\n\nAether can work ${inventory?.name ?? deal.name} on a recorded line. ${workspace.complianceBadges.join(" · ")}.\n\nNotional ${money(deal.amount)}. Stage: ${deal.stage}. Next: ${deal.nextStep}\n\nIf this is a block, we hold firm for 15 minutes once custody is confirmed. Travel Rule (IVMS-101) applies ≥ $3k.\n\nRia Kapoor\nAether Digital Markets\ndesk@aethermarkets.io`,
  };
}

function scoreRecord(data: WorkspaceData, workspace: WorkspaceConfig, text: string): AiReply {
  const deal = findDeal(data, text) ?? data.deals[0];
  if (!deal) return { body: "No deal to score." };
  const inventory = data.inventory.find((item) => item.id === deal.inventoryId);
  if (workspace.id === "triton" && inventory) {
    const mediaBoost =
      inventory.mediaQuality === "excellent" ? 1.2 : inventory.mediaQuality === "good" ? 0.6 : 0;
    const low = (inventory.askingPrice / inventory.faceValue) * 100 - 0.6;
    const high = (inventory.askingPrice / inventory.faceValue) * 100 + 0.4 + mediaBoost * 0.15;
    return {
      subject: `AI score — ${inventory.name}`,
      dealId: deal.id,
      body: `Fair bid range ${low.toFixed(2)}–${high.toFixed(2)}¢ on face ${money(inventory.faceValue)}.\n\nDrivers: ${inventory.kind}, vintage ${inventory.vintage}, media ${inventory.mediaQuality}, ${inventory.accountCount.toLocaleString()} accounts, states ${inventory.states.join(", ")}, score band ${inventory.scoreBand}.\n\nAsking ${centsOnDollar(inventory.faceValue, inventory.askingPrice)} is ${inventory.mediaQuality === "excellent" ? "supportable if two tier-1 buyers stay in" : "tight — expect a second round"}.\n\nWatchouts: ${inventory.kind.includes("Medical") ? "BAA / no ER paper / no PHI in the CRM." : "put-backs for fraud, deceased, and settlement accounts."}\n\nProbability now ${deal.probability}% · forecast ${deal.forecast}.`,
    };
  }
  return {
    subject: `AI score — ${deal.name}`,
    dealId: deal.id,
    body: `Mandate ${money(deal.amount)} · ${deal.stage} · p=${deal.probability}%.\n\n${deal.nextStep}\n\nCompliance: ${workspace.complianceBadges.join(", ")}.`,
  };
}

export function meridianReply(
  prompt: string,
  data: WorkspaceData,
  workspace: WorkspaceConfig,
): AiReply {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  if (!text) {
    return { body: "Ask me to draft an email, score a book, forecast the week, or summarize inbox." };
  }

  if (/(draft|write|email|note to)/.test(lower)) {
    return draftEmail(data, workspace, lower);
  }
  if (/(score|value|price|¢|cents|fair range|what.?s it worth)/.test(lower)) {
    return scoreRecord(data, workspace, lower);
  }
  if (/(forecast|pipeline|commit|quota)/.test(lower)) {
    return { subject: "Forecast", body: forecast(data) };
  }
  if (/(inventory|portfolio|listing|block|what.?s live)/.test(lower)) {
    return { subject: "Inventory", body: portfolioBrief(data, workspace) };
  }
  if (/(inbox|unread|conversation)/.test(lower)) {
    const unread = data.conversations.filter((conversation) => conversation.unread);
    return {
      body:
        unread.length === 0
          ? "Inbox is clear."
          : `Unread:\n${unread.map((conversation) => `• ${conversation.subject} — ${conversation.messages.at(-1)?.body ?? ""}`).join("\n")}`,
    };
  }
  if (/(task|todo|next)/.test(lower)) {
    const open = data.tasks.filter((task) => task.status === "open");
    return {
      body: `Open tasks:\n${open.map((task) => `• ${task.title} (${task.priority}, due ${task.due})`).join("\n")}`,
    };
  }
  if (/(compliance|fdcpa|rmai|travel rule|kyc|hipaa)/.test(lower)) {
    if (workspace.id === "triton") {
      return {
        body: "Triton is a debt buyer/broker of charged-off receivables. Do not contact consumers. Do not discuss individual debts. Institutional counterparties only. Medical paper requires a BAA before any tape. Buyer bids require a current license pack. Use FDCPA-aware / RMAI-aligned language. Consumer inquiries: we cannot help — they must contact the current collector.",
      };
    }
    return {
      body: "Aether is institutional only. KYC/AML on every counterparty. Travel Rule (IVMS-101) on transfers ≥ $3k. Prefer qualified custody (e.g. Pinnacle). Recorded lines on firm quotes. No retail onboarding from this desk.",
    };
  }

  const deal = findDeal(data, lower);
  if (deal) {
    const company = data.companies.find((item) => item.id === deal.companyId);
    const inventory = data.inventory.find((item) => item.id === deal.inventoryId);
    return {
      subject: deal.name,
      dealId: deal.id,
      body: `${deal.name} with ${company?.name ?? "—"}.\nStage ${deal.stage} · ${money(deal.amount)} · p=${deal.probability}% · ${deal.forecast}.\n${inventory ? `Book: ${inventory.name} · ${inventory.kind} · face ${money(inventory.faceValue)}.` : ""}\nNext: ${deal.nextStep}`,
    };
  }

  return {
    body: `${workspace.name} snapshot — ${forecast(data)}\n\n${portfolioBrief(data, workspace)}\n\nTry: “draft email to Lena”, “score FHB”, “forecast”, “compliance”, or “inbox”.`,
  };
}

export const AI_STARTERS: Record<"triton" | "aether", string[]> = {
  triton: [
    "Score the FHB Q3 tape",
    "Draft email to Lena about the bid window",
    "What’s live in inventory?",
    "Forecast September",
    "Compliance language for ACCU’s board",
  ],
  aether: [
    "Score the Helios 620 BTC block",
    "Draft a firm-quote note to Theo",
    "What’s blocking NIMB listing?",
    "Travel Rule checklist",
    "Forecast the desk",
  ],
};
