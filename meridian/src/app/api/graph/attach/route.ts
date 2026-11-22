import { NextResponse } from "next/server";
import { safeHttpUrl } from "@/lib/debt";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { attachFileLink } from "@/server/inventory-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  let body: { workspaceId?: string; target?: string; id?: string; url?: string; name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  const workspaceId = body.workspaceId ?? "triton";
  if (!isWorkspaceId(workspaceId)) return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  if (body.target !== "portfolio" && body.target !== "deal") {
    return NextResponse.json({ error: "target must be portfolio or deal" }, { status: 400 });
  }
  const url = safeHttpUrl(body.url);
  if (!url || !body.id?.trim()) return NextResponse.json({ error: "id and an http(s) url are required" }, { status: 400 });
  try {
    const attached = attachFileLink(workspaceId, body.target, body.id.trim(), url, body.name?.trim());
    return NextResponse.json({ ok: true, ...attached });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Attach failed" }, { status: 400 });
  }
}
