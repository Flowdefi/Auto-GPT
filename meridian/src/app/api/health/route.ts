import { NextResponse } from "next/server";
import { loadDb, ready } from "@/server/db";
import { providerStatus } from "@/server/mailer";
import { databaseUrl, ping } from "@/server/postgres";
import { sqliteStats } from "@/server/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = await ready();
  const postgres = databaseUrl() ? await ping() : { ok: false, latencyMs: 0, error: "DATABASE_URL unset" };
  return NextResponse.json({
    ok: postgres.ok || Boolean(loadDb()),
    app: "meridian",
    mail: providerStatus(),
    sqlite: sqliteStats(),
    postgres,
    database: {
      lists: db.lists.length,
      members: db.members.length,
      nodes: db.nodes.length,
      edges: db.edges.length,
      chunks: db.chunks.length,
      campaigns: db.campaigns.length,
      events: db.events.length,
      contacts: db.contacts.length,
      companies: db.companies.length,
    },
  });
}
