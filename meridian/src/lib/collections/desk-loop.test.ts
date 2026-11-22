import assert from "node:assert/strict";
import test from "node:test";
import { counselPacket } from "../../server/collections/counsel";
import { runFreezeDrill } from "../../server/collections/incident";
import { previewSettlement } from "../../server/collections/settlement-desk";
import { importPortfolio } from "../../server/collections/service";
import { ensureOwnerSeat } from "../../server/seed-owner";
import { loadDb } from "../../server/db";

test("a short owner password does not throw and does not create a seat", () => {
  const result = ensureOwnerSeat({ MERIDIAN_OWNER_EMAIL: "portfolios@debtmarket.net", MERIDIAN_OWNER_PASSWORD: "short" });
  assert.equal(result.seated, false);
  assert.equal(result.created, false);
  assert.match(result.warning ?? "", /12 to 128/);
});

test("settlement preview stays in its workspace and names the counsel block", () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nSETL-${stamp},Example Settlement,OH,44101,4242,40.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `SETL-${stamp}`);
  assert.ok(account);
  const preview = previewSettlement("triton", account.id);
  assert.equal(preview.needsCounselReview, true);
  assert.equal(preview.dualThresholdCents, 50000);
  assert.match(preview.blockedReason ?? "", /default/i);
  assert.throws(() => previewSettlement("aether", account.id), /not found/i);
});

test("freeze drill blocks four channels and restores the workspace", async () => {
  let called = false;
  const before = (loadDb().frozenWorkspaces ?? []).includes("aether");
  const tritonFrozen = (loadDb().frozenWorkspaces ?? []).includes("triton");
  const drill = await runFreezeDrill("aether", async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(drill.passed, true);
  assert.equal(drill.crossed, tritonFrozen);
  assert.equal(drill.checks.map((row) => row.channel).join(","), "voice_outbound,sms,email,letter");
  assert.equal((loadDb().frozenWorkspaces ?? []).includes("aether"), before);
  const packet = counselPacket("triton");
  assert.ok(packet.templatesNeedingCounsel > 0);
  assert.match(packet.notice, /Not legal advice/);
});
