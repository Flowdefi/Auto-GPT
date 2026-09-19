import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { crmSnapshot, sqliteStats } from "@/server/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json({
    engine: sqliteStats(),
    ...crmSnapshot(workspace),
  });
}
