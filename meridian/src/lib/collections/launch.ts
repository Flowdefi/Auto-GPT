import type { WorkspaceId } from "@/lib/types";

export interface PortfolioBook {
  portfolioId: string;
  workspaceId: WorkspaceId;
  sellerName: string;
  costCents: number;
  closedAt: string | null;
}

export interface ScrubEvent {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  kind: "bankruptcy" | "deceased";
  status: "unknown" | "no_hit" | "hit";
  source: "sandbox" | "vendor";
  at: string;
}

export interface SettlementCase {
  id: string;
  workspaceId: WorkspaceId;
  accountId: string;
  offerCents: number;
  counterCents: number | null;
  status: "open" | "counter" | "held" | "sent" | "declined";
  ownerApprovedBy: string | null;
  complianceApprovedBy: string | null;
  holdUntil: string | null;
  createdAt: string;
}

export interface TabletopRun {
  id: string;
  workspaceId: WorkspaceId;
  at: string;
  checked: string[];
}
