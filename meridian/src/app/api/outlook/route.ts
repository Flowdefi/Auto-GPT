import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { appendLinkedActivity } from "@/server/activities";
import { loadDb, mutate, nextId } from "@/server/db";
import { attachInventoryFile } from "@/server/inventory";
import { listDrive, outlookConfig, outlookStatus, reassociate, syncAll } from "@/server/outlook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
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
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as {
    workspaceId?: string;
    action?: string;
    mailbox?: string;
    itemId?: string;
    target?: "inventory" | "deal" | "contact";
    targetId?: string;
    name?: string;
    webUrl?: string;
    driveItemId?: string;
  };
  const workspaceId = body.workspaceId;
  if (!isWorkspaceId(workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }

  if (body.action === "reassociate") {
    return NextResponse.json(reassociate(workspaceId));
  }

  if (body.action === "drive") {
    if (!outlookConfig()) {
      return NextResponse.json({ configured: false, items: [], hint: outlookStatus().hint });
    }
    const mailbox = body.mailbox || outlookConfig()?.mailboxes[0];
    if (!mailbox) return NextResponse.json({ configured: false, items: [], hint: outlookStatus().hint });
    return NextResponse.json(await listDrive(mailbox, body.itemId));
  }

  if (body.action === "attach") {
    if (!body.target || !body.targetId || !body.name) {
      return NextResponse.json({ error: "target, targetId, and name are required" }, { status: 400 });
    }
    if (body.target !== "inventory" && body.target !== "deal" && body.target !== "contact") {
      return NextResponse.json({ error: "target must be inventory, deal, or contact" }, { status: 400 });
    }
    const target = body.target;
    const targetId = body.targetId;
    const name = body.name;
    const link = mutate((db) => {
      const row = {
        id: nextId("drv"),
        workspaceId,
        target,
        targetId,
        name,
        webUrl: body.webUrl,
        driveItemId: body.driveItemId,
        at: new Date().toISOString(),
      };
      db.driveLinks = [row, ...(db.driveLinks ?? [])].slice(0, 2000);
      return row;
    });
    if (target === "inventory") {
      attachInventoryFile(workspaceId, targetId, {
        name,
        webUrl: body.webUrl,
        driveItemId: body.driveItemId,
      });
    }
    if (target === "contact") {
      appendLinkedActivity({
        workspaceId,
        contactId: targetId,
        type: "file_shared",
        subject: name,
        link: body.webUrl,
        source: "graph",
        outlookMessageId: body.driveItemId ? `drive:${body.driveItemId}` : undefined,
      });
    }
    return NextResponse.json({ link });
  }

  try {
    const results = await syncAll(workspaceId);
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
