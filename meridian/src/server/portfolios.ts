import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "./db";
import type { DatabaseFile, Portfolio, PortfolioGeography, PortfolioHistoryEntry } from "./models";
import { runAutomations } from "./workflow";

const TRACKED: Array<keyof Portfolio> = [
  "name",
  "sellerName",
  "sellerCompanyId",
  "sellerPrice",
  "faceValue",
  "creditor",
  "accountCount",
  "chargeoffYear",
  "notes",
  "segments",
  "dateListed",
  "dateLastWorked",
  "debtType",
  "geography",
  "states",
  "possibleBuyers",
  "status",
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[$,]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return undefined;
}

function display(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

function chargeoffYear(vintage: string): string {
  return vintage.match(/\d{4}/)?.[0] ?? vintage;
}

function geographyFor(states: string[]): PortfolioGeography {
  return states.length >= 4 ? "national" : "state";
}

function listedStatus(status: Portfolio["status"]): boolean {
  return status === "listed" || status === "in_market";
}

export function seedPortfolios(db: DatabaseFile): void {
  const sets: Array<[WorkspaceId, WorkspaceData]> = [
    ["triton", seedTriton()],
    ["aether", seedAether()],
  ];
  const now = new Date().toISOString();
  for (const [workspaceId, data] of sets) {
    if (db.portfolios.some((row) => row.workspaceId === workspaceId)) continue;
    data.inventory.forEach((item, index) => {
      const seller = data.companies.find((company) => company.id === item.sellerCompanyId);
      const stale = index === 0;
      const history: PortfolioHistoryEntry[] = [
        {
          id: `ph_seed_${item.id}`,
          at: "2026-08-15T12:00:00.000Z",
          field: "created",
          from: "",
          to: "Imported from marketplace inventory",
          actor: "seed",
        },
      ];
      db.portfolios.push({
        id: item.id,
        workspaceId,
        name: item.name,
        sellerCompanyId: item.sellerCompanyId,
        sellerName: seller?.name ?? "",
        sellerPrice: item.askingPrice,
        faceValue: item.faceValue,
        creditor: seller?.name ?? "",
        accountCount: item.accountCount,
        chargeoffYear: chargeoffYear(item.vintage),
        notes: item.notes,
        segments: [item.kind, item.scoreBand].filter(Boolean),
        dateListed: "2026-08-15",
        dateLastWorked: stale ? "2026-08-01" : "2026-09-18",
        debtType: item.kind,
        geography: geographyFor(item.states),
        states: item.states,
        possibleBuyers: "",
        status: item.status,
        history,
        createdAt: now,
        updatedAt: now,
      });
    });
  }
}

export function portfoliosOf(workspaceId: WorkspaceId): Portfolio[] {
  return loadDb().portfolios.filter((row) => row.workspaceId === workspaceId);
}

export interface PortfolioWrite {
  name?: string;
  seller?: string;
  sellerPrice?: number;
  faceValue?: number;
  creditor?: string;
  accountCount?: number;
  chargeoffYear?: string;
  notes?: string;
  segments?: string[];
  dateListed?: string;
  dateLastWorked?: string;
  debtType?: string;
  geography?: PortfolioGeography;
  states?: string[];
  possibleBuyers?: string;
  status?: Portfolio["status"];
}

const STATUSES = new Set<Portfolio["status"]>(["intake", "listed", "in_market", "awarded", "closed"]);

export function parsePortfolioWrite(body: Record<string, unknown>): { ok: true; value: PortfolioWrite } | { ok: false; error: string } {
  const value: PortfolioWrite = {};
  if ("name" in body) {
    const name = asText(body.name);
    if (!name) return { ok: false, error: "name cannot be empty" };
    value.name = name;
  }
  if ("seller" in body || "sellerName" in body) {
    value.seller = asText(body.seller ?? body.sellerName);
  }
  if ("sellerPrice" in body) {
    const price = asNumber(body.sellerPrice);
    if (price === undefined || price < 0) return { ok: false, error: "sellerPrice must be a number" };
    value.sellerPrice = price;
  }
  if ("faceValue" in body) {
    const face = asNumber(body.faceValue);
    if (face === undefined || face < 0) return { ok: false, error: "faceValue must be a number" };
    value.faceValue = face;
  }
  if ("accountCount" in body) {
    const count = asNumber(body.accountCount);
    if (count === undefined || count < 0 || !Number.isInteger(count)) {
      return { ok: false, error: "accountCount must be a whole number" };
    }
    value.accountCount = count;
  }
  if ("creditor" in body) value.creditor = asText(body.creditor);
  if ("chargeoffYear" in body) value.chargeoffYear = asText(body.chargeoffYear);
  if ("notes" in body) value.notes = typeof body.notes === "string" ? body.notes.trim() : "";
  if ("segments" in body) value.segments = asList(body.segments) ?? [];
  if ("states" in body) value.states = asList(body.states) ?? [];
  if ("dateListed" in body) value.dateListed = asText(body.dateListed).slice(0, 10);
  if ("dateLastWorked" in body) value.dateLastWorked = asText(body.dateLastWorked).slice(0, 10);
  if ("debtType" in body) value.debtType = asText(body.debtType);
  if ("possibleBuyers" in body) value.possibleBuyers = typeof body.possibleBuyers === "string" ? body.possibleBuyers.trim() : "";
  if ("geography" in body) {
    if (body.geography !== "national" && body.geography !== "state") {
      return { ok: false, error: "geography must be national or state" };
    }
    value.geography = body.geography;
  }
  if ("status" in body) {
    if (typeof body.status !== "string" || !STATUSES.has(body.status as Portfolio["status"])) {
      return { ok: false, error: "status is not a portfolio status" };
    }
    value.status = body.status as Portfolio["status"];
  }
  return { ok: true, value };
}

function applySeller(db: DatabaseFile, portfolio: Portfolio, seller: string): void {
  const trimmed = seller.trim();
  const byId = db.companies.find((company) => company.workspaceId === portfolio.workspaceId && company.id === trimmed);
  if (byId) {
    portfolio.sellerCompanyId = byId.id;
    portfolio.sellerName = byId.name;
    return;
  }
  const byName = db.companies.find(
    (company) => company.workspaceId === portfolio.workspaceId && company.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byName) {
    portfolio.sellerCompanyId = byName.id;
    portfolio.sellerName = byName.name;
    return;
  }
  portfolio.sellerName = trimmed;
  portfolio.sellerCompanyId = undefined;
}

function remember(portfolio: Portfolio, before: Portfolio, actor: string): void {
  const at = new Date().toISOString();
  const entries: PortfolioHistoryEntry[] = [];
  for (const field of TRACKED) {
    const from = display(before[field]);
    const to = display(portfolio[field]);
    if (from === to) continue;
    entries.push({ id: nextId("ph"), at, field, from, to, actor });
  }
  if (entries.length === 0) return;
  portfolio.history = [...entries, ...portfolio.history].slice(0, 200);
}

function applyWrite(db: DatabaseFile, portfolio: Portfolio, write: PortfolioWrite, actor: string): void {
  const before: Portfolio = { ...portfolio, segments: [...portfolio.segments], states: [...portfolio.states], history: portfolio.history };
  if (write.name !== undefined) portfolio.name = write.name;
  if (write.seller !== undefined) applySeller(db, portfolio, write.seller);
  if (write.sellerPrice !== undefined) portfolio.sellerPrice = write.sellerPrice;
  if (write.faceValue !== undefined) portfolio.faceValue = write.faceValue;
  if (write.creditor !== undefined) portfolio.creditor = write.creditor;
  if (write.accountCount !== undefined) portfolio.accountCount = write.accountCount;
  if (write.chargeoffYear !== undefined) portfolio.chargeoffYear = write.chargeoffYear;
  if (write.notes !== undefined) portfolio.notes = write.notes;
  if (write.segments !== undefined) portfolio.segments = write.segments;
  if (write.dateListed !== undefined) portfolio.dateListed = write.dateListed;
  if (write.dateLastWorked !== undefined) portfolio.dateLastWorked = write.dateLastWorked;
  if (write.debtType !== undefined) portfolio.debtType = write.debtType;
  if (write.geography !== undefined) portfolio.geography = write.geography;
  if (write.states !== undefined) portfolio.states = write.states;
  if (write.possibleBuyers !== undefined) portfolio.possibleBuyers = write.possibleBuyers;
  if (write.status !== undefined) portfolio.status = write.status;
  portfolio.updatedAt = new Date().toISOString();
  remember(portfolio, before, actor);
}

export function createPortfolio(workspaceId: WorkspaceId, write: PortfolioWrite, actor = "user"): Portfolio {
  if (!write.name) throw new Error("name is required");
  const now = new Date().toISOString();
  const created = mutate((db) => {
    const portfolio: Portfolio = {
      id: nextId("pf"),
      workspaceId,
      name: write.name ?? "Untitled portfolio",
      sellerName: "",
      sellerPrice: 0,
      faceValue: 0,
      creditor: "",
      accountCount: 0,
      chargeoffYear: "",
      notes: "",
      segments: [],
      dateListed: today(),
      dateLastWorked: today(),
      debtType: "",
      geography: "national",
      states: [],
      possibleBuyers: "",
      status: "listed",
      history: [
        {
          id: nextId("ph"),
          at: now,
          field: "created",
          from: "",
          to: write.name ?? "Untitled portfolio",
          actor,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };
    applyWrite(db, portfolio, write, actor);
    db.portfolios.unshift(portfolio);
    return portfolio;
  });
  if (listedStatus(created.status)) {
    runAutomations(workspaceId, "portfolio.listed", "portfolio", created.id);
  }
  return loadDb().portfolios.find((row) => row.id === created.id) ?? created;
}

export function updatePortfolio(
  workspaceId: WorkspaceId,
  id: string,
  write: PortfolioWrite,
  actor = "user",
): Portfolio {
  const existing = loadDb().portfolios.find((row) => row.id === id && row.workspaceId === workspaceId);
  if (!existing) throw new Error("Portfolio not found");
  const wasListed = listedStatus(existing.status);
  const updated = mutate((db) => {
    const portfolio = db.portfolios.find((row) => row.id === id && row.workspaceId === workspaceId);
    if (!portfolio) throw new Error("Portfolio not found");
    applyWrite(db, portfolio, write, actor);
    return portfolio;
  });
  if (!wasListed && listedStatus(updated.status)) {
    runAutomations(workspaceId, "portfolio.listed", "portfolio", updated.id);
  }
  return loadDb().portfolios.find((row) => row.id === id) ?? updated;
}
