import { NextResponse } from "next/server";
import type { CollectionSequence } from "@/lib/collections/jobs";
import type { RecordingRule } from "@/lib/collections/recording";
import type { SolRule } from "@/lib/collections/sol";
import type { SettlementMatrix } from "@/lib/collections/template-library";
import type { CollectionChannel, ConsumerConsent } from "@/lib/collections/types";
import type { ConsumerTurn } from "@/lib/collections/voice";
import { isWorkspaceId } from "@/lib/workspace-id";
import { requireSeat } from "@/server/api-guard";
import { assertPrivilegedMfa, isPrivilegedCollectionOp } from "@/server/mfa-policy";
import { assertSameOrigin } from "@/server/security";
import { bindClient, clientHome, placeForClient, recallForClient } from "@/server/collections/client-portal";
import { complaintReport, fileComplaint, setComplaintStatus } from "@/server/collections/complaint-store";
import { postAchPayment, reversePayment } from "@/server/collections/payments";
import { campaignAttempts, createDialCampaign, listDialCampaigns, previewOutbound, presenceBoard, setCampaignRunning, setPresence, wrapCall } from "@/server/collections/dialer";
import { account360, dailyScorecard, markPromiseKept, setPromise } from "@/server/collections/floor";
import { listMailJobs, mailPdf, markMailReturned, queueLetter } from "@/server/collections/letters";
import { deskMetrics, listDigests } from "@/server/collections/observe";
import { quizPrompts, scoreAndStore, seedTrainingDesk, TRAINING_SCENARIOS, trainingCleared, trainingStatus } from "@/server/collections/training";
import { closePortfolio, portfolioEconomics, savePortfolioCost, sellerScorecards } from "@/server/collections/economics";
import { counselPacket } from "@/server/collections/counsel";
import { freezeOutbound, incidentHome, liftOutboundFreeze, recordTabletop, runFreezeDrill } from "@/server/collections/incident";
import { runScrub, scrubHistory } from "@/server/collections/scrubs";
import { approveSettlement, counterSettlement, listSettlements, openSettlement, previewSettlement, releaseSettlementLetter, settlementPolicy } from "@/server/collections/settlement-desk";
import { applySkipTrace } from "@/server/collections/skip-trace";
import { attachLiveDial, hangupActiveCalls } from "@/server/collections/voice-live";
import { brandFor, currentBrand, saveBrand } from "@/server/brand";
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
  setRndSandboxClear,
  setTemplateApproval,
  startVoice,
  syncCollectionTemplates,
  turnVoice,
  validationPdfBase64,
  updateEligibility,
  saveVoiceLimits,
  voiceSettingsFor,
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
  try {
    assertSameOrigin(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cross-site request blocked" }, { status: 403 });
  }
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
    role?: "admin" | "manager" | "collector" | "compliance" | "read_only" | "client";
    roleWorkspace?: string;
    sellerName?: string;
    recurring?: boolean;
    accepted?: boolean;
    paymentId?: string;
    reversal?: "reversed" | "nsf";
    complaintId?: string;
    complaintChannel?: string;
    rootCause?: string;
    cfpbId?: string;
    summary?: string;
    accountRef?: string;
    dueOn?: string;
    brandName?: string;
    logoUrl?: string;
    color?: string;
    domain?: string;
    status?: "open" | "responded" | "closed";
    ownerApproved?: boolean;
    counselReviewed?: boolean;
    matrix?: SettlementMatrix;
    sequence?: CollectionSequence;
    sequenceId?: string;
    solRules?: SolRule[];
    recordingRules?: RecordingRule[];
    disposition?: string;
    callbackAt?: string;
    promiseDue?: string;
    presence?: string;
    campaignName?: string;
    maxConcurrent?: number;
    answers?: number[];
    mailJobId?: string;
    running?: boolean;
    costCents?: number;
    counterCents?: number;
    caseId?: string;
    scrubKind?: "bankruptcy" | "deceased";
    checked?: string[];
    taskIds?: string[];
  };
  const actor = collectionsRole(gate.account.email, gate.account.role);
  if (body.op && isPrivilegedCollectionOp(body.op)) {
    try {
      assertPrivilegedMfa(gate.account.id, actor);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "MFA required", mfaRequired: true }, { status: 403 });
    }
  }
  if (actor === "client" && body.op && !["client_home", "client_place", "client_recall"].includes(body.op)) {
    return NextResponse.json({ error: "Clients can only see their own placements" }, { status: 403 });
  }
  if (actor === "read_only" && body.op && !["report", "access_review", "complaint_report", "ops", "presence", "economics", "incident_home", "scrub_log", "counsel_packet", "settlement_preview", "settlement_list"].includes(body.op)) {
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
      case "settings": {
        if (body.killSwitch !== undefined && actor !== "admin" && actor !== "compliance") {
          return NextResponse.json({ error: "Compliance must set the kill switch" }, { status: 403 });
        }
        if (body.rndSandboxClear !== undefined && actor !== "admin" && actor !== "compliance") {
          return NextResponse.json({ error: "Compliance must set the reassigned-number sandbox clear" }, { status: 403 });
        }
        if (body.killSwitch === true) await freezeOutbound(body.workspaceId);
        if (body.killSwitch === false) liftOutboundFreeze(body.workspaceId);
        if (body.rndSandboxClear !== undefined) setRndSandboxClear(body.workspaceId, body.rndSandboxClear);
        saveVoiceLimits(body.workspaceId, {
          blockInbound: body.blockInbound,
          dailyOutboundCap: body.dailyOutboundCap,
          maxDiscountPercent: body.maxDiscountPercent,
          maxPlanMonths: body.maxPlanMonths,
        });
        const hungUp = body.killSwitch === true ? await hangupActiveCalls(undefined, body.workspaceId) : 0;
        return NextResponse.json({ settings: voiceSettingsFor(body.workspaceId), hungUp });
      }
      case "consent":
        if (!body.accountId || (body.channel !== "voice_cell" && body.channel !== "sms" && body.channel !== "email")) {
          return NextResponse.json({ error: "accountId and consent channel required" }, { status: 400 });
        }
        return NextResponse.json({ consent: recordConsent(body.workspaceId, body.accountId, body.channel, body.source || "operator") });
      case "voice_start": {
        const started = startVoice({
          workspaceId: body.workspaceId,
          direction: body.direction === "inbound" ? "inbound" : "outbound",
          accountId: body.accountId,
          campaignId: body.campaignId,
        });
        const holdForTraining = started.direction === "outbound" && !started.blockedReason && (actor === "collector" || actor === "manager") && !trainingCleared(gate.account.email, body.workspaceId);
        const live = holdForTraining
          ? { sandbox: true, provider: "sandbox", held: "training" }
          : { ...(await attachLiveDial(started.id)), held: null };
        if (!started.blockedReason) setPresence(body.workspaceId, gate.account.email, "on_call");
        return NextResponse.json({ ...started, live });
      }
      case "dial_preview":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json(previewOutbound(body.workspaceId, body.accountId));
      case "call_wrap":
        if (!body.callId || !body.disposition) return NextResponse.json({ error: "callId and disposition required" }, { status: 400 });
        return NextResponse.json(wrapCall({
          workspaceId: body.workspaceId,
          callId: body.callId,
          disposition: body.disposition,
          notes: body.notes ?? "",
          operator: gate.account.email,
          callbackAt: body.callbackAt,
          promiseCents: body.amountCents,
          promiseDue: body.promiseDue,
        }));
      case "presence":
        if (body.presence) setPresence(body.workspaceId, gate.account.email, body.presence);
        return NextResponse.json({ board: presenceBoard(body.workspaceId) });
      case "campaign_create":
        if (actor !== "admin" && actor !== "manager") return NextResponse.json({ error: "A manager builds a campaign" }, { status: 403 });
        return NextResponse.json({ campaign: createDialCampaign(body.workspaceId, body.campaignName ?? "Campaign", body.maxConcurrent ?? 1) });
      case "campaign_list":
        return NextResponse.json({ campaigns: listDialCampaigns(body.workspaceId) });
      case "campaign_attempts":
        if (!body.campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
        return NextResponse.json({ attempts: campaignAttempts(body.workspaceId, body.campaignId) });
      case "campaign_start":
        if (!body.campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });
        if (actor !== "admin" && actor !== "manager") return NextResponse.json({ error: "A manager starts a campaign" }, { status: 403 });
        return NextResponse.json({ campaign: setCampaignRunning(body.workspaceId, body.campaignId, body.running !== false) });
      case "letter_queue":
        if (!body.accountId || !body.templateId) return NextResponse.json({ error: "accountId and templateId required" }, { status: 400 });
        const queued = queueLetter(body.workspaceId, body.accountId, body.templateId);
        return NextResponse.json({
          job: { id: queued.id, status: queued.status, reason: queued.reason, templateId: queued.templateId },
          jobs: listMailJobs(body.workspaceId),
        });
      case "letter_list":
        return NextResponse.json({ jobs: listMailJobs(body.workspaceId) });
      case "letter_pdf":
        if (!body.mailJobId) return NextResponse.json({ error: "mailJobId required" }, { status: 400 });
        return NextResponse.json({ pdfBase64: mailPdf(body.workspaceId, body.mailJobId) });
      case "letter_returned":
        if (!body.mailJobId) return NextResponse.json({ error: "mailJobId required" }, { status: 400 });
        return NextResponse.json({ paused: markMailReturned(body.workspaceId, body.mailJobId) });
      case "training_seed":
        return NextResponse.json(seedTrainingDesk(body.workspaceId));
      case "training_home":
        return NextResponse.json({ scenarios: TRAINING_SCENARIOS, quiz: quizPrompts(), progress: trainingStatus(body.workspaceId, gate.account.email) });
      case "training_score":
        if (!body.answers) return NextResponse.json({ error: "answers required" }, { status: 400 });
        return NextResponse.json(scoreAndStore(body.workspaceId, gate.account.email, body.answers));
      case "ops":
        return NextResponse.json({ metrics: deskMetrics(body.workspaceId), digests: listDigests(body.workspaceId) });
      case "economics":
        return NextResponse.json({ rows: portfolioEconomics(body.workspaceId), sellers: sellerScorecards(body.workspaceId) });
      case "cost_save":
        if (!body.portfolioId || body.costCents === undefined) return NextResponse.json({ error: "portfolioId and costCents required" }, { status: 400 });
        if (actor !== "admin" && actor !== "manager") return NextResponse.json({ error: "A manager records portfolio cost" }, { status: 403 });
        return NextResponse.json({ book: savePortfolioCost(body.workspaceId, body.portfolioId, body.costCents, body.sellerName ?? "") });
      case "portfolio_close":
        if (!body.portfolioId) return NextResponse.json({ error: "portfolioId required" }, { status: 400 });
        if (actor !== "admin" && actor !== "compliance") return NextResponse.json({ error: "Compliance closes a portfolio" }, { status: 403 });
        return NextResponse.json({ statement: closePortfolio(body.workspaceId, body.portfolioId) });
      case "scrub":
        if (!body.accountId || (body.scrubKind !== "bankruptcy" && body.scrubKind !== "deceased")) {
          return NextResponse.json({ error: "accountId and scrubKind required" }, { status: 400 });
        }
        return NextResponse.json({ event: await runScrub(body.workspaceId, body.accountId, body.scrubKind), history: scrubHistory(body.workspaceId, body.accountId) });
      case "scrub_log":
        return NextResponse.json({ history: scrubHistory(body.workspaceId, body.accountId) });
      case "settlement_preview":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ preview: previewSettlement(body.workspaceId, body.accountId), policy: settlementPolicy() });
      case "settlement_open":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ settlement: openSettlement(body.workspaceId, body.accountId), cases: listSettlements(body.workspaceId) });
      case "settlement_counter":
        if (!body.caseId || body.counterCents === undefined) return NextResponse.json({ error: "caseId and counterCents required" }, { status: 400 });
        return NextResponse.json({ settlement: counterSettlement(body.workspaceId, body.caseId, body.counterCents) });
      case "settlement_approve":
        if (!body.caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 });
        return NextResponse.json({ settlement: approveSettlement(body.workspaceId, body.caseId, gate.account.email, actor) });
      case "settlement_release":
        if (!body.caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 });
        return NextResponse.json(releaseSettlementLetter(body.workspaceId, body.caseId));
      case "settlement_list":
        return NextResponse.json({ cases: listSettlements(body.workspaceId) });
      case "freeze_outbound":
        if (actor !== "admin" && actor !== "compliance") return NextResponse.json({ error: "Compliance freezes outbound" }, { status: 403 });
        if (body.running === false) return NextResponse.json(liftOutboundFreeze(body.workspaceId));
        return NextResponse.json(await freezeOutbound(body.workspaceId));
      case "incident_home":
        return NextResponse.json(incidentHome(body.workspaceId));
      case "freeze_drill":
        if (actor !== "admin" && actor !== "compliance") return NextResponse.json({ error: "Compliance runs the freeze drill" }, { status: 403 });
        return NextResponse.json(await runFreezeDrill(body.workspaceId));
      case "counsel_packet":
        return NextResponse.json(counselPacket(body.workspaceId));
      case "tabletop_save":
        return NextResponse.json({ run: recordTabletop(body.workspaceId, body.checked ?? []) });
      case "bulk_tasks":
        if (!body.taskIds?.length) return NextResponse.json({ error: "taskIds required" }, { status: 400 });
        for (const taskId of body.taskIds.slice(0, 50)) completeTask(body.workspaceId, taskId, gate.account.email);
        return NextResponse.json({ completed: Math.min(body.taskIds.length, 50) });
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
          template: setTemplateApproval(body.templateId, { ownerApproved: body.ownerApproved, counselReviewed: body.counselReviewed }, actor, body.workspaceId),
        });
      case "template_preview":
        if (!body.templateId || !body.accountId) return NextResponse.json({ error: "templateId and accountId required" }, { status: 400 });
        return NextResponse.json(renderTemplatePreview(body.workspaceId, body.templateId, body.accountId));
      case "matrix":
        if (!body.matrix) return NextResponse.json({ error: "matrix required" }, { status: 400 });
        return NextResponse.json({ matrix: saveSettlementMatrix(body.matrix, actor, body.workspaceId) });
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
        return NextResponse.json({ rules: saveSolRules(body.solRules ?? [], actor, body.workspaceId) });
      case "compliance_scrub":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json({ account: await scrubAccount(body.workspaceId, body.accountId) });
      case "recording_save":
        return NextResponse.json({ rules: saveRecordingRules(body.recordingRules ?? [], actor, body.workspaceId) });
      case "metro2_approve":
        return NextResponse.json({ metro2: approveMetro2(actor, gate.account.email, body.workspaceId) });
      case "metro2_export":
        return NextResponse.json(exportMetro2(body.workspaceId));
      case "access_review":
        return NextResponse.json(accessReview());
      case "client_bind":
        if (actor !== "admin" || !body.email || !body.sellerName) return NextResponse.json({ error: "Admin email and seller are required" }, { status: 403 });
        return NextResponse.json({ grant: bindClient(body.email, body.sellerName, actor) });
      case "client_home":
        return NextResponse.json(clientHome(body.workspaceId, actor, gate.account.email));
      case "client_place":
        if (!body.csv) return NextResponse.json({ error: "csv required" }, { status: 400 });
        return NextResponse.json(placeForClient(body.workspaceId, actor, gate.account.email, body.csv));
      case "client_recall":
        return NextResponse.json({ returned: recallForClient(body.workspaceId, actor, gate.account.email, body.portfolioId) });
      case "complaint_file":
        return NextResponse.json({ complaint: fileComplaint(body.workspaceId, { channel: body.complaintChannel, accountRef: body.accountRef, summary: body.summary ?? body.inbound, cfpbId: body.cfpbId, rootCause: body.rootCause }) });
      case "complaint_status":
        if (!body.complaintId || !body.status) return NextResponse.json({ error: "complaintId and status required" }, { status: 400 });
        if (actor !== "admin" && actor !== "compliance") return NextResponse.json({ error: "Compliance must update complaint status" }, { status: 403 });
        return NextResponse.json({ complaint: setComplaintStatus(body.workspaceId, body.complaintId, body.status) });
      case "complaint_report":
        return NextResponse.json(complaintReport(body.workspaceId));
      case "payment_ach":
        if (!body.accountId || !body.amountCents) return NextResponse.json({ error: "accountId and amountCents required" }, { status: 400 });
        return NextResponse.json({ payment: await postAchPayment({ workspaceId: body.workspaceId, accountId: body.accountId, amountCents: body.amountCents, recurring: Boolean(body.recurring), accepted: Boolean(body.accepted) }) });
      case "account_360":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json(account360(body.workspaceId, body.accountId));
      case "promise_set":
        if (!body.accountId || !body.amountCents || !body.dueOn) return NextResponse.json({ error: "accountId, amountCents, and dueOn required" }, { status: 400 });
        return NextResponse.json({ account: setPromise(body.workspaceId, body.accountId, body.amountCents, body.dueOn) });
      case "promise_kept":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        markPromiseKept(body.workspaceId, body.accountId);
        return NextResponse.json({ ok: true });
      case "scorecard":
        return NextResponse.json(dailyScorecard(body.workspaceId));
      case "skip_trace":
        if (!body.accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });
        return NextResponse.json(await applySkipTrace(body.workspaceId, body.accountId));
      case "brand_get":
        return NextResponse.json({ brand: brandFor(body.workspaceId), publicBrand: currentBrand() });
      case "brand_save":
        return NextResponse.json({ brand: saveBrand({ name: body.brandName, logoUrl: body.logoUrl, color: body.color, domain: body.domain }, actor, body.workspaceId) });
      case "payment_reverse":
        if (!body.paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });
        if (actor !== "admin" && actor !== "compliance") return NextResponse.json({ error: "Compliance must reverse a payment" }, { status: 403 });
        return NextResponse.json({ payment: reversePayment(body.workspaceId, body.paymentId, body.reversal === "nsf" ? "nsf" : "reversed") });
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
          roles: setOperatorRole(body.email, body.role, isWorkspaceId(body.roleWorkspace) ? body.roleWorkspace : undefined),
        });
      default:
        return NextResponse.json({ error: "Unknown op" }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Collection action failed" }, { status: 400 });
  }
}
