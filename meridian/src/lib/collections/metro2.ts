import type { PortfolioAccount } from "./types";

/** CDIA Metro 2 base segment length. Positions must be checked against the current Credit Reporting Resource Guide before any bureau file is sent. */
export const METRO2_BASE_LENGTH = 426;

export interface Metro2RowResult {
  accountRef: string;
  included: boolean;
  reason: string;
}

/** Owner and compliance sign-off for one workspace. This is not counsel approval of the file. */
export interface Metro2Signoff {
  ownerApprovedAt: string | null;
  ownerApprovedBy: string | null;
  complianceApprovedAt: string | null;
  complianceApprovedBy: string | null;
}

export interface Metro2Export {
  file: string;
  included: number;
  excluded: Metro2RowResult[];
  needsCounselReview: true;
  citation: string;
}

function blank(length: number): string[] {
  return Array.from({ length }, () => " ");
}

function put(line: string[], start: number, length: number, value: string, numeric = false): void {
  const raw = value.slice(0, length);
  const text = numeric ? raw.padStart(length, "0") : raw.padEnd(length, " ");
  for (let index = 0; index < length; index += 1) line[start - 1 + index] = text[index] ?? " ";
}

function ymd(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10).replace(/-/g, "");
}

function contacted(account: PortfolioAccount): boolean {
  return Boolean(account.validationMailedAt);
}

/**
 * 12 CFR § 1006.30(a): do not furnish information about a debt to a consumer
 * reporting agency before communicating with the consumer about the debt.
 * This desk treats the mailed validation notice as that communication.
 * Social Security numbers and dates of birth are left blank on purpose.
 */
export function buildMetro2(accounts: PortfolioAccount[], now = new Date()): Metro2Export {
  const excluded: Metro2RowResult[] = [];
  const lines: string[] = [];
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  for (const account of accounts) {
    if (!contacted(account)) {
      excluded.push({
        accountRef: account.accountRef,
        included: false,
        reason: "No validation notice has been mailed, so this account is not furnished. 12 CFR § 1006.30(a).",
      });
      continue;
    }
    const line = blank(METRO2_BASE_LENGTH);
    put(line, 1, 4, String(METRO2_BASE_LENGTH), true);
    put(line, 5, 1, "1");
    put(line, 6, 14, stamp);
    put(line, 21, 20, "MERIDIAN");
    put(line, 43, 30, account.accountRef);
    put(line, 73, 1, "O");
    put(line, 74, 2, "48");
    put(line, 155, 9, String(account.balanceCents), true);
    put(line, 173, 9, String(account.chargeOffBalanceCents ?? account.balanceCents), true);
    put(line, 182, 8, ymd(now.toISOString()));
    put(line, 206, 8, ymd(account.lastPaymentDate));
    const [last, first] = splitName(account.consumerName);
    put(line, 232, 25, last);
    put(line, 257, 20, first);
    put(line, 414, 2, account.state);
    put(line, 416, 9, account.zip);
    lines.push(line.join(""));
  }
  return {
    file: lines.join("\n"),
    included: lines.length,
    excluded,
    needsCounselReview: true,
    citation: "12 CFR § 1006.30(a). Base-segment positions follow the published Metro 2 layout and must be verified against the current CDIA guide. Account status is left blank rather than guessed.",
  };
}

function splitName(name: string): [string, string] {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const last = parts.slice(1).join(" ") || first;
  return [last.toUpperCase(), first.toUpperCase()];
}
