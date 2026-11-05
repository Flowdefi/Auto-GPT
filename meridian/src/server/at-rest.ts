import type { PortfolioAccount } from "@/lib/collections/types";
import type { DatabaseFile } from "./models";
import { decryptSecret, encryptSecret } from "./auth-crypto";
import { masterSecret } from "./secrets";

const MARK = "enc1:";

/** Identity fields on a debtor account. Operational flags stay in the clear for the desk gates. */
const ACCOUNT_FIELDS = [
  "consumerName",
  "zip",
  "portalCode",
  "attorneyName",
  "originalCreditor",
  "chainOfTitle",
  "validationNotice",
] as const;

export function isSealed(value: string): boolean {
  return value.startsWith(MARK);
}

export function sealField(value: string | null | undefined): string | null | undefined {
  if (value == null || value === "" || isSealed(value)) return value;
  return `${MARK}${encryptSecret(value, masterSecret())}`;
}

export function openField(value: string | null | undefined): string | null | undefined {
  if (value == null || value === "" || !isSealed(value)) return value;
  return decryptSecret(value.slice(MARK.length), masterSecret());
}

export function sealPortfolioAccount(account: PortfolioAccount): PortfolioAccount {
  const next = { ...account };
  for (const field of ACCOUNT_FIELDS) {
    const value = next[field];
    if (typeof value === "string") {
      (next[field] as string | null | undefined) = sealField(value) ?? value;
    }
  }
  delete next.sensitive;
  return next;
}

export function openPortfolioAccount(account: PortfolioAccount): PortfolioAccount {
  const next = { ...account };
  for (const field of ACCOUNT_FIELDS) {
    const value = next[field];
    if (typeof value === "string") {
      (next[field] as string | null | undefined) = openField(value) ?? value;
    }
  }
  return next;
}

export function sealDatabase(db: DatabaseFile): DatabaseFile {
  if (!db.portfolioAccounts?.length) return db;
  return { ...db, portfolioAccounts: db.portfolioAccounts.map(sealPortfolioAccount) };
}

export function openDatabase(db: DatabaseFile): DatabaseFile {
  if (!db.portfolioAccounts?.length) return db;
  db.portfolioAccounts = db.portfolioAccounts.map(openPortfolioAccount);
  return db;
}

export function sealCrmRecord(kind: string, json: string): string {
  if (kind !== "inventory" && kind !== "deals") return json;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (kind === "inventory" && typeof parsed.maskedFileUrl === "string") {
      parsed.maskedFileUrl = sealField(parsed.maskedFileUrl) ?? parsed.maskedFileUrl;
    }
    if (kind === "deals" && typeof parsed.fileUrl === "string") {
      parsed.fileUrl = sealField(parsed.fileUrl) ?? parsed.fileUrl;
    }
    return JSON.stringify(parsed);
  } catch {
    return json;
  }
}

export function openCrmRecord(kind: string, record: Record<string, unknown>): Record<string, unknown> {
  if (kind === "inventory" && typeof record.maskedFileUrl === "string") {
    record.maskedFileUrl = openField(record.maskedFileUrl) ?? record.maskedFileUrl;
  }
  if (kind === "deals" && typeof record.fileUrl === "string") {
    record.fileUrl = openField(record.fileUrl) ?? record.fileUrl;
  }
  return record;
}
