import { id } from "./format";
import { canDialState, ruleFor } from "./states";
import type { Account, Portfolio } from "./types";

/** Canonical columns we try to resolve out of whatever header the seller sends. */
const ALIASES: Record<string, string[]> = {
  firstName: ["first", "firstname", "first_name", "fname", "debtor_first"],
  lastName: ["last", "lastname", "last_name", "lname", "debtor_last"],
  phone: ["phone", "phone1", "home_phone", "primary_phone", "cell"],
  email: ["email", "email1", "email_address"],
  address: ["address", "address1", "street", "addr"],
  city: ["city"],
  state: ["state", "st", "state_code"],
  zip: ["zip", "zipcode", "postal", "zip_code"],
  last4: ["last4", "acct_last4", "account_last4", "card_last4"],
  originalCreditor: ["creditor", "original_creditor", "oc", "issuer"],
  product: ["product", "loan_type", "asset_class", "debt_type"],
  chargeOff: ["chargeoff", "charge_off", "charge_off_date", "co_date"],
  balance: ["balance", "current_balance", "amount_due", "bal"],
  original: ["original", "original_balance", "face", "face_value", "co_balance"],
};

export interface ImportIssue {
  row: number;
  level: "error" | "warning";
  message: string;
}

export interface ImportPreview {
  headers: string[];
  mapping: Record<string, string | null>;
  accounts: Account[];
  issues: ImportIssue[];
  faceValue: number;
  gatedStates: string[];
}

function splitLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalize(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

export function detectMapping(headers: string[]): Record<string, string | null> {
  const normalized = headers.map(normalize);
  const mapping: Record<string, string | null> = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    const index = normalized.findIndex((header) => aliases.includes(header));
    mapping[field] = index === -1 ? null : (headers[index] ?? null);
  }
  return mapping;
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

const TZ_BY_STATE: Record<string, string> = {
  GA: "America/New_York",
  KY: "America/New_York",
  OH: "America/New_York",
  SC: "America/New_York",
  VT: "America/New_York",
  NH: "America/New_York",
  VA: "America/New_York",
  MS: "America/Chicago",
  MO: "America/Chicago",
  OK: "America/Chicago",
  KS: "America/Chicago",
  SD: "America/Chicago",
  MT: "America/Denver",
  UT: "America/Denver",
};

export function portalCode(): string {
  const block = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TFR-${block()}-${block()}`;
}

export function parsePortfolioCsv(text: string, portfolioId: string): ImportPreview {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return {
      headers: [],
      mapping: {},
      accounts: [],
      issues: [{ row: 0, level: "error", message: "Need a header row and at least one account." }],
      faceValue: 0,
      gatedStates: [],
    };
  }

  const headers = splitLine(lines[0] ?? "");
  const mapping = detectMapping(headers);
  const issues: ImportIssue[] = [];
  const gated = new Set<string>();

  for (const field of ["firstName", "lastName", "state", "balance"]) {
    if (!mapping[field]) {
      issues.push({ row: 0, level: "error", message: `Could not find a column for ${field}.` });
    }
  }

  const index = (field: string) => {
    const header = mapping[field];
    return header ? headers.indexOf(header) : -1;
  };

  const accounts: Account[] = [];
  for (let row = 1; row < lines.length; row += 1) {
    const cells = splitLine(lines[row] ?? "");
    const pick = (field: string) => {
      const at = index(field);
      return at === -1 ? "" : (cells[at] ?? "");
    };

    const state = pick("state").toUpperCase().slice(0, 2);
    const balance = num(pick("balance"));
    const original = num(pick("original")) || balance;
    const firstName = pick("firstName");
    const lastName = pick("lastName");

    if (!firstName && !lastName) {
      issues.push({ row, level: "error", message: "Row has no consumer name. Skipped." });
      continue;
    }
    if (!ruleFor(state)) {
      issues.push({ row, level: "error", message: `Unknown state "${state}". Skipped.` });
      continue;
    }
    if (balance <= 0) {
      issues.push({ row, level: "warning", message: `${firstName} ${lastName}: zero balance imported as informational.` });
    }
    if (!canDialState(state)) {
      gated.add(state);
      issues.push({
        row,
        level: "warning",
        message: `${state} needs a license. Account imports on hold — no outreach until licensed.`,
      });
    }

    const dialable = canDialState(state);
    accounts.push({
      id: id("ac"),
      firstName,
      lastName,
      phone: pick("phone"),
      email: pick("email"),
      address: pick("address"),
      city: pick("city"),
      state,
      zip: pick("zip"),
      timezone: TZ_BY_STATE[state] ?? "America/New_York",
      last4: pick("last4") || "0000",
      originalCreditor: pick("originalCreditor") || "Unknown creditor",
      portfolio: portfolioId,
      portfolioId,
      product: pick("product") || "Consumer",
      chargeOff: pick("chargeOff") || "—",
      placedAt: new Date().toISOString().slice(0, 10),
      balance,
      original,
      status: dialable ? "new" : "hold",
      language: "en",
      // Imported paper carries no consent until the seller's media proves it.
      // Voice is permitted by default; SMS and email require express consent.
      consent: { voice: true, sms: false, email: false, recorded: true },
      dnc: false,
      cease: false,
      timeBarred: false,
      validationSent: false,
      miniMiranda: false,
      score: 50,
      social: [],
      skipHits: [],
      notes: "Imported. Validation not yet sent.",
      disposition: "active",
      collected: 0,
      portalCode: portalCode(),
      phones: pick("phone")
        ? [
            {
              id: id("ph"),
              number: pick("phone"),
              label: "primary" as const,
              status: "unverified" as const,
              attempts: 0,
            },
          ]
        : [],
      documents: [],
    });
  }

  return {
    headers,
    mapping,
    accounts,
    issues,
    faceValue: accounts.reduce((sum, account) => sum + account.original, 0),
    gatedStates: [...gated],
  };
}

export function portfolioFromPreview(
  preview: ImportPreview,
  meta: { id: string; name: string; seller: string; purchasePrice: number; assetClass: string },
): Portfolio {
  return {
    id: meta.id,
    name: meta.name,
    seller: meta.seller,
    assetClass: meta.assetClass,
    purchasedAt: new Date().toISOString().slice(0, 10),
    faceValue: preview.faceValue,
    purchasePrice: meta.purchasePrice,
    accountCount: preview.accounts.length,
    putbackUntil: new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10),
    mediaComplete: false,
    notes: preview.gatedStates.length
      ? `Gated states in file: ${preview.gatedStates.join(", ")}. Held pending license.`
      : "All accounts in no-license states.",
  };
}

export const SAMPLE_CSV = `first,last,phone,email,address,city,state,zip,last4,creditor,product,charge_off,balance,original_balance
Andre,Whitlock,(816) 555-0143,a.whitlock.demo@example.com,3300 Main St,Kansas City,MO,64111,7781,Harborpoint Consumer Finance,Personal loan,2026-02-11,1450,1600
Denise,Okafor,(678) 555-0188,d.okafor.demo@example.com,55 Peachtree Rd,Atlanta,GA,30309,2204,Summit Consumer Lending,Credit card,2025-12-04,2310,2500
Wyatt,Bowen,(801) 555-0117,w.bowen.demo@example.com,120 State St,Salt Lake City,UT,84111,9910,First Horizon Bank,Credit card,2026-03-30,780,900
Camille,Rourke,(415) 555-0150,c.rourke.demo@example.com,44 Market St,San Francisco,CA,94105,6612,Atlantic Coast Credit Union,Auto deficiency,2026-01-22,5200,5600`;
