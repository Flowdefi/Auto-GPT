import { NextResponse } from "next/server";
import { mutate } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  return NextResponse.redirect(new URL(`/u/${token}`, request.url));
}

export async function POST(request: Request) {
  const queryToken = new URL(request.url).searchParams.get("token");
  let bodyToken: string | undefined;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { token?: string };
    bodyToken = body.token;
  } else {
    const text = await request.text();
    if (text.includes("List-Unsubscribe=One-Click") && queryToken) {
      bodyToken = queryToken;
    }
  }
  const token = bodyToken ?? queryToken;
  if (!token) {
    return NextResponse.json({ error: "token required" }, { status: 400 });
  }
  const result = mutate((db) => {
    const message = db.messages.find((row) => row.unsubscribeToken === token);
    if (!message) return { ok: false as const };
    for (const member of db.members.filter((row) => row.email === message.to)) {
      member.subscribed = false;
    }
    if (!db.suppressions.some((row) => row.email === message.to && row.workspaceId === message.workspaceId)) {
      db.suppressions.push({
        id: `sup_${message.to}`,
        workspaceId: message.workspaceId,
        email: message.to,
        reason: "unsubscribe",
        at: new Date().toISOString(),
      });
    }
    const campaign = db.campaigns.find((row) => row.id === message.campaignId);
    if (campaign) campaign.unsubscribed += 1;
    return { ok: true as const, email: message.to };
  });
  if (!result.ok) return NextResponse.json({ error: "Unknown token" }, { status: 404 });
  return NextResponse.json(result);
}
