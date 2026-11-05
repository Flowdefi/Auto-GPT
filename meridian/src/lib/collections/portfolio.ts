import { normalizeState } from "@/lib/debt";
import { parseCsv } from "@/server/csv";
import type { PortfolioAccount, StateEligibility } from "./types";
import { stateIsEligible } from "./eligibility";

export interface PortfolioImportResult {
  accounts: PortfolioAccount[];
  created: number;
  quarantined: number;
  workable: number;
  skipped: Array<{ row: number; reason: string }>;
}

const SSN_HEADER = /ssn|social.?security|date of birth|dob\b/i;
const SSN_VALUE = /^\d{3}-?\d{2}-?\d{4}$/;

export function parsePortfolioCsv(input: {
  csv: string;
  workspaceId: PortfolioAccount["workspaceId"];
  portfolioId: string;
  eligibility: StateEligibility[];
  existingRefs: Set<string>;
  now: string;
  id: () => string;
}): PortfolioImportResult {
  const table = parseCsv(input.csv);
  if (table.headers.some((header) => SSN_HEADER.test(header))) {
    return {
      accounts: [],
      created: 0,
      quarantined: 0,
      workable: 0,
      skipped: [{ row: 1, reason: "Refusing the file because a header looks like SSN or date of birth. Those columns are not stored." }],
    };
  }
  const accounts: PortfolioAccount[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];
  const seen = new Set(input.existingRefs);
  for (const row of table.rows) {
    const joined = Object.values(row.values).join(" ");
    if (SSN_VALUE.test(joined.replace(/\s/g, "")) || Object.values(row.values).some((value) => SSN_VALUE.test(value.trim()))) {
      skipped.push({ row: row.line, reason: "Row looked like it contained an SSN and was dropped." });
      continue;
    }
    const accountRef = cell(row.values, "account_ref", "account ref", "reference");
    const state = normalizeState(cell(row.values, "consumer_state", "state"));
    if (!accountRef || !state) {
      skipped.push({ row: row.line, reason: "account_ref and consumer_state are required." });
      continue;
    }
    if (seen.has(accountRef.toLowerCase())) {
      skipped.push({ row: row.line, reason: "Duplicate account_ref." });
      continue;
    }
    seen.add(accountRef.toLowerCase());
    const eligible = stateIsEligible(input.eligibility, state);
    const last4 = cell(row.values, "last4", "last 4").replace(/\D/g, "").slice(-4);
    accounts.push({
      id: input.id(),
      workspaceId: input.workspaceId,
      portfolioId: input.portfolioId,
      accountRef,
      consumerName: cell(row.values, "consumer_name", "name") || "Unknown consumer",
      state,
      zip: cell(row.values, "zip", "postal").replace(/\D/g, "").slice(0, 5),
      last4,
      portalCode: cell(row.values, "portal_code", "portal code"),
      phoneType: phoneType(cell(row.values, "phone_type", "phone type")),
      phoneLast4: cell(row.values, "phone_last4", "phone last4").replace(/\D/g, "").slice(-4),
      sellerName: cell(row.values, "seller", "seller_name") || "Unknown seller",
      balanceCents: dollarsToCents(cell(row.values, "balance", "balance_cents")),
      status: eligible ? "workable" : "quarantined",
      quarantineReason: eligible ? null : `Consumer lives in ${state}, which is not eligible for collection.`,
      inconvenientWork: false,
      importedAt: input.now,
      returnedAt: null,
    });
  }
  return {
    accounts,
    created: accounts.length,
    quarantined: accounts.filter((account) => account.status === "quarantined").length,
    workable: accounts.filter((account) => account.status === "workable").length,
    skipped,
  };
}

function cell(values: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = values[name.toLowerCase()];
    if (value) return value.trim();
  }
  return "";
}

function phoneType(value: string): PortfolioAccount["phoneType"] {
  const raw = value.toLowerCase();
  if (raw.includes("land")) return "landline";
  if (raw.includes("cell") || raw.includes("mobile")) return "cell";
  return "unknown";
}

function dollarsToCents(value: string): number {
  if (!value) return 0;
  if (/cents/i.test(value)) return Number.parseInt(value, 10) || 0;
  const amount = Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}
