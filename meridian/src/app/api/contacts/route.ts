import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { getCompany, listContacts } from "@/server/crm-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "email query is required" }, { status: 400 });
  }
  const workspace = url.searchParams.get("workspace") ?? "triton";
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  }
  const contact = listContacts(workspace).find((row) => row.email.toLowerCase() === email) ?? null;
  const company = contact?.companyId ? getCompany(workspace, contact.companyId) : null;
  return NextResponse.json({
    ok: true,
    contact,
    company: company ? { id: company.id, name: company.name, domain: company.domain } : null,
  });
}
