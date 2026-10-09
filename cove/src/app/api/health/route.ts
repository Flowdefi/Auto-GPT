import { NextResponse } from "next/server";
import { databaseUrl, ping } from "@/server/postgres";
import { getState } from "@/server/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await getState();
  const postgres = databaseUrl()
    ? await ping()
    : { ok: false, latencyMs: 0, error: "DATABASE_URL unset" };
  return NextResponse.json({
    ok: postgres.ok || state.payload.accounts.length > 0,
    app: "cove",
    postgres,
    database: {
      accounts: state.payload.accounts.length,
      portfolios: state.payload.portfolios.length,
      payments: state.payload.payments.length,
      agents: state.payload.agents.length,
      version: state.version,
    },
  });
}
