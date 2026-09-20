import { NextResponse } from "next/server";
import { ready } from "@/server/db";
import { sendCampaign } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { campaignId?: string };
  if (!body.campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }
  await ready();
  try {
    const campaign = await sendCampaign(body.campaignId);
    return NextResponse.json({ campaign });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 400 },
    );
  }
}
