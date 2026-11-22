import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { isDeskActivityType, listActivities, recordActivity } from "@/server/activities";
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
  const body = (await request.json()) as {
    workspaceId?: string;
    contactEmail?: string;
    contactName?: string;
    company?: string;
    type?: string;
    subject?: string;
    body?: string;
    outlookMessageId?: string;
    outlookConversationId?: string;
    link?: string;
    occurredAt?: string;
  };
  const workspaceId = isWorkspaceId(body.workspaceId) ? body.workspaceId : "triton";
  if (!body.type || !isDeskActivityType(body.type)) {
    return NextResponse.json({ error: "type is not a known activity" }, { status: 400 });
  }
  if (body.occurredAt && Number.isNaN(Date.parse(body.occurredAt))) {
    return NextResponse.json({ error: "occurredAt is not a date" }, { status: 400 });
  }
  try {
    const result = recordActivity({
      workspaceId,
      contactEmail: body.contactEmail ?? "",
      contactName: body.contactName,
      company: body.company,
      type: body.type,
      subject: body.subject ?? "",
      body: body.body,
      outlookMessageId: body.outlookMessageId,
      outlookConversationId: body.outlookConversationId,
      link: body.link,
      occurredAt: body.occurredAt,
      source: "api",
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not record activity" }, { status: 400 });
  }
}
