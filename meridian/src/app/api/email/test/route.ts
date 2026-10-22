import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { sendTest } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
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
