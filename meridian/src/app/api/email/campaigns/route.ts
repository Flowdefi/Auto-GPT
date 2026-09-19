import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { loadDb, mutate, nextId } from "@/server/db";
import { fromAddress } from "@/server/mailer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    name?: string;
    listId?: string;
    templateId?: string;
    subject?: string;
    previewText?: string;
    html?: string;
    text?: string;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.listId || !body.subject || !body.html) {
    return NextResponse.json({ error: "workspaceId, listId, subject, and html are required" }, { status: 400 });
  }
  const workspaceId = body.workspaceId;
  const listId = body.listId;
  const subject = body.subject;
  const html = body.html;
  const from = fromAddress(workspaceId);
  const campaign = mutate((db) => {
    const template = body.templateId
      ? db.templates.find((row) => row.id === body.templateId)
      : undefined;
    const created = {
      id: nextId("bc"),
      workspaceId,
      name: body.name?.trim() || subject,
      listId,
      templateId: body.templateId,
      subject,
      previewText: body.previewText ?? template?.previewText ?? "",
      html,
      text: body.text ?? "",
      fromName: from.name,
      fromEmail: from.email,
      replyTo: from.email,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      intended: 0,
      delivered: 0,
      skipped: 0,
      failed: 0,
      unsubscribed: 0,
    };
    db.campaigns.unshift(created);
    return created;
  });
  return NextResponse.json({ campaign });
}

export function GET(request: Request) {
  const campaignId = new URL(request.url).searchParams.get("id");
  const db = loadDb();
  if (!campaignId) {
    return NextResponse.json({ campaigns: db.campaigns });
  }
  const campaign = db.campaigns.find((row) => row.id === campaignId);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const messages = db.messages.filter((message) => message.campaignId === campaignId);
  return NextResponse.json({ campaign, messages });
}
