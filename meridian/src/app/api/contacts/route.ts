import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { lookupContact } from "@/server/activities";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (rateLimited(`contacts-lookup:${clientIp(request)}`, 60, 60_000)) return tooMany();
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim() ?? "";
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const workspace = url.searchParams.get("workspace") ?? undefined;
  const found = lookupContact(email, isWorkspaceId(workspace) ? workspace : undefined);
  if (!found) return NextResponse.json({ error: "No contact for that email" }, { status: 404 });
  return NextResponse.json(found);
}
