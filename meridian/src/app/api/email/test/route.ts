import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { ready } from "@/server/db";
import { sendTest } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    to?: string;
    subject?: string;
    html?: string;
    text?: string;
    previewText?: string;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.to || !body.subject || !body.html) {
    return NextResponse.json({ error: "workspaceId, to, subject, and html are required" }, { status: 400 });
  }
  await ready();
  try {
    const result = await sendTest(
      body.workspaceId,
      body.to.trim(),
      body.subject,
      body.html,
      body.text ?? "",
      body.previewText ?? "",
    );
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test send failed" },
      { status: 400 },
    );
  }
}
