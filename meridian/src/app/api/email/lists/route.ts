import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { loadDb, mutate, nextId } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspaceId = new URL(request.url).searchParams.get("workspace");
  if (!isWorkspaceId(workspaceId ?? undefined)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const db = loadDb();
  const lists = db.lists
    .filter((list) => list.workspaceId === workspaceId)
    .map((list) => {
      const members = db.members.filter((member) => member.listId === list.id);
      return {
        ...list,
        count: members.length,
        sendable: members.filter((member) => member.subscribed && !member.seedLocked).length,
        locked: members.filter((member) => member.seedLocked).length,
      };
    });
  const templates = db.templates.filter((template) => template.workspaceId === workspaceId);
  const campaigns = db.campaigns.filter((campaign) => campaign.workspaceId === workspaceId);
  return NextResponse.json({ lists, templates, campaigns });
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as {
    workspaceId?: string;
    listId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.listId || !body.email) {
    return NextResponse.json({ error: "workspaceId, listId, and email are required" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const db = loadDb();
  const list = db.lists.find((row) => row.id === body.listId && row.workspaceId === body.workspaceId);
  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }
  const member = mutate((state) => {
    const existing = state.members.find((row) => row.listId === list.id && row.email === email);
    if (existing) {
      existing.seedLocked = false;
      existing.subscribed = true;
      existing.firstName = body.firstName?.trim() || existing.firstName;
      existing.lastName = body.lastName?.trim() || existing.lastName;
      existing.company = body.company?.trim() || existing.company;
      return existing;
    }
    const created = {
      id: nextId("mem"),
      listId: list.id,
      email,
      firstName: body.firstName?.trim() || "Desk",
      lastName: body.lastName?.trim() || "Contact",
      company: body.company?.trim() || "",
      seedLocked: false,
      subscribed: true,
    };
    state.members.push(created);
    return created;
  });
  return NextResponse.json({ member });
}
