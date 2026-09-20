import { NextResponse } from "next/server";
import { requireSeat } from "@/server/api-guard";
import { sendCampaign } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as {
    campaignId?: string;
    variants?: string[];
    frequencyCap?: number;
    paceMs?: number;
  };
  if (!body.campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }
  try {
    const campaign = await sendCampaign(body.campaignId, {
      variants: body.variants?.filter((value) => value.trim().length > 0),
      frequencyCap: body.frequencyCap,
      paceMs: body.paceMs,
    });
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 400 },
    );
  }
}
