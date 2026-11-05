import { NextResponse } from "next/server";
import { safeHttpUrl } from "@/lib/debt";
import type { InventoryItem } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { getPortfolio, updatePortfolio } from "@/server/inventory-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

const STATUSES = new Set<InventoryItem["status"]>(["intake", "listed", "in_market", "awarded", "closed"]);

export async function GET(request: Request, context: Context) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const workspace = new URL(request.url).searchParams.get("workspace") ?? "triton";
  if (!isWorkspaceId(workspace)) return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  const item = getPortfolio(workspace, id);
  if (!item) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  return NextResponse.json({ ok: true, item });
}

export async function PATCH(request: Request, context: Context) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  let body: {
    workspaceId?: string;
    sellerCompanyId?: string;
    buyerCompanyId?: string;
    dealId?: string;
    maskedFileUrl?: string;
    status?: InventoryItem["status"];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  const workspaceId = body.workspaceId ?? "triton";
  if (!isWorkspaceId(workspaceId)) return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  if (body.maskedFileUrl && !safeHttpUrl(body.maskedFileUrl)) {
    return NextResponse.json({ error: "maskedFileUrl must be an http(s) link" }, { status: 400 });
  }
  if (body.status && !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "status is not valid" }, { status: 400 });
  }
  try {
    const item = updatePortfolio(workspaceId, id, {
      sellerCompanyId: body.sellerCompanyId,
      buyerCompanyId: body.buyerCompanyId,
      dealId: body.dealId,
      maskedFileUrl: body.maskedFileUrl,
      status: body.status,
    });
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}
