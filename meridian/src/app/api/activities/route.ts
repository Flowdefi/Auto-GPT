import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { isDeskActivityType, listActivities, recordActivity } from "@/server/activities";
import { requireSeat } from "@/server/api-guard";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    activities: listActivities(workspaceId, {
      contactId: url.searchParams.get("contactId") ?? undefined,
      companyId: url.searchParams.get("companyId") ?? undefined,
    }),
  });
}

export async function POST(request: Request) {
  if (rateLimited(`activities:${clientIp(request)}`, 60, 60_000)) return tooMany();
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  let body: {
    workspaceId?: string;
    contactEmail?: string;
    contactName?: string;
    company?: string;
    type?: string;
    kind?: string;
    subject?: string;
    body?: string;
    outlookMessageId?: string;
    outlookConversationId?: string;
    link?: string;
    occurredAt?: string;
    email?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  const workspaceId = isWorkspaceId(body.workspaceId) ? body.workspaceId : "triton";
  const type = body.type ?? body.kind;
  if (!type || !isDeskActivityType(type)) {
    return NextResponse.json({ error: "type is not a known activity" }, { status: 400 });
  }
  if (body.occurredAt && Number.isNaN(Date.parse(body.occurredAt))) {
    return NextResponse.json({ error: "occurredAt is not a date" }, { status: 400 });
  }
  try {
    const result = recordActivity({
      workspaceId,
      contactEmail: body.contactEmail ?? body.email ?? "",
      contactName: body.contactName,
      company: body.company,
      type,
      subject: body.subject ?? "",
      body: body.body,
      outlookMessageId: body.outlookMessageId,
      outlookConversationId: body.outlookConversationId,
      link: body.link,
      occurredAt: body.occurredAt,
      source: "api",
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record activity" }, { status: 400 });
  }
}
