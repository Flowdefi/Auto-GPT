import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { readCrmJson } from "@/server/crm-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspace = new URL(request.url).searchParams.get("workspace") ?? "triton";
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  }
  const deals = readCrmJson(workspace, "deals").flatMap((row) => {
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) return [];
    return [
      {
        id,
        name: typeof row.name === "string" && row.name ? row.name : id,
        companyId: typeof row.companyId === "string" ? row.companyId : "",
        inventoryId: typeof row.inventoryId === "string" ? row.inventoryId : "",
        fileUrl: typeof row.fileUrl === "string" ? row.fileUrl : "",
        fileName: typeof row.fileName === "string" ? row.fileName : "",
      },
    ];
  });
  return NextResponse.json({ ok: true, deals });
}
