import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { loadDb } from "@/server/db";
import { enrichCompanyRecord } from "@/server/enrich";
import { assignableUsers, createLead, setLeadStatus, sweepSla } from "@/server/workflow";
import type { LeadStatus } from "@/server/models";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUSES: LeadStatus[] = [
  "new",
  "working",
  "mql",
  "routed",
  "accepted",
  "sql",
  "nurture",
  "rejected",
  "converted",
];

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  sweepSla(workspace);
  const db = loadDb();
  const statusFilter = url.searchParams.get("status");

  const leads = db.leads
    .filter((lead) => lead.workspaceId === workspace)
    .filter((lead) => (statusFilter ? lead.status === statusFilter : true))
    .map((lead) => {
      const contact = db.contacts.find((row) => row.id === lead.contactId);
      const company = db.companies.find((row) => row.id === lead.companyId);
      return {
        ...lead,
        contactName: contact ? `${contact.firstName} ${contact.lastName}`.trim() : "Unknown",
        contactEmail: contact?.email ?? "",
        contactTitle: contact?.title ?? "",
        companyName: company?.name ?? "",
        companyDomain: company?.domain ?? "",
        enriched: Boolean(company?.enrichedAt),
      };
    });

  const counts: Record<string, number> = {};
  for (const status of STATUSES) {
    counts[status] = db.leads.filter((lead) => lead.workspaceId === workspace && lead.status === status).length;
  }

  return NextResponse.json({
    leads,
    counts,
    users: assignableUsers(workspace),
    tasks: db.tasks.filter((task) => task.workspaceId === workspace && task.status === "open").slice(0, 50),
    workflows: db.workflows.filter((workflow) => workflow.workspaceId === workspace),
    runs: db.runs.filter((run) => run.workspaceId === workspace).slice(0, 25),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    title?: string;
    phone?: string;
    source?: string;
    message?: string;
    assetClass?: string;
    faceValue?: string;
  };

  if (!isWorkspaceId(body.workspaceId) || !body.email) {
    return NextResponse.json({ error: "workspaceId and email are required" }, { status: 400 });
  }

  const payload: Record<string, string> = {};
  if (body.message) payload.message = body.message;
  if (body.assetClass) payload.assetClass = body.assetClass;
  if (body.faceValue) payload.faceValue = body.faceValue;

  const result = createLead({
    workspaceId: body.workspaceId,
    source: body.source?.trim() || "manual",
    payload,
    contact: {
      workspaceId: body.workspaceId,
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      companyName: body.company,
      title: body.title,
      phone: body.phone,
      tags: ["manual"],
    },
  });

  return NextResponse.json({ lead: result.lead, created: result.created, runs: result.runs });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    leadId?: string;
    status?: string;
    reason?: string;
    ownerId?: string;
    enrich?: boolean;
  };

  if (!isWorkspaceId(body.workspaceId) || !body.leadId) {
    return NextResponse.json({ error: "workspaceId and leadId are required" }, { status: 400 });
  }

  if (body.enrich) {
    const db = loadDb();
    const lead = db.leads.find((row) => row.id === body.leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    const enriched = await enrichCompanyRecord(body.workspaceId, lead.companyId);
    return NextResponse.json(enriched, { status: enriched.ok ? 200 : 400 });
  }

  if (!body.status || !STATUSES.includes(body.status as LeadStatus)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    const lead = setLeadStatus(body.workspaceId, body.leadId, body.status as LeadStatus, {
      reason: body.reason,
      ownerId: body.ownerId,
    });
    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 400 },
    );
  }
}
