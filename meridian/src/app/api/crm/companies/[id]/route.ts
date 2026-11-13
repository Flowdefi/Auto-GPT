import { NextResponse } from "next/server";
import type { Company } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { getCompany, saveCompany } from "@/server/crm-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const workspaceId = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const company = getCompany(workspaceId, id);
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ company });
}

export async function PATCH(request: Request, context: Context) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = (await request.json()) as { workspaceId?: string; company?: Partial<Company> };
  if (!isWorkspaceId(body.workspaceId) || !body.company) {
    return NextResponse.json({ error: "workspaceId and company are required" }, { status: 400 });
  }
  const current = getCompany(body.workspaceId, id);
  if (!current) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  try {
    const company = saveCompany(body.workspaceId, { ...current, ...body.company, id });
    return NextResponse.json({ company });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 400 });
  }
}
