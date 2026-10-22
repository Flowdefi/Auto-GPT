import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { companiesOf } from "@/server/crm";
import { loadDb } from "@/server/db";
import {
  createPortfolio,
  parsePortfolioWrite,
  portfoliosOf,
  updatePortfolio,
} from "@/server/portfolios";
import { sweepStalePortfolios } from "@/server/workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const stale = sweepStalePortfolios(workspace);
  const id = url.searchParams.get("id");
  const portfolios = portfoliosOf(workspace).filter((row) => (id ? row.id === id : true));
  return NextResponse.json({
    portfolios,
    companies: companiesOf(workspace).map((company) => ({ id: company.id, name: company.name })),
    staleAlerted: stale.alerted,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  const parsed = parsePortfolioWrite(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!parsed.value.name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  try {
    const portfolio = createPortfolio(body.workspaceId, parsed.value, "user");
    return NextResponse.json({ portfolio });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create portfolio" }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  if (!isWorkspaceId(body.workspaceId) || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "workspaceId and id are required" }, { status: 400 });
  }
  const parsed = parsePortfolioWrite(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const portfolio = updatePortfolio(body.workspaceId, body.id, parsed.value, "user");
    const fresh = loadDb().portfolios.find((row) => row.id === portfolio.id);
    return NextResponse.json({ portfolio: fresh ?? portfolio });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update portfolio";
    const status = message === "Portfolio not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
