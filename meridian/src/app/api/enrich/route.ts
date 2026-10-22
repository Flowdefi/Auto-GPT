import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { companiesOf } from "@/server/crm";
import { enrichCompanyRecord } from "@/server/enrich";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  const companies = companiesOf(workspace).map((company) => ({
    id: company.id,
    name: company.name,
    domain: company.domain,
    enrichedAt: company.enrichedAt,
    enrichment: company.enrichment,
  }));

  return NextResponse.json({ companies });
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as { workspaceId?: string; companyId?: string };
  if (!isWorkspaceId(body.workspaceId) || !body.companyId) {
    return NextResponse.json({ error: "workspaceId and companyId are required" }, { status: 400 });
  }

  const result = await enrichCompanyRecord(body.workspaceId, body.companyId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
