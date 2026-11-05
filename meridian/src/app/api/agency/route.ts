import { NextResponse } from "next/server";
import { fileComplaint } from "@/server/collections/complaint-store";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";
import { assertSameOrigin } from "@/server/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rateLimited(`agency:${clientIp(request)}`, 8, 60_000)) return tooMany();
  try {
    assertSameOrigin(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cross-site request blocked" }, { status: 403 });
  }
  const body = (await request.json()) as { summary?: string; accountRef?: string; channel?: string; rootCause?: string; kind?: string };
  try {
    const complaint = fileComplaint("triton", {
      channel: body.channel ?? "web",
      accountRef: body.accountRef,
      summary: body.summary,
      rootCause: body.kind === "dispute" ? "validation" : body.rootCause,
    });
    return NextResponse.json({ id: complaint.id, responseDueAt: complaint.responseDueAt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Message was not saved" }, { status: 400 });
  }
}
