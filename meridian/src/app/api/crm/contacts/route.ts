import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { companiesOf, contactsOf, upsertContact } from "@/server/crm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const id = url.searchParams.get("id");
  const companies = companiesOf(workspace);
  const contacts = contactsOf(workspace)
    .filter((contact) => (id ? contact.id === id : true))
    .map((contact) => ({
      ...contact,
      companyName: companies.find((company) => company.id === contact.companyId)?.name ?? "",
    }));
  return NextResponse.json({ contacts, companies });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    workspaceId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    title?: string;
    phone?: string;
    company?: string;
  };
  if (!isWorkspaceId(body.workspaceId) || !body.email?.trim()) {
    return NextResponse.json({ error: "workspaceId and email are required" }, { status: 400 });
  }
  const result = upsertContact({
    workspaceId: body.workspaceId,
    email: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    title: body.title,
    phone: body.phone,
    companyName: body.company,
    tags: ["manual"],
  });
  return NextResponse.json(result);
}
