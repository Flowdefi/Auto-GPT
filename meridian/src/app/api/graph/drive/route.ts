import { NextResponse } from "next/server";
import { requireSeat } from "@/server/api-guard";
import { listDriveItems } from "@/server/graph-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const drive = await listDriveItems(query);
  return NextResponse.json({ ok: true, ...drive });
}
