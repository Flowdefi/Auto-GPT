import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { analyticsSnapshot, recordPageView } from "@/server/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json(analyticsSnapshot(workspace));
}

export async function POST(request: Request) {
  const body = (await request.json()) as { path?: string; workspaceId?: string; name?: string };
  if (typeof body.path !== "string" || !body.path.startsWith("/")) {
    return NextResponse.json({ error: "path must start with /" }, { status: 400 });
  }
  if (body.name !== undefined && body.name !== "page_view") {
    return NextResponse.json({ error: "only page_view is recorded" }, { status: 400 });
  }
  if (body.workspaceId !== undefined && !isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId is invalid" }, { status: 400 });
  }
  const saved = await recordPageView({ path: body.path, workspaceId: body.workspaceId });
  return NextResponse.json(saved);
}
