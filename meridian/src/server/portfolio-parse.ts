import { createHash } from "node:crypto";
import { US_STATES } from "@/lib/debt";
import type { InventoryItem } from "@/lib/types";
import { cell, hasHeader, headerSet, parseCsv, type CsvRow } from "./csv";

export interface PortfolioDraft {
  importKey: string;
  name: string;
  kind: string;
  faceValue: number;
  askingPrice: number;
  accountCount: number;
  states: string[];
  chargeOffDates: string;
  chargeOffFrom?: string;
  chargeOffTo?: string;
  status?: InventoryItem["status"];
  maskedFileUrl?: string;
  sellerName?: string;
  buyerName?: string;
  dealName?: string;
}

export interface PortfolioSkip {
  row: number;
  reason: string;
}

const NAME_HEADERS = ["Portfolio Name", "Portfolio", "Name", "Book", "Tape"];
const KIND_HEADERS = ["Paper Type", "Paper", "Type", "Asset Class", "Asset"];
const FACE_HEADERS = ["Face Value", "Face", "Unpaid Balance", "UPB", "Total Balance"];
const COUNT_HEADERS = ["# Accounts", "# of Accounts", "Accounts", "Account Count", "Number of Accounts", "Accts"];
const STATE_HEADERS = ["States", "State", "Jurisdictions"];
const CHARGE_HEADERS = ["Chargeoff Dates", "Charge-off Dates", "Charge Off Dates", "Chargeoff", "Charge-off", "CO Dates"];
const ASK_HEADERS = ["Asking Price", "Ask", "Price", "Asking"];
const STATUS_HEADERS = ["Status"];
const FILE_HEADERS = ["OneDrive File URL", "OneDrive URL", "Masked File URL", "Masked File", "File URL", "OneDrive"];
const SELLER_HEADERS = ["Seller", "Seller Company", "Seller Name"];
const BUYER_HEADERS = ["Buyer", "Buyer Company", "Buyer Name"];
const DEAL_HEADERS = ["Deal", "Deal Name"];

export function portfolioRecordId(importKey: string): string {
  return `pf_${createHash("sha256").update(importKey).digest("hex").slice(0, 20)}`;
}

export function portfolioImportKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMoney(raw: string): number {
  const text = raw.trim().toLowerCase().replace(/[$,\s]/g, "");
  if (!text) return 0;
  let multiplier = 1;
  let body = text;
  if (body.endsWith("mm")) {
    multiplier = 1_000_000;
    body = body.slice(0, -2);
  } else if (body.endsWith("m")) {
    multiplier = 1_000_000;
    body = body.slice(0, -1);
  } else if (body.endsWith("k")) {
    multiplier = 1_000;
    body = body.slice(0, -1);
  } else if (body.endsWith("b")) {
    multiplier = 1_000_000_000;
    body = body.slice(0, -1);
  }
  const value = Number(body);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * multiplier);
}

export function parseCount(raw: string): number {
  const value = Number(raw.trim().replace(/[, ]/g, ""));
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function excelSerialDate(serial: number): string {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000;
  return new Date(utc).toISOString().slice(0, 10);
}

function datePiece(raw: string): string {
  const text = raw.trim();
  if (/^\d{5}(\.\d+)?$/.test(text)) {
    const serial = Number(text);
    if (serial > 20_000 && serial < 80_000) return excelSerialDate(serial);
  }
  return text;
}

export function parseChargeOff(raw: string): { text: string; from?: string; to?: string } {
  const text = raw.trim();
  if (!text) return { text: "" };
  const pieces = text
    .split(/\s+(?:–|—|-|to)\s+/i)
    .map(datePiece)
    .filter(Boolean);
  return { text: pieces.length > 1 ? pieces.join(" – ") : datePiece(text), from: pieces[0], to: pieces[1] };
}

export function parsePortfolioStatus(raw: string): InventoryItem["status"] {
  const text = raw.trim().toLowerCase();
  if (!text) return "listed";
  if (/sold|closed|withdrawn|passed/.test(text)) return "closed";
  if (/award|loi|under contract|exclusive|nda/.test(text)) return "awarded";
  if (/in[-\s]?market|marketing|live/.test(text)) return "in_market";
  if (/hold|intake|draft|review/.test(text)) return "intake";
  return "listed";
}

export function parseStateList(raw: string): string[] {
  const parts = raw
    .split(/[,;/|]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const codes: string[] = [];
  for (const part of parts) {
    if (/^[A-Za-z]{2}$/.test(part)) {
      codes.push(part.toUpperCase());
      continue;
    }
    const named = US_STATES.find((state) => state.name.toLowerCase() === part.toLowerCase());
    codes.push(named?.code ?? part);
  }
  return [...new Set(codes)];
}

function optional(row: CsvRow, headers: Set<string>, names: string[]): string | undefined {
  if (!hasHeader(headers, ...names)) return undefined;
  return cell(row, ...names).trim();
}

export function portfoliosFromCsv(csv: string): { drafts: PortfolioDraft[]; skipped: PortfolioSkip[] } {
  const table = parseCsv(csv);
  const headers = headerSet(table);
  const drafts: PortfolioDraft[] = [];
  const skipped: PortfolioSkip[] = [];
  for (const row of table.rows) {
    const name = cell(row, ...NAME_HEADERS).trim();
    if (!name) {
      skipped.push({ row: row.line, reason: "missing portfolio name" });
      continue;
    }
    const charge = parseChargeOff(optional(row, headers, CHARGE_HEADERS) ?? "");
    const statusRaw = optional(row, headers, STATUS_HEADERS);
    drafts.push({
      importKey: portfolioImportKey(name),
      name,
      kind: (optional(row, headers, KIND_HEADERS) ?? "").trim(),
      faceValue: parseMoney(optional(row, headers, FACE_HEADERS) ?? ""),
      askingPrice: parseMoney(optional(row, headers, ASK_HEADERS) ?? ""),
      accountCount: parseCount(optional(row, headers, COUNT_HEADERS) ?? ""),
      states: parseStateList(optional(row, headers, STATE_HEADERS) ?? ""),
      chargeOffDates: charge.text,
      chargeOffFrom: charge.from,
      chargeOffTo: charge.to,
      status: statusRaw === undefined ? undefined : parsePortfolioStatus(statusRaw),
      maskedFileUrl: optional(row, headers, FILE_HEADERS),
      sellerName: optional(row, headers, SELLER_HEADERS),
      buyerName: optional(row, headers, BUYER_HEADERS),
      dealName: optional(row, headers, DEAL_HEADERS),
    });
  }
  return { drafts, skipped };
}

export function applyPortfolioDraft(
  existing: InventoryItem | undefined,
  draft: PortfolioDraft,
  links: { sellerCompanyId?: string; buyerCompanyId?: string; dealId?: string },
): InventoryItem {
  const years = draft.chargeOffDates.match(/\d{4}/g);
  const accountCount = draft.accountCount || existing?.accountCount || 0;
  const faceValue = draft.faceValue || existing?.faceValue || 0;
  const next: InventoryItem = {
    id: existing?.id || portfolioRecordId(draft.importKey),
    name: draft.name,
    kind: draft.kind || existing?.kind || "other",
    sellerCompanyId: existing?.sellerCompanyId ?? "",
    buyerCompanyId: existing?.buyerCompanyId,
    dealId: existing?.dealId,
    faceValue,
    askingPrice: draft.askingPrice || existing?.askingPrice || 0,
    accountCount,
    avgBalance: accountCount > 0 ? Math.round(faceValue / accountCount) : existing?.avgBalance ?? 0,
    vintage: years && years.length > 0 ? years.join("–") : existing?.vintage ?? "",
    states: draft.states.length > 0 ? draft.states : existing?.states ?? [],
    mediaQuality: existing?.mediaQuality ?? "fair",
    scoreBand: existing?.scoreBand ?? "",
    status: draft.status ?? existing?.status ?? "listed",
    notes: existing?.notes ?? "",
    chargeOffDates: draft.chargeOffDates || existing?.chargeOffDates,
    chargeOffFrom: draft.chargeOffFrom || existing?.chargeOffFrom,
    chargeOffTo: draft.chargeOffTo || existing?.chargeOffTo,
    maskedFileUrl: existing?.maskedFileUrl,
    importKey: draft.importKey,
    sellerName: existing?.sellerName,
    buyerName: existing?.buyerName,
    dealName: existing?.dealName,
  };
  if (draft.maskedFileUrl) next.maskedFileUrl = draft.maskedFileUrl;
  if (draft.sellerName) {
    next.sellerName = draft.sellerName;
    if (links.sellerCompanyId) next.sellerCompanyId = links.sellerCompanyId;
  }
  if (draft.buyerName) {
    next.buyerName = draft.buyerName;
    if (links.buyerCompanyId) next.buyerCompanyId = links.buyerCompanyId;
  }
  if (draft.dealName) {
    next.dealName = draft.dealName;
    if (links.dealId) next.dealId = links.dealId;
  }
  return next;
}
