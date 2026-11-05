import { NextResponse } from "next/server";
import type { CollectionSequence } from "@/lib/collections/jobs";
import type { RecordingRule } from "@/lib/collections/recording";
import type { SolRule } from "@/lib/collections/sol";
import type { SettlementMatrix } from "@/lib/collections/template-library";
import type { CollectionChannel, ConsumerConsent } from "@/lib/collections/types";
import type { ConsumerTurn } from "@/lib/collections/voice";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { assertPrivilegedMfa } from "@/server/mfa-policy";
import { enrollSequence, listSequences, runDueJobs, saveSequence } from "@/server/collections/runner";
import {
  completeTask,
  collectionSnapshot,
  approveDraft,
  collectionReport,
  collectionsRole,
  fileDispute,
  importPortfolio,
  issueValidation,
  proposeDraft,
  purgeReturnedPii,
  recordConsent,
  revealAccount,
  returnQuarantined,
  renderTemplatePreview,
  sandboxPayment,
  accessReview,
  approveMetro2,
  exportMetro2,
  saveRecordingRules,
  saveSolRules,
  saveSettlementMatrix,
  scrubAccount,
  sendChannel,
  setOperatorRole,
  setTemplateApproval,
  startVoice,
  syncCollectionTemplates,
  turnVoice,
  validationPdfBase64,
  updateEligibility,
  updateVoiceSettings,
} from "@/server/collections/service";
import type { ColumnMapping, WidthField } from "@/lib/collections/portfolio";

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
    taskId?: string;
    xlsxBase64?: string;
    fixedWidth?: string;
    widths?: WidthField[];
    mapping?: ColumnMapping;
    inbound?: string;
    draftId?: string;
    approve?: boolean;
    amountCents?: number;
    email?: string;
    role?: "admin" | "manager" | "collector" | "compliance" | "read_only";
    ownerApproved?: boolean;
    counselReviewed?: boolean;
    matrix?: SettlementMatrix;
    sequence?: CollectionSequence;
    sequenceId?: string;
    solRules?: SolRule[];
    recordingRules?: RecordingRule[];
  };
  const actor = collectionsRole(gate.account.email, gate.account.role);
  const privileged = new Set(["reveal", "eligibility", "template_approval", "matrix", "role", "sol_save", "recording_save", "metro2_approve"]);
  if (body.op && privileged.has(body.op)) {
    try {
      assertPrivilegedMfa(gate.account.id, actor);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "MFA required", mfaRequired: true }, { status: 403 });
    }
  }
  if (actor === "read_only" && body.op && body.op !== "report" && body.op !== "access_review") {
    return NextResponse.json({ error: "Read-only role" }, { status: 403 });
  }
  if (!isWorkspaceId(body.workspaceId)) {
    return NextResponse.json({ error: "workspaceId must be triton or aether" }, { status: 400 });
  }
  try {
    switch (body.op) {
      case "import":
        return NextResponse.json(
          importPortfolio({
            workspaceId: body.workspaceId,
            csv: body.csv,
            xlsxBase64: body.xlsxBase64,
            fixedWidth: body.fixedWidth,
            widths: body.widths,
            mapping: body.mapping,
            portfolioId: body.portfolioId,
          }),
        );
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
          message: await sendChannel({
            workspaceId: body.workspaceId,
            accountId: body.accountId,
            channel: body.channel as CollectionChannel,
            body: body.body ?? "",
            templateId: body.templateId,
          }),
        });
      case "templates":
        return NextResponse.json({ templates: syncCollectionTemplates() });
      case "template_approval":
        if (!body.templateId) return NextResponse.json({ error: "templateId required" }, { status: 400 });
        return NextResponse.json({
          template: setTemplateApproval(body.templateId, { ownerApproved: body.ownerApproved, counselReviewed: body.counselReviewed }, actor),
        });
      case "template_preview":
        if (!body.templateId || !body.accountId) return NextResponse.json({ error: "templateId and accountId required" }, { status: 400 });
        return NextResponse.json(renderTemplatePreview(body.workspaceId, body.templateId, body.accountId));
      case "matrix":
        if (!body.matrix) return NextResponse.json({ error: "matrix required" }, { status: 400 });
        return NextResponse.json({ matrix: saveSettlementMatrix(body.matrix, actor) });
      case "reveal":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ pii: revealAccount(body.workspaceId, body.accountId, actor, gate.account.email) });
      case "validation":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ account: issueValidation(body.workspaceId, body.accountId) });
      case "dispute":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ account: fileDispute(body.workspaceId, body.accountId, body.inbound ?? body.body ?? "Dispute") });
      case "draft":
        if (!body.accountId || !body.inbound) return NextResponse.json({ error: "accountId and inbound required" }, { status: 400 });
        return NextResponse.json({ draft: await proposeDraft(body.workspaceId, body.accountId, body.inbound) });
      case "approve":
        if (!body.draftId) return NextResponse.json({ error: "draftId required" }, { status: 400 });
        return NextResponse.json({ draft: await approveDraft(body.workspaceId, body.draftId, body.approve !== false) });
      case "pay":
        if (!body.accountId || !body.amountCents) return NextResponse.json({ error: "accountId and amountCents required" }, { status: 400 });
        return NextResponse.json({ payment: await sandboxPayment(body.workspaceId, body.accountId, body.amountCents) });
      case "complete_task":
        if (!body.taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
        completeTask(body.workspaceId, body.taskId, gate.account.email);
        return NextResponse.json({ ok: true });
      case "report":
        return NextResponse.json(collectionReport(body.workspaceId));
      case "jobs_run":
        return NextResponse.json({ jobs: await runDueJobs() });
      case "sequence_save":
        if (!body.sequence) return NextResponse.json({ error: "sequence required" }, { status: 400 });
        return NextResponse.json({ sequence: saveSequence({ ...body.sequence, workspaceId: body.workspaceId }), sequences: listSequences(body.workspaceId) });
      case "sequence_enroll":
        if (!body.sequenceId || !body.accountId) return NextResponse.json({ error: "sequenceId and accountId required" }, { status: 400 });
        return NextResponse.json({ enqueued: enrollSequence(body.workspaceId, body.sequenceId, body.accountId) });
      case "sol_save":
        return NextResponse.json({ rules: saveSolRules(body.solRules ?? [], actor) });
      case "scrub":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ account: await scrubAccount(body.workspaceId, body.accountId) });
      case "recording_save":
        return NextResponse.json({ rules: saveRecordingRules(body.recordingRules ?? [], actor) });
      case "metro2_approve":
        return NextResponse.json({ metro2: approveMetro2(actor, gate.account.email) });
      case "metro2_export":
        return NextResponse.json(exportMetro2(body.workspaceId));
      case "access_review":
        return NextResponse.json(accessReview());
      case "notice_pdf":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ pdfBase64: validationPdfBase64(body.workspaceId, body.accountId) });
      case "purge_pii":
        return NextResponse.json({ purged: purgeReturnedPii(body.workspaceId) });
      case "role":
        if (actor !== "admin" || !body.email || !body.role) {
          return NextResponse.json({ error: "Admin email and role required" }, { status: 403 });
        }
        return NextResponse.json({
          roles: setOperatorRole(body.email, body.role),
        });
      default:
        return NextResponse.json({ error: "Unknown op" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Collection action failed" }, { status: 400 });
  }
}
