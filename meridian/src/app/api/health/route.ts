import { NextResponse } from "next/server";
import { llmStatus } from "@/server/ai/cto";
import { embedStatus } from "@/server/ai/embeddings";
import { seatFromRequest } from "@/server/auth";
import { loadDb } from "@/server/db";
import { providerStatus } from "@/server/mailer";
import { outlookStatus } from "@/server/outlook";
import { sqliteStats } from "@/server/sqlite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const seat = seatFromRequest(request);
  if (!seat?.licensed) {
    return NextResponse.json({ ok: true, app: "meridian" });
  }
  const db = loadDb();
  return NextResponse.json({
    ok: true,
    app: "meridian",
    mail: providerStatus(),
    outlook: outlookStatus(),
    ai: llmStatus(),
    embeddings: embedStatus(),
    sqlite: sqliteStats(),
    account: { id: seat.account.id, email: seat.account.email },
    database: {
      lists: db.lists.length,
      members: db.members.length,
      nodes: db.nodes.length,
      edges: db.edges.length,
      chunks: db.chunks.length,
      campaigns: db.campaigns.length,
      events: db.events.length,
      companies: db.companies.length,
      contacts: db.contacts.length,
      leads: db.leads.length,
      inbox: db.inbox.length,
      workflows: db.workflows.length,
      crawls: db.crawls.length,
    },
  });
}
