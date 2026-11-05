import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { listActivities, logActivity } from "@/server/activities";
import type { WorkspaceId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function workspaceOf(value: unknown): WorkspaceId | null {
  if (value === undefined || value === null || value === "") return "triton";
  const text = typeof value === "string" ? value : "";
  return isWorkspaceId(text) ? text : null;
}

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const workspaceId = workspaceOf(url.searchParams.get("workspace"));
  if (!workspaceId) return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  const activities = listActivities(workspaceId, {
    contactId: url.searchParams.get("contactId") ?? undefined,
    companyId: url.searchParams.get("companyId") ?? undefined,
    dealId: url.searchParams.get("dealId") ?? undefined,
    email: url.searchParams.get("email") ?? undefined,
  });
  return NextResponse.json({ ok: true, activities });
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  const workspaceId = workspaceOf(body.workspaceId ?? body.workspace);
  if (!workspaceId) return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  try {
    const result = logActivity({
      workspaceId,
      kind: body.kind ?? body.type ?? body.direction,
      subject: typeof body.subject === "string" ? body.subject : undefined,
      body: typeof body.body === "string" ? body.body : undefined,
      at: typeof body.at === "string" ? body.at : undefined,
      email: typeof body.email === "string" ? body.email : undefined,
      contactId: typeof body.contactId === "string" ? body.contactId : undefined,
      companyId: typeof body.companyId === "string" ? body.companyId : undefined,
      dealId: typeof body.dealId === "string" ? body.dealId : undefined,
      firstName: typeof body.firstName === "string" ? body.firstName : undefined,
      lastName: typeof body.lastName === "string" ? body.lastName : undefined,
      externalId: typeof body.externalId === "string" ? body.externalId : undefined,
      source: typeof body.source === "string" ? body.source : "api",
      userId: gate.account.id,
      allowCreate: body.createContact === false || body.allowCreate === false ? false : true,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not log activity" }, { status: 400 });
  }
}
