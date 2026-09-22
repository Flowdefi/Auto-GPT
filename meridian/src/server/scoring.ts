import type { WorkspaceId } from "@/lib/types";
import { domainOf, isFreeMailDomain } from "./crm";
import type { CrmCompany, CrmContact, Lead } from "./models";

export interface ScoreBreakdown {
  fit: number;
  intent: number;
  total: number;
  band: "hot" | "warm" | "nurture";
  reasons: string[];
}

const SELLER_SIGNALS = [
  "charge-off",
  "charged off",
  "recovery",
  "recoveries",
  "portfolio",
  "delinquent",
  "receivable",
  "sell",
  "liquidate",
  "npl",
  "forward flow",
];

const BUYER_SIGNALS = [
  "buy",
  "buyer",
  "acquire",
  "bid",
  "purchase",
  "capital",
  "fund",
  "debt buyer",
  "tape",
];

const SENIOR_TITLES = [
  "chief",
  "cfo",
  "ceo",
  "coo",
  "president",
  "founder",
  "owner",
  "head",
  "vp",
  "vice president",
  "director",
  "svp",
  "evp",
  "treasurer",
  "controller",
  "partner",
  "managing",
];

const TARGET_INDUSTRIES = [
  "bank",
  "credit union",
  "lender",
  "lending",
  "fintech",
  "healthcare",
  "health",
  "telecom",
  "auto",
  "finance",
  "financial",
  "collection",
  "capital",
];

function has(haystack: string, needles: string[]): string | undefined {
  const lower = haystack.toLowerCase();
  return needles.find((needle) => lower.includes(needle));
}

/**
 * Fit is who they are (0-50). Intent is what they did (0-50).
 * Bands follow the Salesforce convention: Hot 70+, Warm 40-69, Nurture below 40.
 */
export function scoreLead(
  workspaceId: WorkspaceId,
  contact: CrmContact,
  company: CrmCompany,
  payload: Record<string, string> = {},
): ScoreBreakdown {
  const reasons: string[] = [];
  let fit = 0;
  let intent = 0;

  const domain = domainOf(contact.email);
  if (domain && !isFreeMailDomain(domain)) {
    fit += 12;
    reasons.push("Business email domain (+12)");
  } else {
    reasons.push("Free mail domain (+0)");
  }

  const seniority = has(contact.title ?? "", SENIOR_TITLES);
  if (seniority) {
    fit += 14;
    reasons.push(`Senior title "${seniority}" (+14)`);
  } else if (contact.title) {
    fit += 5;
    reasons.push("Has a title (+5)");
  }

  const industry = has(`${company.industry} ${company.name} ${company.notes}`, TARGET_INDUSTRIES);
  if (industry) {
    fit += 12;
    reasons.push(`Target industry signal "${industry}" (+12)`);
  }

  const size = Number((company.employees ?? "").replace(/[^0-9]/g, ""));
  if (size >= 1000) {
    fit += 8;
    reasons.push("1,000+ employees (+8)");
  } else if (size >= 100) {
    fit += 5;
    reasons.push("100+ employees (+5)");
  }

  if (contact.phone) {
    fit += 4;
    reasons.push("Phone present (+4)");
  }

  const blob = Object.values(payload).join(" ").toLowerCase();

  const faceValue = Number((payload.faceValue ?? payload.face ?? "").replace(/[^0-9]/g, ""));
  if (faceValue >= 10_000_000) {
    intent += 20;
    reasons.push("Face value ≥ $10M (+20)");
  } else if (faceValue >= 1_000_000) {
    intent += 14;
    reasons.push("Face value ≥ $1M (+14)");
  } else if (faceValue > 0) {
    intent += 7;
    reasons.push("Face value stated (+7)");
  }

  if (has(blob, ["nda", "data room", "bid", "term sheet", "quote", "pricing"])) {
    intent += 16;
    reasons.push("Asked for NDA / data room / pricing (+16)");
  }

  if (has(blob, ["call", "meeting", "demo", "schedule", "speak"])) {
    intent += 10;
    reasons.push("Requested a conversation (+10)");
  }

  if (has(blob, SELLER_SIGNALS)) {
    intent += 8;
    reasons.push("Sell-side language (+8)");
  }
  if (has(blob, BUYER_SIGNALS)) {
    intent += 8;
    reasons.push("Buy-side language (+8)");
  }

  if (payload.assetClass || payload.asset_class) {
    intent += 6;
    reasons.push("Named an asset class (+6)");
  }

  if (workspaceId === "aether" && has(blob, ["otc", "block", "btc", "eth", "custody", "treasury"])) {
    intent += 8;
    reasons.push("Digital-asset desk intent (+8)");
  }

  fit = Math.max(0, Math.min(50, fit));
  intent = Math.max(0, Math.min(50, intent));
  const total = fit + intent;
  const band = total >= 70 ? "hot" : total >= 40 ? "warm" : "nurture";

  return { fit, intent, total, band, reasons };
}

export function inferSide(
  payload: Record<string, string>,
  company: CrmCompany,
): Lead["side"] {
  const blob = `${Object.values(payload).join(" ")} ${company.type} ${company.industry} ${company.notes}`.toLowerCase();
  const seller = SELLER_SIGNALS.filter((signal) => blob.includes(signal)).length;
  const buyer = BUYER_SIGNALS.filter((signal) => blob.includes(signal)).length;
  if (company.type === "seller" || company.type === "issuer") return "seller";
  if (company.type === "buyer" || company.type === "fund") return "buyer";
  const selling = /\bsell(?:ing|s|er)?\b/.test(blob);
  const buying = /\bbuy(?:ing|s|er)?\b/.test(blob);
  if (selling && !buying) return "seller";
  if (buying && !selling) return "buyer";
  if (seller > buyer) return "seller";
  if (buyer > seller) return "buyer";
  return "unknown";
}

/** SLA windows in minutes, by band. Hot leads get the fastest clock. */
export function slaMinutes(band: ScoreBreakdown["band"]): number {
  if (band === "hot") return 15;
  if (band === "warm") return 240;
  return 2880;
}
