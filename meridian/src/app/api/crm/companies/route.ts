import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { companiesOf, contactsOf } from "@/server/crm";
import { mutate, nextId } from "@/server/db";
import { enrichCompanyRecord } from "@/server/enrich";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const id = url.searchParams.get("id");
  const companies = companiesOf(workspace).filter((company) => (id ? company.id === id : true));
  const contacts = contactsOf(workspace).filter((contact) => (id ? contact.companyId === id : true));
  return NextResponse.json({ companies, contacts });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    name?: string;
    domain?: string;
    industry?: string;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.name?.trim()) {
    return NextResponse.json({ error: "workspaceId and name are required" }, { status: 400 });
  }
  const workspaceId = body.workspaceId;
  const name = body.name.trim();
  const company = mutate((db) => {
    const existing = db.companies.find(
      (row) => row.workspaceId === workspaceId && row.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) return existing;
    const created = {
      id: nextId("co"),
      workspaceId,
      name,
      domain: (body.domain ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
      type: "prospect",
      industry: body.industry ?? "",
      city: "",
      state: "",
      employees: "",
      ownerId: "",
      lifecycle: "lead",
      score: 40,
      notes: "Created from the CRM.",
      createdAt: new Date().toISOString(),
    };
    db.companies.push(created);
    return created;
  });
  return NextResponse.json({ company });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    companyId?: string;
    notes?: string;
    industry?: string;
    enrich?: boolean;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.companyId) {
    return NextResponse.json({ error: "workspaceId and companyId are required" }, { status: 400 });
  }
  if (body.enrich) {
    const enriched = await enrichCompanyRecord(body.workspaceId, body.companyId);
    return NextResponse.json(enriched, { status: enriched.ok ? 200 : 400 });
  }
  const company = mutate((db) => {
    const row = db.companies.find((item) => item.id === body.companyId && item.workspaceId === body.workspaceId);
    if (!row) return null;
    if (typeof body.notes === "string") row.notes = body.notes;
    if (typeof body.industry === "string") row.industry = body.industry;
    return row;
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  return NextResponse.json({ company });
}
