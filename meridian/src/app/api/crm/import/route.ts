import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { runCsvImport } from "@/server/csv-import";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as {
    workspaceId?: string;
    contactsCsv?: string;
    companiesCsv?: string;
    prospectsCsv?: string;
    doNotEmail?: boolean;
    invalidEmail?: boolean;
    dryRun?: boolean;
  };
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId must be triton or aether" }, { status: 400 });
  }
  if (!body.contactsCsv && !body.companiesCsv && !body.prospectsCsv) {
    return NextResponse.json({ error: "Provide contacts, companies, or prospects CSV text" }, { status: 400 });
  }
  try {
    const report = runCsvImport({
      workspaceId: body.workspaceId,
      contactsCsv: body.contactsCsv,
      companiesCsv: body.companiesCsv,
      prospectsCsv: body.prospectsCsv,
      doNotEmail: body.doNotEmail === true,
      invalidEmail: body.invalidEmail === true,
      dryRun: body.dryRun === true,
    });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 400 });
  }
}
