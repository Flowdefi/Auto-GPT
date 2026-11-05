import { normalizeState, parseDate } from "@/lib/debt";
import { parseCsv, type CsvTable } from "@/server/csv";
import type { PortfolioAccount, StateEligibility } from "./types";
import { stateIsEligible } from "./eligibility";
import { solFor } from "./sol";
import { xlsxToCsv } from "./xlsx";

export interface ColumnMapping {
  account_ref?: string;
  consumer_name?: string;
  consumer_state?: string;
  zip?: string;
  last4?: string;
  portal_code?: string;
  phone_type?: string;
  phone_last4?: string;
  seller?: string;
  balance?: string;
  original_creditor?: string;
  chain_of_title?: string;
  placement_date?: string;
  charge_off_date?: string;
  charge_off_balance?: string;
  itemization_date?: string;
  itemization_amount?: string;
  payments_since?: string;
  credits_since?: string;
  fees_since?: string;
  last_payment_date?: string;
  ssn?: string;
  dob?: string;
  account_number?: string;
}

export interface WidthField {
  field: keyof ColumnMapping;
  start: number;
  length: number;
}

export interface PortfolioImportResult {
  accounts: PortfolioAccount[];
  created: number;
  quarantined: number;
  workable: number;
  skipped: Array<{ row: number; reason: string }>;
}

export function parsePortfolioCsv(input: {
  csv?: string;
  xlsxBase64?: string;
  fixedWidth?: string;
  widths?: WidthField[];
  mapping?: ColumnMapping;
  workspaceId: PortfolioAccount["workspaceId"];
  portfolioId: string;
  eligibility: StateEligibility[];
  existingRefs: Set<string>;
  now: string;
  id: () => string;
}): PortfolioImportResult {
  const table = tableFrom(input);
  const accounts: PortfolioAccount[] = [];
  const skipped: Array<{ row: number; reason: string }> = [];
  const seen = new Set(input.existingRefs);
  for (const row of table.rows) {
    const pick = (field: keyof ColumnMapping, ...aliases: string[]) => mapped(row.values, field, input.mapping, aliases);
    const accountRef = pick("account_ref", "account_ref", "account ref", "reference");
    const state = normalizeState(pick("consumer_state", "consumer_state", "state"));
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
    const last4source = pick("last4", "last4", "last 4");
    const accountNumber = pick("account_number", "account_number", "account number");
    const last4 = (last4source || accountNumber).replace(/\D/g, "").slice(-4);
    const chargeOffDate = parseDate(pick("charge_off_date", "charge_off_date", "charge off date"));
    const lastPaymentDate = parseDate(pick("last_payment_date", "last_payment_date", "last payment"));
    const itemizationDate = parseDate(pick("itemization_date", "itemization_date", "itemization date"));
    const sol = solFor(state, lastPaymentDate, chargeOffDate);
    const ssn = pick("ssn", "ssn", "social security");
    const dob = pick("dob", "dob", "date of birth");
    accounts.push({
      id: input.id(),
      workspaceId: input.workspaceId,
      portfolioId: input.portfolioId,
      accountRef,
      consumerName: pick("consumer_name", "consumer_name", "name") || "Unknown consumer",
      state,
      zip: pick("zip", "zip", "postal").replace(/\D/g, "").slice(0, 5),
      last4,
      portalCode: pick("portal_code", "portal_code", "portal code"),
      phoneType: phoneType(pick("phone_type", "phone_type", "phone type")),
      phoneLast4: pick("phone_last4", "phone_last4", "phone last4").replace(/\D/g, "").slice(-4),
      sellerName: pick("seller", "seller", "seller_name") || "Unknown seller",
      balanceCents: dollarsToCents(pick("balance", "balance", "current balance")),
      originalCreditor: pick("original_creditor", "original_creditor", "original creditor"),
      chainOfTitle: pick("chain_of_title", "chain_of_title", "chain of title"),
      placementDate: parseDate(pick("placement_date", "placement_date", "placement date")),
      chargeOffDate,
      chargeOffBalanceCents: dollarsToCents(pick("charge_off_balance", "charge_off_balance", "charge off balance")),
      itemizationDate,
      itemizationAmountCents: dollarsToCents(pick("itemization_amount", "itemization_amount", "itemization amount")),
      paymentsSinceItemizationCents: dollarsToCents(pick("payments_since", "payments_since", "payments since itemization")),
      creditsSinceItemizationCents: dollarsToCents(pick("credits_since", "credits_since", "credits since itemization")),
      feesSinceItemizationCents: dollarsToCents(pick("fees_since", "fees_since", "fees since itemization")),
      lastPaymentDate,
      ...sol,
      ssnMasked: ssn ? maskSsn(ssn) : "",
      status: eligible ? "workable" : "quarantined",
      quarantineReason: eligible ? null : `Consumer lives in ${state}, which is not eligible for collection.`,
      inconvenientWork: false,
      importedAt: input.now,
      returnedAt: null,
      sensitive: {
        ssn: ssn || undefined,
        dob: dob || undefined,
        accountNumber: accountNumber || undefined,
      },
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

export function publicAccount(account: PortfolioAccount): PortfolioAccount {
  const copy = { ...account };
  delete copy.sensitive;
  delete copy.ssnCiphertext;
  delete copy.dobCiphertext;
  delete copy.accountNumberCiphertext;
  return copy;
}

export function maskSsn(value: string): string {
  const digits = value.replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return last4 ? `***-**-${last4}` : "";
}

function tableFrom(input: { csv?: string; xlsxBase64?: string; fixedWidth?: string; widths?: WidthField[] }): CsvTable {
  if (input.xlsxBase64) {
    const bytes = Uint8Array.from(Buffer.from(input.xlsxBase64, "base64"));
    return parseCsv(xlsxToCsv(bytes));
  }
  if (input.fixedWidth) {
    return fixedWidthTable(input.fixedWidth, input.widths ?? []);
  }
  return parseCsv(input.csv ?? "");
}

function fixedWidthTable(text: string, widths: WidthField[]): CsvTable {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  const headers = widths.map((field) => field.field);
  const rows = lines.map((line, index) => {
    const values: Record<string, string> = {};
    for (const field of widths) {
      values[field.field] = line.slice(Math.max(0, field.start - 1), field.start - 1 + field.length).trim();
    }
    return { line: index + 1, values };
  });
  return { headers, rows };
}

function mapped(values: Record<string, string>, field: keyof ColumnMapping, mapping: ColumnMapping | undefined, aliases: string[]): string {
  const header = mapping?.[field];
  if (header) {
    const value = values[header.toLowerCase()];
    if (value !== undefined) return value.trim();
  }
  return cell(values, ...aliases);
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
