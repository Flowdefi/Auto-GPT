import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { queryRag } from "@/server/rag";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { workspaceId?: string; prompt?: string };
  if (!isWorkspaceId(body.workspaceId) || !body.prompt?.trim()) {
    return NextResponse.json({ error: "workspaceId and prompt required" }, { status: 400 });
  }
  const hits = queryRag(body.workspaceId, body.prompt);
  return NextResponse.json({ hits });
}
