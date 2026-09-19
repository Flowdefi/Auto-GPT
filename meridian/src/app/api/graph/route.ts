import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { graphSnapshot } from "@/server/rag";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(raw)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json(graphSnapshot(raw));
}
