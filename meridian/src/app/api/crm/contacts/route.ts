import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { listContacts, saveContact } from "@/server/crm-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspaceId = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json({ contacts: listContacts(workspaceId) });
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as { workspaceId?: string; contact?: Partial<Contact> };
  if (!isWorkspaceId(body.workspaceId) || !body.contact) {
    return NextResponse.json({ error: "workspaceId and contact are required" }, { status: 400 });
  }
  try {
    const contact = saveContact(body.workspaceId, { ...body.contact, id: undefined });
    return NextResponse.json({ contact });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 400 });
  }
}
