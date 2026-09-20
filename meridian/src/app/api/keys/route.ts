import { NextResponse } from "next/server";
import { requireSeat } from "@/server/api-guard";
import { createApiKey, listApiKeys, revokeApiKey } from "@/server/auth";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ keys: listApiKeys(gate.account.id) });
}

export async function POST(request: Request) {
  if (rateLimited(`keys:${clientIp(request)}`, 10, 60_000)) return tooMany();
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  let body: { name?: string };
  try {
    body = (await request.json()) as { name?: string };
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  try {
    const created = createApiKey(gate.account.id, body.name ?? "Default");
    return NextResponse.json({
      id: created.id,
      prefix: created.prefix,
      key: created.key,
      hint: "Copy this key now. Meridian only stores a hash.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create key" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  revokeApiKey(gate.account.id, id);
  return NextResponse.json({ ok: true });
}
