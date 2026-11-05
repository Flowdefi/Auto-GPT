import { NextResponse } from "next/server";
import type { CollectionChannel, ConsumerConsent } from "@/lib/collections/types";
import type { ConsumerTurn } from "@/lib/collections/voice";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import {
  collectionSnapshot,
  importPortfolio,
  recordConsent,
  returnQuarantined,
  sendChannel,
  startVoice,
  syncCollectionTemplates,
  turnVoice,
  updateEligibility,
  updateVoiceSettings,
} from "@/server/collections/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const workspaceId = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspaceId)) return NextResponse.json({ error: "workspace required" }, { status: 400 });
  return NextResponse.json(collectionSnapshot(workspaceId));
}

export async function POST(request: Request) {
  const gate = await requireSeat(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as {
    op?: string;
    workspaceId?: string;
    csv?: string;
    portfolioId?: string;
    code?: string;
    eligible?: boolean;
    notes?: string;
    needsCounselReview?: boolean;
    killSwitch?: boolean;
    blockInbound?: boolean;
    dailyOutboundCap?: number;
    maxDiscountPercent?: number;
    maxPlanMonths?: number;
    rndSandboxClear?: boolean;
    accountId?: string;
    channel?: ConsumerConsent["channel"] | CollectionChannel;
    source?: string;
    direction?: "inbound" | "outbound";
    campaignId?: string;
    callId?: string;
    turn?: ConsumerTurn;
    body?: string;
    templateId?: string;
  };
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId must be triton or aether" }, { status: 400 });
  }
  try {
    switch (body.op) {
      case "import":
        return NextResponse.json(importPortfolio(body.workspaceId, body.csv ?? "", body.portfolioId ?? ""));
      case "return":
        return NextResponse.json({ returned: returnQuarantined(body.workspaceId, body.portfolioId) });
      case "eligibility":
        if (!body.code) return NextResponse.json({ error: "code required" }, { status: 400 });
        return NextResponse.json({
          row: updateEligibility(body.code, {
            eligible: body.eligible,
            notes: body.notes,
            needsCounselReview: body.needsCounselReview,
          }),
        });
      case "settings":
        return NextResponse.json({
          settings: updateVoiceSettings({
            killSwitch: body.killSwitch,
            blockInbound: body.blockInbound,
            dailyOutboundCap: body.dailyOutboundCap,
            maxDiscountPercent: body.maxDiscountPercent,
            maxPlanMonths: body.maxPlanMonths,
            rndSandboxClear: body.rndSandboxClear,
          }),
        });
      case "consent":
        if (!body.accountId || (body.channel !== "voice_cell" && body.channel !== "sms" && body.channel !== "email")) {
          return NextResponse.json({ error: "accountId and consent channel required" }, { status: 400 });
        }
        return NextResponse.json({ consent: recordConsent(body.workspaceId, body.accountId, body.channel, body.source || "operator") });
      case "voice_start":
        return NextResponse.json(
          startVoice({
            workspaceId: body.workspaceId,
            direction: body.direction === "inbound" ? "inbound" : "outbound",
            accountId: body.accountId,
            campaignId: body.campaignId,
          }),
        );
      case "voice_turn":
        if (!body.callId || !body.turn) return NextResponse.json({ error: "callId and turn required" }, { status: 400 });
        return NextResponse.json(turnVoice(body.workspaceId, body.callId, body.turn));
      case "channel":
        if (!body.accountId || !body.channel || body.channel === "voice_cell") {
          return NextResponse.json({ error: "accountId and channel required" }, { status: 400 });
        }
        return NextResponse.json({
          message: sendChannel({
            workspaceId: body.workspaceId,
            accountId: body.accountId,
            channel: body.channel as CollectionChannel,
            body: body.body ?? "",
            templateId: body.templateId,
          }),
        });
      case "templates":
        return NextResponse.json({ templates: syncCollectionTemplates() });
      default:
        return NextResponse.json({ error: "Unknown op" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Collection action failed" }, { status: 400 });
  }
}
