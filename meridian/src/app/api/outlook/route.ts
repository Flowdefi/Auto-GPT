import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { loadDb } from "@/server/db";
import { outlookStatus, reassociate, syncAll } from "@/server/outlook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  const db = loadDb();
  const messages = db.inbox
    .filter((row) => row.workspaceId === workspace)
    .slice(0, 100)
    .map((message) => {
      const contact = db.contacts.find((row) => row.id === message.contactId);
      const company = db.companies.find((row) => row.id === message.companyId);
      return {
        ...message,
        contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : undefined,
        companyName: company?.name,
      };
    });

  return NextResponse.json({
    status: outlookStatus(),
    mailboxes: db.mailboxes,
    messages,
    stats: {
      total: db.inbox.filter((row) => row.workspaceId === workspace).length,
      associated: db.inbox.filter((row) => row.workspaceId === workspace && row.contactId).length,
      unmatched: db.inbox.filter((row) => row.workspaceId === workspace && !row.contactId && !row.companyId)
        .length,
    },
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { workspaceId?: string; action?: string };
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  if (body.action === "reassociate") {
    return NextResponse.json(reassociate(body.workspaceId));
  }

  try {
    const results = await syncAll(body.workspaceId);
    const failed = results.filter((row) => row.error);
    return NextResponse.json(
      { results, ok: failed.length === 0 },
      { status: failed.length === results.length ? 400 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
