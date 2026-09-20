import { NextResponse } from "next/server";
import { requireAccount } from "@/server/api-guard";
import { publicAccount } from "@/server/auth";
import { billingStatus } from "@/server/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAccount(request);
  if (!gate.ok) return gate.response;
  return NextResponse.json({
    account: publicAccount(gate.account, gate.licensed),
    billing: billingStatus(gate.account),
  });
}
