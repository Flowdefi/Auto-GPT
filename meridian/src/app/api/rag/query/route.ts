import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { queryRag } from "@/server/rag";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as { workspaceId?: string; prompt?: string };
  if (!isWorkspaceId(body.workspaceId) || !body.prompt?.trim()) {
    return NextResponse.json({ error: "workspaceId and prompt required" }, { status: 400 });
  }
  const hits = queryRag(body.workspaceId, body.prompt);
  return NextResponse.json({ hits });
}
