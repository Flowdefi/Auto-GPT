import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { catalogForUi } from "@/server/ai/models";
import { embedStatus } from "@/server/ai/embeddings";
import { autoImprove } from "@/server/ai/improve";
import { llmStatus, runCto } from "@/server/ai/cto";
import { executeTool, toolCatalog } from "@/server/ai/tools";
import { loadDb } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const db = loadDb();
  return NextResponse.json({
    model: llmStatus(),
    embeddings: embedStatus(),
    catalog: catalogForUi(),
    tools: toolCatalog(),
    audit: db.aiAudit.filter((entry) => entry.workspaceId === workspace).slice(0, 40),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    prompt?: string;
    tool?: string;
    action?: string;
    args?: Record<string, string>;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  try {
    if (body.action === "improve") {
      return NextResponse.json(await autoImprove(body.workspaceId));
    }

    if (body.tool) {
      const outcome = await executeTool(body.tool, body.args ?? {}, { workspaceId: body.workspaceId });
      return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
    }

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "prompt or tool required" }, { status: 400 });
    }

    const turn = await runCto(body.workspaceId, body.prompt.trim(), body.history ?? []);
    return NextResponse.json(turn);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI request failed" },
      { status: 500 },
    );
  }
}
