import { NextResponse } from "next/server";
import type { Company } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { listCompanies, saveCompany } from "@/server/crm-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspaceId = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json({ companies: listCompanies(workspaceId) });
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as { workspaceId?: string; company?: Partial<Company> };
  if (!isWorkspaceId(body.workspaceId) || !body.company) {
    return NextResponse.json({ error: "workspaceId and company are required" }, { status: 400 });
  }
  try {
    const company = saveCompany(body.workspaceId, { ...body.company, id: undefined });
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 400 });
  }
}
