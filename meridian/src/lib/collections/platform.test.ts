import assert from "node:assert/strict";
import test from "node:test";
import { scheduleSteps } from "./jobs";
import { modelFormPdf } from "./model-form-pdf";
import { solFor } from "./sol";
import { saveSolRules } from "../../server/collections/service";
import { enrollSequence, purgeExpiredIdentifiers, runDueJobs, saveSequence } from "../../server/collections/runner";
import { deliverAllowedChannel, deliverSms } from "../../server/collections/providers";
import { brandFor } from "../../server/brand";
import { applySmsKeyword, reconcileProviderPayment } from "../../server/collections/webhooks";
import { roleRequiresMfa } from "../../server/mfa-policy";
import { mutate } from "../../server/db";

test("sequence delays stack and the runner still blocks an unapproved template", async () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const planned = scheduleSteps(
    [
      { id: "a", channel: "email", templateId: "EML-001", delayDays: 0 },
      { id: "b", channel: "sms", templateId: "SMS-001", delayDays: 3 },
    ],
    start,
  );
  assert.equal(planned[1]?.runAt.slice(0, 10), "2026-01-04");
  const sequence = saveSequence({
    id: "seq_platform_test",
    workspaceId: "triton",
    name: "Platform test",
    enabled: true,
    steps: [{ id: "s1", channel: "sms", templateId: "SMS-001", delayDays: 0 }],
  });
  const enqueued = enrollSequence("triton", sequence.id, "acct_demo_tx", new Date("2020-01-01T00:00:00.000Z"));
  assert.equal(enqueued, 1);
  const results = await runDueJobs(new Date());
  assert.ok(results.some((row) => row.status === "blocked" || row.status === "done" || row.status === "failed"));
});

test("retention clock removes ciphertext and does not log the value", () => {
  mutate((db) => {
    db.portfolioAccounts = [
      ...(db.portfolioAccounts ?? []),
      {
        id: "acct_old_secret",
        workspaceId: "triton",
        portfolioId: "pf_old",
        accountRef: "OLD-1",
        consumerName: "Example Old",
        state: "OH",
        zip: "44101",
        last4: "9999",
        portalCode: "OLD",
        phoneType: "landline",
        phoneLast4: "0000",
        sellerName: "Sample Seller",
        balanceCents: 100,
        status: "returned",
        quarantineReason: null,
        inconvenientWork: false,
        importedAt: "2010-01-01T00:00:00.000Z",
        returnedAt: "2010-06-01T00:00:00.000Z",
        ssnCiphertext: "ciphertext-not-a-real-ssn",
      },
    ];
  });
  const count = purgeExpiredIdentifiers("triton", new Date("2026-01-01T00:00:00.000Z"));
  assert.ok(count >= 1);
  let stillThere = false;
  mutate((db) => {
    const account = (db.portfolioAccounts ?? []).find((item) => item.id === "acct_old_secret");
    stillThere = account?.ssnCiphertext === "ciphertext-not-a-real-ssn";
    const logged = (db.complianceEvents ?? []).some((event) => (event.reason ?? "").includes("ciphertext-not-a-real-ssn"));
    assert.equal(logged, false);
  });
  assert.equal(stillThere, false);
});

test("sandbox providers do not call the network and webhooks record STOP", async () => {
  let called = false;
  const result = await deliverSms({ to: "+15555550100", body: "Example notice" }, async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(result.sandbox, true);
  const stop = applySmsKeyword("triton", "+15555550199", "STOP");
  assert.equal(stop.action, "stop");
  assert.match(stop.reply ?? "", /opted out/i);
  assert.equal((stop.reply ?? "").toLowerCase().includes("account"), false);
  assert.match(stop.reply ?? "", /draft for counsel review/);
  const help = applySmsKeyword("aether", "+15555550199", "HELP");
  assert.equal(help.action, "help");
  assert.ok(help.reply?.startsWith(brandFor("aether").name));
  assert.equal((help.reply ?? "").includes("1-800-555-0199"), false);
  assert.match(help.reply ?? "", /draft for counsel review/);
  assert.equal(reconcileProviderPayment("missing"), false);
  const previous = {
    deliver: process.env.MERIDIAN_CHANNEL_DELIVER,
    sms: process.env.MERIDIAN_SMS_PROVIDER,
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM,
  };
  process.env.MERIDIAN_CHANNEL_DELIVER = "live";
  process.env.MERIDIAN_SMS_PROVIDER = "twilio";
  process.env.TWILIO_ACCOUNT_SID = "AC_example";
  process.env.TWILIO_AUTH_TOKEN = "token_example";
  process.env.TWILIO_FROM = "+15555550100";
  try {
    let url = "";
    const live = await deliverSms({ to: "+15555550199", body: "Example notice" }, async (target) => {
      url = target;
      return { ok: true, status: 201, json: async () => ({ sid: "SM_example" }), text: async () => "" };
    });
    assert.match(url, /Accounts\/AC_example\/Messages\.json$/);
    assert.equal(live.provider, "twilio");
    assert.equal(live.sandbox, false);
    await assert.rejects(
      () => deliverAllowedChannel({ channel: "sms", to: "", subject: "", body: "hi", toName: "Example" }, async () => {
        throw new Error("network");
      }),
      /destination/,
    );
  } finally {
    if (previous.deliver === undefined) delete process.env.MERIDIAN_CHANNEL_DELIVER;
    else process.env.MERIDIAN_CHANNEL_DELIVER = previous.deliver;
    if (previous.sms === undefined) delete process.env.MERIDIAN_SMS_PROVIDER;
    else process.env.MERIDIAN_SMS_PROVIDER = previous.sms;
    if (previous.sid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
    else process.env.TWILIO_ACCOUNT_SID = previous.sid;
    if (previous.token === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous.token;
    if (previous.from === undefined) delete process.env.TWILIO_FROM;
    else process.env.TWILIO_FROM = previous.from;
  }
});

test("model form pdf follows the B-1 section order", () => {
  const pdf = new TextDecoder().decode(modelFormPdf({
    agencyName: "Example Collections",
    agencyAddress: "PO Box 100",
    agencyPhone: "1-800-555-0199",
    noticeDate: "2026-03-02",
    consumerName: "Ada Example",
    consumerAddress: "OH 44101",
    accountRef: "DEMO-1",
    accountType: "credit card",
    creditorOnItemizationDate: "Example Bank",
    accountLast4: "1001",
    itemizationDate: "2024-01-15",
    amountOnItemizationDate: "80.00",
    interestSince: "0.00",
    feesSince: "0.00",
    paymentsCreditsSince: "0.00",
    currentBalance: "80.00",
    currentCreditor: "Example Creditor",
    validationEndDate: "2026-04-08",
  }));
  assert.ok(pdf.startsWith("%PDF"));
  assert.match(pdf, /debt collector/);
  assert.match(pdf, /Total amount of the debt now/);
  assert.match(pdf, /Counsel must compare it to the current CFPB form/);
  assert.equal(pdf.includes("state time-barred notice"), false);
  assert.equal(pdf.includes("900-"), false);
  const flagged = new TextDecoder().decode(modelFormPdf({
    agencyName: "Example Collections",
    agencyAddress: "PO Box 100",
    agencyPhone: "1-800-555-0199",
    noticeDate: "2026-03-02",
    consumerName: "Ada Example",
    consumerAddress: "OH 44101",
    accountRef: "DEMO-1",
    accountType: "credit card",
    creditorOnItemizationDate: "Example Bank",
    accountLast4: "1001",
    itemizationDate: "2024-01-15",
    amountOnItemizationDate: "80.00",
    interestSince: "0.00",
    feesSince: "0.00",
    paymentsCreditsSince: "0.00",
    currentBalance: "80.00",
    currentCreditor: "Example Creditor",
    validationEndDate: "2026-04-08",
    limitationsNote: "Draft: the limitations date on file is in the past. This layout does not include a state time-barred notice. Counsel must add that notice before mailing.",
  }));
  assert.match(flagged, /does not include a state/);
  assert.match(flagged, /time-barred notice/);
});

test("limitations table can be edited and still leaves unreviewed states blank", () => {
  assert.equal(roleRequiresMfa("admin"), true);
  assert.equal(roleRequiresMfa("compliance"), true);
  assert.equal(roleRequiresMfa("collector"), false);
  const rules = saveSolRules([{ code: "CA", years: null, citation: "Left blank for counsel.", needsCounselReview: true }], "admin");
  assert.equal(solFor("CA", "2020-01-01", null, rules).solExpiresOn, null);
  assert.equal(solFor("TX", "2020-01-01", null, rules).solExpiresOn, "2024-01-01");
});
