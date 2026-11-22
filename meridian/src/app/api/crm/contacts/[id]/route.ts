import { NextResponse } from "next/server";
import type { Contact } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { getContact, saveContact } from "@/server/crm-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const workspaceId = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const contact = getContact(workspaceId, id);
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  return NextResponse.json({ contact });
}

export async function PATCH(request: Request, context: Context) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const { id } = await context.params;
  const body = (await request.json()) as { workspaceId?: string; contact?: Partial<Contact> };
  if (!isWorkspaceId(body.workspaceId) || !body.contact) {
    return NextResponse.json({ error: "workspaceId and contact are required" }, { status: 400 });
  }
  const current = getContact(body.workspaceId, id);
  if (!current) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  try {
    const contact = saveContact(body.workspaceId, { ...current, ...body.contact, id });
    return NextResponse.json({ contact });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Save failed" }, { status: 400 });
  }
}
