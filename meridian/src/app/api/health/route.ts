import { NextResponse } from "next/server";
import { loadDb } from "@/server/db";
import { providerStatus } from "@/server/mailer";
import { sqliteStats } from "@/server/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const db = loadDb();
  return NextResponse.json({
    ok: true,
    app: "meridian",
    mail: providerStatus(),
    sqlite: sqliteStats(),
    database: {
      lists: db.lists.length,
      members: db.members.length,
      nodes: db.nodes.length,
      edges: db.edges.length,
      chunks: db.chunks.length,
      campaigns: db.campaigns.length,
      events: db.events.length,
    },
  });
}
