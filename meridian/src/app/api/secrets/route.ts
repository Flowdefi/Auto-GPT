import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { deleteWorkspaceSecret, listWorkspaceSecrets, putWorkspaceSecret } from "@/server/secrets";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (workspace && !isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  return NextResponse.json({ secrets: listWorkspaceSecrets(gate.account.id, workspace) });
}

export async function PUT(request: Request) {
  if (rateLimited(`secrets:${clientIp(request)}`, 20, 60_000)) return tooMany();
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  let body: { workspaceId?: string; name?: string; value?: string };
  try {
    body = (await request.json()) as { workspaceId?: string; name?: string; value?: string };
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId required" }, { status: 400 });
  }
  if (!body.name || !body.value?.trim()) {
    return NextResponse.json({ error: "name and value are required" }, { status: 400 });
  }
  try {
    putWorkspaceSecret(gate.account.id, body.workspaceId, body.name, body.value.trim());
    return NextResponse.json({ ok: true, name: body.name.toUpperCase() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not store secret" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspace") ?? undefined;
  const name = url.searchParams.get("name") ?? "";
  if (!isWorkspaceId(workspaceId) || !name) {
    return NextResponse.json({ error: "workspace and name required" }, { status: 400 });
  }
  try {
    deleteWorkspaceSecret(gate.account.id, workspaceId, name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete secret" },
      { status: 400 },
    );
  }
}
