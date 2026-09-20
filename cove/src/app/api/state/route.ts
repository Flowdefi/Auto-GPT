import { NextResponse } from "next/server";
import { getState, isAppData, putState } from "@/server/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await getState();
  return NextResponse.json({
    ok: true,
    version: state.version,
    payload: state.payload,
  });
}

export async function PUT(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isAppData(body)) {
    return NextResponse.json({ ok: false, error: "Invalid floor snapshot" }, { status: 400 });
  }
  const state = await putState(body);
  return NextResponse.json({ ok: true, version: state.version });
}
