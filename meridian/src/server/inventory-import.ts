import type { Company, InventoryItem, WorkspaceId } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { listCompanies, patchCrmJson, readCrmJson, writeCrmBlobs } from "./crm-store";
import { applyPortfolioDraft, portfolioRecordId, portfoliosFromCsv, type PortfolioDraft, type PortfolioSkip } from "./portfolio-parse";

export interface InventoryImportReport {
  dryRun: boolean;
  workspaceId: WorkspaceId;
  created: number;
  updated: number;
  unchanged: number;
  skipped: PortfolioSkip[];
  linkedDeals: number;
}

interface DealRef {
  id: string;
  name: string;
  inventoryId?: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asInventory(row: Record<string, unknown>): InventoryItem | null {
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;
  const status = row.status;
  const allowed = status === "intake" || status === "listed" || status === "in_market" || status === "awarded" || status === "closed";
  return {
    ...(row as unknown as InventoryItem),
    id,
    name,
    kind: text(row.kind) || "other",
    sellerCompanyId: text(row.sellerCompanyId),
    faceValue: Number(row.faceValue) || 0,
    askingPrice: Number(row.askingPrice) || 0,
    accountCount: Number(row.accountCount) || 0,
    avgBalance: Number(row.avgBalance) || 0,
    vintage: text(row.vintage),
    states: Array.isArray(row.states) ? row.states.map((state) => String(state)) : [],
    mediaQuality: row.mediaQuality === "poor" || row.mediaQuality === "good" || row.mediaQuality === "excellent" ? row.mediaQuality : "fair",
    scoreBand: text(row.scoreBand),
    status: allowed ? status : "listed",
    notes: text(row.notes),
  };
}

function asDeal(row: Record<string, unknown>): DealRef | null {
  const id = text(row.id);
  if (!id) return null;
  return { id, name: text(row.name) || id, inventoryId: text(row.inventoryId) || undefined };
}

function matchCompany(companies: Company[], name: string | undefined): string | undefined {
  const target = name?.trim().toLowerCase() ?? "";
  if (!target) return undefined;
  return companies.find((company) => company.name.trim().toLowerCase() === target)?.id;
}

function matchDeal(deals: DealRef[], name: string | undefined): string | undefined {
  const target = name?.trim().toLowerCase() ?? "";
  if (!target) return undefined;
  return deals.find((deal) => deal.name.trim().toLowerCase() === target)?.id;
}

function fingerprint(item: InventoryItem): string {
  return JSON.stringify({
    name: item.name,
    kind: item.kind,
    faceValue: item.faceValue,
    askingPrice: item.askingPrice,
    accountCount: item.accountCount,
    states: item.states,
    status: item.status,
    chargeOffDates: item.chargeOffDates ?? "",
    maskedFileUrl: item.maskedFileUrl ?? "",
    sellerCompanyId: item.sellerCompanyId,
    buyerCompanyId: item.buyerCompanyId ?? "",
    dealId: item.dealId ?? "",
    sellerName: item.sellerName ?? "",
    buyerName: item.buyerName ?? "",
    dealName: item.dealName ?? "",
  });
}

export function listPortfolios(workspaceId: WorkspaceId): InventoryItem[] {
  return readCrmJson(workspaceId, "inventory").flatMap((row) => {
    const item = asInventory(row);
    return item ? [item] : [];
  });
}

export function getPortfolio(workspaceId: WorkspaceId, id: string): InventoryItem | null {
  return listPortfolios(workspaceId).find((item) => item.id === id) ?? null;
}

export function listDealRefs(workspaceId: WorkspaceId): DealRef[] {
  return readCrmJson(workspaceId, "deals").flatMap((row) => {
    const deal = asDeal(row);
    return deal ? [deal] : [];
  });
}

export function updatePortfolio(
  workspaceId: WorkspaceId,
  id: string,
  patch: Partial<Pick<InventoryItem, "sellerCompanyId" | "buyerCompanyId" | "dealId" | "maskedFileUrl" | "status" | "sellerName" | "buyerName" | "dealName">>,
): InventoryItem {
  const current = getPortfolio(workspaceId, id);
  if (!current) throw new Error("Portfolio not found");
  const next: InventoryItem = { ...current, id: current.id };
  if (patch.sellerCompanyId !== undefined) next.sellerCompanyId = patch.sellerCompanyId;
  if (patch.buyerCompanyId !== undefined) next.buyerCompanyId = patch.buyerCompanyId;
  if (patch.dealId !== undefined) next.dealId = patch.dealId;
  if (patch.maskedFileUrl !== undefined) next.maskedFileUrl = patch.maskedFileUrl;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.sellerName !== undefined) next.sellerName = patch.sellerName;
  if (patch.buyerName !== undefined) next.buyerName = patch.buyerName;
  if (patch.dealName !== undefined) next.dealName = patch.dealName;
  writeCrmBlobs(workspaceId, "inventory", [{ id: next.id, label: next.name, json: JSON.stringify(next) }]);
  if (next.dealId) linkDeal(workspaceId, next.dealId, next.id);
  return next;
}

function linkDeal(workspaceId: WorkspaceId, dealId: string, portfolioId: string): void {
  const row = readCrmJson(workspaceId, "deals").find((deal) => deal.id === dealId);
  if (!row) return;
  if (row.inventoryId === portfolioId) return;
  patchCrmJson(workspaceId, "deals", dealId, text(row.name) || dealId, { inventoryId: portfolioId });
}

export function attachFileLink(
  workspaceId: WorkspaceId,
  target: "portfolio" | "deal",
  id: string,
  url: string,
  label?: string,
): { id: string; url: string } {
  if (target === "portfolio") {
    const portfolio = updatePortfolio(workspaceId, id, { maskedFileUrl: url });
    return { id: portfolio.id, url };
  }
  const existing = readCrmJson(workspaceId, "deals").find((deal) => deal.id === id);
  patchCrmJson(workspaceId, "deals", id, text(existing?.name) || label || id, {
    fileUrl: url,
    fileName: label || text(existing?.fileName) || "",
    name: text(existing?.name) || label || id,
  });
  return { id, url };
}

export function importPortfolioCsv(workspaceId: WorkspaceId, csv: string, dryRun = false): InventoryImportReport {
  if (!isWorkspaceId(workspaceId)) throw new Error("workspace must be triton or aether");
  const parsed = portfoliosFromCsv(csv);
  const companies = listCompanies(workspaceId);
  const deals = listDealRefs(workspaceId);
  const existing = new Map<string, InventoryItem>();
  for (const item of listPortfolios(workspaceId)) {
    existing.set(item.importKey || item.name.trim().toLowerCase(), item);
    existing.set(item.id, item);
  }
  const latest = new Map<string, PortfolioDraft>();
  for (const draft of parsed.drafts) latest.set(draft.importKey, draft);
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let linkedDeals = 0;
  const writes: Array<{ id: string; label: string; json: string }> = [];
  for (const draft of latest.values()) {
    const prior = existing.get(draft.importKey) ?? existing.get(portfolioRecordId(draft.importKey));
    const next = applyPortfolioDraft(prior, draft, {
      sellerCompanyId: matchCompany(companies, draft.sellerName),
      buyerCompanyId: matchCompany(companies, draft.buyerName),
      dealId: matchDeal(deals, draft.dealName),
    });
    if (prior && fingerprint(prior) === fingerprint(next)) {
      unchanged += 1;
      continue;
    }
    if (prior) updated += 1;
    else created += 1;
    if (next.dealId && next.dealId !== prior?.dealId) linkedDeals += 1;
    writes.push({ id: next.id, label: next.name, json: JSON.stringify(next) });
    if (!dryRun && next.dealId) linkDeal(workspaceId, next.dealId, next.id);
  }
  if (!dryRun && writes.length > 0) writeCrmBlobs(workspaceId, "inventory", writes);
  return {
    dryRun,
    workspaceId,
    created,
    updated,
    unchanged,
    skipped: parsed.skipped,
    linkedDeals,
  };
}

export function formatInventoryReport(report: InventoryImportReport): string {
  const lines = [
    `Workspace: ${report.workspaceId}`,
    `Mode: ${report.dryRun ? "dry-run" : "write"}`,
    `Portfolios: created ${report.created}, updated ${report.updated}, unchanged ${report.unchanged}, skipped ${report.skipped.length}`,
    `Deals linked: ${report.linkedDeals}`,
  ];
  for (const skip of report.skipped.slice(0, 50)) lines.push(`  row ${skip.row}: ${skip.reason}`);
  return lines.join("\n");
}

export type { PortfolioDraft };
