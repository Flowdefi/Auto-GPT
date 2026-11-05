import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { listCompanies } from "@/server/crm-store";
import { listDealRefs, listPortfolios } from "@/server/inventory-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspace = new URL(request.url).searchParams.get("workspace") ?? "triton";
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace must be triton or aether" }, { status: 400 });
  }
  const companies = listCompanies(workspace).map((company) => ({ id: company.id, name: company.name }));
  const names = new Map(companies.map((company) => [company.id, company.name]));
  const deals = listDealRefs(workspace);
  const dealNames = new Map(deals.map((deal) => [deal.id, deal.name]));
  const items = listPortfolios(workspace)
    .map((item) => ({
      ...item,
      sellerName: item.sellerName || names.get(item.sellerCompanyId) || "",
      buyerName: item.buyerName || (item.buyerCompanyId ? names.get(item.buyerCompanyId) : "") || "",
      dealName: item.dealName || (item.dealId ? dealNames.get(item.dealId) : "") || "",
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  return NextResponse.json({ ok: true, items, companies, deals });
}
