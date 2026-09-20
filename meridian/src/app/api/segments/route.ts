import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { evaluateSegment, seedSegments } from "@/server/segments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  const segments = seedSegments(workspace).map((segment) => {
    const matches = evaluateSegment(workspace, segment);
    return {
      ...segment,
      size: matches.length,
      preview: matches.slice(0, 8).map((row) => ({
        email: row.contact.email,
        name: `${row.contact.firstName} ${row.contact.lastName}`.trim(),
        company: row.companyName,
        reason: row.reason,
      })),
    };
  });

  return NextResponse.json({ segments });
}
