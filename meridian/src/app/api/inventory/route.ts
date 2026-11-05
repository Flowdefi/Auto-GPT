import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { attachInventoryFile, getInventory, importInventory, linkInventory, listInventory } from "@/server/inventory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) return NextResponse.json({ error: "workspace required" }, { status: 400 });
  const id = url.searchParams.get("id");
  if (id) {
    const item = getInventory(workspaceId, id);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  }
  return NextResponse.json({ items: listInventory(workspaceId) });
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as {
    op?: string;
    workspaceId?: string;
    csv?: string;
    xlsxBase64?: string;
    id?: string;
    dealId?: string;
    buyerContactId?: string;
    name?: string;
    webUrl?: string;
    driveItemId?: string;
  };
  const workspaceId = body.workspaceId;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  try {
    if (body.op === "import") {
      return NextResponse.json(importInventory({ workspaceId, csv: body.csv, xlsxBase64: body.xlsxBase64 }));
    }
    if (body.op === "link") {
      if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
      return NextResponse.json({
        item: linkInventory(workspaceId, body.id, { dealId: body.dealId, buyerContactId: body.buyerContactId }),
      });
    }
    if (body.op === "file") {
      if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
      return NextResponse.json({
        file: attachInventoryFile(workspaceId, body.id, {
          name: body.name ?? "File",
          webUrl: body.webUrl,
          driveItemId: body.driveItemId,
        }),
      });
    }
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inventory request failed" }, { status: 400 });
  }
}
