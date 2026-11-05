import type { WorkspaceId } from "@/lib/types";
import type { CollectionsRole } from "@/lib/collections/types";
import type { SettlementCase } from "@/lib/collections/launch";
import { loadDb, mutate, nextId } from "@/server/db";
import { settlementOffer } from "@/lib/collections/template-library";
import { queueLetter } from "./letters";
import { ensureSettlementMatrix } from "./service";

function thresholdCents(): number {
  const parsed = Number(process.env.MERIDIAN_SETTLEMENT_DUAL_CENTS ?? "50000");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 50000;
}

function holdDays(): number {
  const parsed = Number(process.env.MERIDIAN_SETTLEMENT_HOLD_DAYS ?? "3");
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 3;
}

function amountOf(row: SettlementCase): number {
  return row.counterCents ?? row.offerCents;
}

export function openSettlement(workspaceId: WorkspaceId, accountId: string): SettlementCase {
  const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === accountId && item.workspaceId === workspaceId);
  if (!account) throw new Error("Account not found");
  const offer = settlementOffer(account, ensureSettlementMatrix());
  if (offer.blockedReason) throw new Error(offer.blockedReason);
  const row: SettlementCase = {
    id: nextId("stl"),
    workspaceId,
    accountId,
    offerCents: offer.openingCents,
    counterCents: null,
    status: "open",
    ownerApprovedBy: null,
    complianceApprovedBy: null,
    holdUntil: null,
    createdAt: new Date().toISOString(),
  };
  mutate((db) => {
    db.settlementCases = [row, ...(db.settlementCases ?? [])].slice(0, 400);
  });
  return row;
}

export function counterSettlement(workspaceId: WorkspaceId, caseId: string, counterCents: number): SettlementCase {
  if (!Number.isInteger(counterCents) || counterCents < 100) throw new Error("Counter must be at least one dollar");
  let updated: SettlementCase | null = null;
  mutate((db) => {
    db.settlementCases = (db.settlementCases ?? []).map((row) => {
      if (row.id !== caseId || row.workspaceId !== workspaceId) return row;
      updated = { ...row, counterCents, status: "counter", ownerApprovedBy: null, complianceApprovedBy: null, holdUntil: null };
      return updated;
    });
  });
  if (!updated) throw new Error("Settlement case not found");
  return updated;
}

export function approveSettlement(workspaceId: WorkspaceId, caseId: string, email: string, role: CollectionsRole): SettlementCase {
  if (role !== "admin" && role !== "compliance" && role !== "manager") throw new Error("A manager, owner, or compliance officer approves a settlement");
  const actor = email.toLowerCase();
  let updated: SettlementCase | null = null;
  mutate((db) => {
    db.settlementCases = (db.settlementCases ?? []).map((row) => {
      if (row.id !== caseId || row.workspaceId !== workspaceId) return row;
      const needsDual = amountOf(row) >= thresholdCents();
      let owner = row.ownerApprovedBy;
      let compliance = row.complianceApprovedBy;
      if (role === "compliance") {
        if (owner === actor) throw new Error("The same person cannot give both approvals");
        compliance = actor;
      } else {
        if (compliance === actor) throw new Error("The same person cannot give both approvals");
        owner = actor;
      }
      const ready = needsDual ? Boolean(owner && compliance) : Boolean(owner || compliance);
      const holdUntil = ready ? new Date(Date.now() + holdDays() * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null;
      updated = { ...row, ownerApprovedBy: owner, complianceApprovedBy: compliance, status: ready ? "held" : row.status, holdUntil };
      return updated;
    });
  });
  if (!updated) throw new Error("Settlement case not found");
  return updated;
}

export function listSettlements(workspaceId: WorkspaceId): SettlementCase[] {
  return (loadDb().settlementCases ?? []).filter((row) => row.workspaceId === workspaceId).slice(0, 100);
}

/** Settling-in-full letters wait until the hold date. The letter still needs owner approval and the gate. */
export function releaseSettlementLetter(workspaceId: WorkspaceId, caseId: string, today = new Date().toISOString().slice(0, 10)) {
  const row = (loadDb().settlementCases ?? []).find((item) => item.id === caseId && item.workspaceId === workspaceId);
  if (!row) throw new Error("Settlement case not found");
  if (row.status !== "held" || !row.holdUntil) throw new Error("This settlement is not in the hold period");
  if (row.holdUntil > today) throw new Error(`The settling letter stays queued until ${row.holdUntil}`);
  const mail = queueLetter(workspaceId, row.accountId, "LTR-010");
  mutate((db) => {
    db.settlementCases = (db.settlementCases ?? []).map((item) => (item.id === row.id ? { ...item, status: "sent" } : item));
  });
  return { settlementId: row.id, mailStatus: mail.status, reason: mail.reason };
}
