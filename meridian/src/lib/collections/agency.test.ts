import assert from "node:assert/strict";
import test from "node:test";
import { textPdf } from "./text-pdf";
import { reasonCode } from "./reason-code";
import { createDialCampaign, previewOutbound, wrapCall } from "../../server/collections/dialer";
import { markMailReturned, queueLetter } from "../../server/collections/letters";
import { deskMetrics, writeComplianceDigest } from "../../server/collections/observe";
import { scoreAndStore, trainingCleared } from "../../server/collections/training";
import { importPortfolio, startVoice } from "../../server/collections/service";
import { loadDb, mutate, nextId } from "../../server/db";
import { emitCounter } from "../../server/otel";

test("preview shows the gate and does not start a call", () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nDIAL-${stamp},Example Caller,OH,44101,4242,10.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `DIAL-${stamp}`);
  assert.ok(account);
  const before = (loadDb().voiceCalls ?? []).length;
  const preview = previewOutbound("triton", account.id);
  assert.equal((loadDb().voiceCalls ?? []).length, before);
  assert.equal(preview.mode, "sandbox");
  assert.equal(preview.liveWillDial, false);
  assert.equal(typeof preview.allowed, "boolean");
  assert.equal(preview.reason.includes("@"), false);
});

test("a campaign logs every workable account without dialing", () => {
  const stamp = Date.now().toString(36);
  importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nCAMP-${stamp},Example Campaign,OH,44101,4242,10.00\n`,
  });
  const campaign = createDialCampaign("triton", "Example campaign", 2);
  const attempts = (loadDb().dialAttempts ?? []).filter((row) => row.campaignId === campaign.id);
  assert.ok(attempts.length >= 1);
  assert.ok(attempts.every((row) => row.reasonCode.length > 0 && !row.reasonCode.includes("@")));
  assert.equal(campaign.maxConcurrent, 2);
});

test("letter pdf is a real file and returned mail pauses a letter step", () => {
  const bytes = Buffer.from(textPdf("Example letter", "This is a debt collector. Example only."));
  assert.equal(bytes.subarray(0, 5).toString(), "%PDF-");
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nMAIL-${stamp},Example Mail,OH,44101,4242,10.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `MAIL-${stamp}`);
  assert.ok(account);
  const queued = queueLetter("triton", account.id, "LTR-001");
  assert.equal(queued.pdfBase64.startsWith("JVBER"), true);
  const jobId = nextId("job");
  mutate((db) => {
    db.jobs = [...(db.jobs ?? []), {
      id: jobId,
      workspaceId: "triton",
      kind: "sequence_step",
      runAt: new Date().toISOString(),
      status: "pending",
      payload: { accountId: account.id, channel: "letter", templateId: "LTR-001" },
      createdAt: new Date().toISOString(),
    }];
  });
  const paused = markMailReturned("triton", queued.id);
  assert.ok(paused >= 1);
  const saved = (loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id);
  assert.equal(saved?.addressStatus, "returned");
  assert.equal((loadDb().jobs ?? []).find((item) => item.id === jobId)?.status, "blocked");
});

test("quiz locks a live seat until four answers are right", () => {
  const email = `collector-${Date.now().toString(36)}@example.test`;
  const failed = scoreAndStore("triton", email, [0, 0, 0, 0, 0]);
  assert.equal(failed.passedAt, null);
  assert.equal(trainingCleared(email, "triton"), false);
  const passed = scoreAndStore("triton", email, [1, 2, 1, 1, 0]);
  assert.ok(passed.passedAt);
  assert.equal(trainingCleared(email, "triton"), true);
});

test("wrap-up records a promise and a callback without storing the note in clear text", () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nWRAP-${stamp},Example Wrap,TX,75201,1111,40.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `WRAP-${stamp}`);
  assert.ok(account);
  const call = startVoice({ workspaceId: "triton", direction: "inbound", accountId: account.id });
  wrapCall({
    workspaceId: "triton",
    callId: call.id,
    disposition: "promise",
    notes: "Example promised twenty five dollars",
    operator: "desk@example.test",
    promiseCents: 2500,
    promiseDue: "2026-12-01",
    callbackAt: "2026-12-02",
  });
  const stored = (loadDb().voiceCalls ?? []).find((item) => item.id === call.id);
  assert.equal(stored?.disposition, "promise");
  assert.equal(JSON.stringify(stored).includes("Example promised"), false);
  const saved = (loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id);
  assert.equal(saved?.promise?.status, "open");
  assert.ok((loadDb().collectorTasks ?? []).some((task) => task.accountId === account.id && task.title === "Scheduled callback"));
});

test("metrics and the digest stay free of consumer identifiers", async () => {
  const metrics = deskMetrics("triton");
  const encoded = JSON.stringify(metrics);
  assert.equal(encoded.includes("@"), false);
  assert.equal(encoded.includes("900-"), false);
  let called = false;
  const digest = await writeComplianceDigest("triton", new Date(), async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(digest.delivery, "sandbox");
  assert.equal(digest.summary.includes("@"), false);
  const sent = await emitCounter("meridian.sends.blocked", 1, { workspace: "triton" }, async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(sent, false);
  assert.equal(reasonCode("Outside 8:00 a.m.–9:00 p.m. in America/Chicago."), "calling_window");
});
