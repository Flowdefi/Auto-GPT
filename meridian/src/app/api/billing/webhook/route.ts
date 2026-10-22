import { NextResponse } from "next/server";
import { applyPolarEvent, verifyPolarWebhook } from "@/server/billing";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rateLimited(`polar-webhook:${clientIp(request)}`, 60, 60_000)) return tooMany();
  const raw = await request.text();
  if (!verifyPolarWebhook(request, raw)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Unreadable webhook" }, { status: 400 });
  }
  try {
    const result = applyPolarEvent(payload);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 400 },
    );
  }
}
