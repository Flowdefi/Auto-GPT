import { NextResponse } from "next/server";
import { loadDb } from "@/server/db";
import { providerStatus } from "@/server/mailer";

export const dynamic = "force-dynamic";

export function GET() {
  const db = loadDb();
  return NextResponse.json({
    ok: true,
    app: "meridian",
    mail: providerStatus(),
    database: {
      lists: db.lists.length,
      members: db.members.length,
      nodes: db.nodes.length,
      edges: db.edges.length,
      chunks: db.chunks.length,
      campaigns: db.campaigns.length,
    },
  });
}
