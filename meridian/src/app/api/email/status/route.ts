import { NextResponse } from "next/server";
import { requireSeat } from "@/server/api-guard";
import { providerStatus } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  return NextResponse.json(providerStatus());
}
