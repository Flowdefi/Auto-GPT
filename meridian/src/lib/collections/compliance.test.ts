import assert from "node:assert/strict";
import test from "node:test";
import { STATE_ELIGIBILITY_SEED, assertSeedCoverage, policyEligible, stateIsEligible } from "./eligibility";
import { evaluateGate } from "./gate";
import { classifyInbound } from "./inbox";
import { maskSsn, parsePortfolioCsv, publicAccount } from "./portfolio";
import { limitationsDatePassed, solFor, timeBarredSolicitation } from "./sol";
import { withinCallingWindow } from "./time";
import type { PortfolioAccount, VoiceSettings } from "./types";
import { totp, verifyTotp } from "../../server/totp";
import { queueLetter } from "../../server/collections/letters";
import { postAchPayment } from "../../server/collections/payments";
import { encryptSecret } from "../../server/auth-crypto";
import { importPortfolio, recordConsent, sandboxPayment, sendChannel, setTemplateApproval, setupPaymentPlan, syncCollectionTemplates, templateForWorkspace } from "../../server/collections/service";
import { applyEmailEvent } from "../../server/collections/webhooks";
import { masterSecret } from "../../server/secrets";
import { loadDb, mutate } from "../../server/db";
import { emptyTranscript, redactSensitive, stepCall } from "./voice";

const settings: VoiceSettings = {
  killSwitch: false,
  blockInbound: false,
  dailyOutboundCap: 10,
  maxDiscountPercent: 20,
  maxPlanMonths: 12,
  rndSandboxClear: false,
};

function account(partial: Partial<PortfolioAccount>): PortfolioAccount {
  return {
    id: "acct_test",
    workspaceId: "triton",
    portfolioId: "pf_test",
    accountRef: "DEMO-1",
    consumerName: "Example Consumer",
    state: "TX",
    zip: "75201",
    last4: "4242",
    portalCode: "DEMO42",
    phoneType: "cell",
    phoneLast4: "0100",
    sellerName: "Sample Seller",
    balanceCents: 120000,
    status: "workable",
    quarantineReason: null,
    inconvenientWork: false,
    importedAt: "2026-11-05T12:00:00.000Z",
    returnedAt: null,
    ...partial,
  };
}

function gate(partial: Partial<Parameters<typeof evaluateGate>[0]>) {
  return evaluateGate({
    now: new Date("2026-11-05T18:00:00.000Z"),
    settings,
    eligibility: STATE_ELIGIBILITY_SEED,
    account: account({}),
    consents: [{ id: "c", workspaceId: "triton", accountId: "acct_test", channel: "voice_cell", source: "written", at: "2026-11-01T00:00:00.000Z" }],
    dnc: [],
    outboundCallsIn7Days: 0,
    lastConversationAt: null,
    reassigned: "ok",
    channel: "voice_outbound",
    campaignSentToday: 0,
    ...partial,
  });
}

test("seed covers every state and the owner policy", () => {
  assertSeedCoverage();
  assert.equal(policyEligible(STATE_ELIGIBILITY_SEED.find((row) => row.code === "TX")!), true);
  assert.equal(stateIsEligible(STATE_ELIGIBILITY_SEED, "CA"), false);
  assert.equal(stateIsEligible(STATE_ELIGIBILITY_SEED, "GA"), true);
  assert.equal(stateIsEligible(STATE_ELIGIBILITY_SEED, "KS"), false);
  assert.equal(stateIsEligible(STATE_ELIGIBILITY_SEED, "OH"), true);
});

test("ineligible state blocks outreach and the payment portal", () => {
  const blocked = gate({ account: account({ state: "CA", status: "quarantined" }), channel: "payment_portal" });
  assert.equal(blocked.allowed, false);
  const voice = gate({ account: account({ state: "NY" }), channel: "voice_outbound" });
  assert.equal(voice.allowed, false);
});

test("texas cell with consent and a clear scrub can be dialed at midday", () => {
  const decision = gate({});
  assert.equal(decision.allowed, true);
});

test("cell without consent, DNC, cap, kill switch, and 7-in-7 block", () => {
  assert.equal(gate({ consents: [] }).allowed, false);
  assert.equal(gate({ dnc: [{ id: "d", workspaceId: "triton", accountId: "acct_test", phoneLast4: "0100", reason: "request", at: "2026-11-05T00:00:00.000Z" }] }).allowed, false);
  assert.equal(gate({ settings: { ...settings, killSwitch: true } }).allowed, false);
  assert.equal(gate({ outboundCallsIn7Days: 7 }).allowed, false);
  assert.equal(gate({ campaignSentToday: 10 }).allowed, false);
  assert.equal(gate({ reassigned: "unknown" }).allowed, false);
});

test("sms uses the local window and does not guess a ZIP", () => {
  const smsConsent = [{ id: "s", workspaceId: "triton" as const, accountId: "acct_test", channel: "sms" as const, source: "written", at: "2026-11-01T00:00:00.000Z" }];
  const night = gate({ channel: "sms", consents: smsConsent, now: new Date("2026-11-05T04:00:00.000Z") });
  assert.equal(night.allowed, false);
  assert.match(night.reason, /8:00 a.m/);
  const day = gate({ channel: "sms", consents: smsConsent, now: new Date("2026-11-05T18:00:00.000Z") });
  assert.equal(day.allowed, true);
  const unknown = gate({ channel: "sms", consents: smsConsent, account: account({ state: "TX", zip: "" }) });
  assert.equal(unknown.allowed, false);
  assert.match(unknown.reason, /ZIP/);
  const emailConsent = [{ id: "e", workspaceId: "triton" as const, accountId: "acct_test", channel: "email" as const, source: "written", at: "2026-11-01T00:00:00.000Z" }];
  const nightEmail = gate({ channel: "email", consents: emailConsent, now: new Date("2026-11-05T04:00:00.000Z") });
  assert.equal(nightEmail.allowed, true);
});

test("calling window uses the consumer zone", () => {
  assert.equal(withinCallingWindow(new Date("2026-11-05T14:00:00.000Z"), "America/Chicago"), true);
  assert.equal(withinCallingWindow(new Date("2026-11-05T13:30:00.000Z"), "America/Chicago"), false);
  const early = gate({ now: new Date("2026-11-05T12:30:00.000Z") });
  assert.equal(early.allowed, false);
});

test("portfolio import quarantines ineligible states and masks SSNs", () => {
  const csv = [
    "account_ref,consumer_name,consumer_state,zip,last4,portal_code,phone_type,seller,balance",
    "A-1,Example Consumer,Texas,75201,4242,DEMO42,cell,Sample Seller,100.00",
    "A-2,Other Person,California,90001,1111,PORT11,cell,Sample Seller,50",
    "A-1,Dup,Georgia,30301,2222,PORT22,landline,Sample Seller,10",
  ].join("\n");
  const result = parsePortfolioCsv({
    csv,
    workspaceId: "triton",
    portfolioId: "pf",
    eligibility: STATE_ELIGIBILITY_SEED,
    existingRefs: new Set(),
    now: "2026-11-05T00:00:00.000Z",
    id: () => "acct",
  });
  assert.equal(result.workable, 1);
  assert.equal(result.quarantined, 1);
  assert.equal(result.skipped.length, 1);
  const secret = parsePortfolioCsv({
    csv: "account_ref,consumer_name,ssn,consumer_state\nA,Example,900-00-0001,TX\n",
    workspaceId: "triton",
    portfolioId: "pf",
    eligibility: STATE_ELIGIBILITY_SEED,
    existingRefs: new Set(),
    now: "2026-11-05T00:00:00.000Z",
    id: () => "acct",
  });
  assert.equal(secret.accounts[0]?.sensitive?.ssn, "900-00-0001");
  assert.equal(secret.accounts[0]?.ssnMasked, maskSsn("900-00-0001"));
  assert.equal(JSON.stringify(publicAccount(secret.accounts[0]!)).includes("900-00-0001"), false);
  const fixed = parsePortfolioCsv({
    fixedWidth: "B-1Example   TX",
    widths: [
      { field: "account_ref", start: 1, length: 3 },
      { field: "consumer_name", start: 4, length: 10 },
      { field: "consumer_state", start: 14, length: 2 },
    ],
    workspaceId: "triton",
    portfolioId: "pf",
    eligibility: STATE_ELIGIBILITY_SEED,
    existingRefs: new Set(),
    now: "2026-11-05T00:00:00.000Z",
    id: () => "acct2",
  });
  assert.equal(fixed.accounts[0]?.state, "TX");
  assert.equal(solFor("TX", "2023-11-01", null).solExpiresOn, "2027-11-01");
  assert.equal(solFor("CA", "2023-11-01", null).solExpiresOn, null);
  assert.equal(classifyInbound("please stop calling"), "cease");
});

test("voice flow withholds the debt until two identifiers match and will not store a card", () => {
  const transcript = emptyTranscript("Triton", false, "2026-11-05T18:00:00.000Z");
  const early = stepCall({
    transcript,
    turn: { type: "say", text: "What is my balance?" },
    account: account({}),
    settings,
    at: "2026-11-05T18:01:00.000Z",
    paymentUrl: "https://example.test/pay",
    agency: "Triton",
  });
  assert.equal(early.transcript.debtDisclosed, false);
  const verified = stepCall({
    transcript,
    turn: { type: "verify", name: "Example Consumer", checks: [{ kind: "last4", value: "4242" }, { kind: "zip", value: "75201" }] },
    account: account({}),
    settings,
    at: "2026-11-05T18:02:00.000Z",
    paymentUrl: "https://example.test/pay",
    agency: "Triton",
  });
  assert.equal(verified.transcript.debtDisclosed, true);
  assert.match(verified.say, /attempt to collect a debt/i);
  const pay = stepCall({
    transcript: verified.transcript,
    turn: { type: "say", text: "My card is 4242424242424242" },
    account: account({}),
    settings,
    at: "2026-11-05T18:03:00.000Z",
    paymentUrl: "https://example.test/pay",
    agency: "Triton",
  });
  assert.equal(pay.paymentUrl, "https://example.test/pay");
  const transfer = stepCall({
    transcript: verified.transcript,
    turn: { type: "transfer" },
    account: account({}),
    settings,
    at: "2026-11-05T18:04:00.000Z",
    paymentUrl: "https://example.test/pay",
    agency: "Triton",
  });
  assert.equal(transfer.transferred, true);
  assert.equal(transfer.disposition, "warm_transfer");
  assert.equal(JSON.stringify(pay.transcript).includes("4242424242424242"), false);
  assert.equal(redactSensitive("4242424242424242").hadCard, true);
  const barred = stepCall({
    transcript: verified.transcript,
    turn: { type: "say", text: "I want to pay" },
    account: account({ solExpiresOn: "2020-01-01" }),
    settings,
    at: "2026-11-05T18:05:00.000Z",
    paymentUrl: "https://example.test/pay",
    agency: "Triton",
  });
  assert.equal(barred.disposition, "time_barred_hold");
  assert.equal(barred.paymentUrl, null);
  assert.equal(barred.plan, null);
  assert.match(barred.say, /counsel-reviewed time-barred notice/);
  assert.equal(barred.qaFlags.some((flag) => flag.code === "time_barred"), true);
  const open = stepCall({
    transcript: verified.transcript,
    turn: { type: "say", text: "I want a plan" },
    account: account({ solExpiresOn: "2027-01-01" }),
    settings,
    at: "2026-11-05T18:05:00.000Z",
    paymentUrl: "https://example.test/pay",
    agency: "Triton",
  });
  assert.equal(open.disposition, "plan_offered");
  const code = totp("JBSWY3DPEHPK3PXP", 1_700_000_000_000);
  assert.equal(verifyTotp("JBSWY3DPEHPK3PXP", code, 1_700_000_000_000), true);
});

test("an email unsubscribe suppresses that workspace and leaves the other alone", async () => {
  const stamp = Date.now().toString(36);
  const email = `ada.${stamp}@example.test`;
  const csv = (ref: string) => `account_ref,consumer_name,consumer_state,zip,last4,balance\n${ref},Ada Example,OH,44101,4242,40.00\n`;
  const triton = importPortfolio({ workspaceId: "triton", csv: csv(`UNSUB-${stamp}`) });
  const aether = importPortfolio({ workspaceId: "aether", csv: csv(`UNSUB-A-${stamp}`) });
  const tritonAccount = triton.accounts.find((item) => item.accountRef === `UNSUB-${stamp}`);
  const aetherAccount = aether.accounts.find((item) => item.accountRef === `UNSUB-A-${stamp}`);
  assert.ok(tritonAccount && aetherAccount);
  const cipher = encryptSecret(email, masterSecret());
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) =>
      item.id === tritonAccount.id || item.id === aetherAccount.id ? { ...item, emailCiphertext: cipher } : item,
    );
  });
  recordConsent("triton", tritonAccount.id, "email", "sandbox test");
  recordConsent("aether", aetherAccount.id, "email", "sandbox test");
  applyEmailEvent("triton", email, "unsubscribe");
  const blocked = await sendChannel({ workspaceId: "triton", accountId: tritonAccount.id, channel: "email", body: "Hello from the desk" });
  assert.equal(blocked.status, "blocked");
  assert.match(blocked.reason ?? "", /suppressed/);
  assert.equal((blocked.reason ?? "").includes(email), false);
  const open = await sendChannel({ workspaceId: "aether", accountId: aetherAccount.id, channel: "email", body: "Hello from the desk" });
  assert.equal((open.reason ?? "").includes("suppressed"), false);
});

test("an ad-hoc email gets a draft mini-Miranda and voicemail does not", async () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nDISC-${stamp},Example Buyer,OH,44101,4242,40.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `DISC-${stamp}`);
  assert.ok(account);
  const email = await sendChannel({ workspaceId: "triton", accountId: account.id, channel: "email", body: "Hello from the desk" });
  assert.match(email.bodyPreview ?? "", /debt collector/);
  assert.match(email.bodyPreview ?? "", /draft for counsel review/);
  assert.match(email.bodyPreview ?? "", /Hello from the desk/);
  const drop = await sendChannel({
    workspaceId: "triton",
    accountId: account.id,
    channel: "voicemail_drop",
    body: "Hi, this is Ada calling from Example. Please contact me at 1-800-555-0199.",
  });
  assert.equal((drop.bodyPreview ?? "").includes("debt collector"), false);
});

test("sms and email payment asks stay held when the limitations date is past", async () => {
  assert.equal(timeBarredSolicitation("SMS-006", "offer"), true);
  assert.equal(timeBarredSolicitation("EML-005", "offer"), true);
  assert.equal(timeBarredSolicitation("LTR-010", "offer"), true);
  assert.equal(timeBarredSolicitation("LTR-060", "Please pay"), false);
  assert.equal(timeBarredSolicitation("LTR-061", "Please pay"), false);
  assert.equal(timeBarredSolicitation(undefined, "Please pay the balance"), true);
  assert.equal(timeBarredSolicitation(undefined, "Hello"), false);
  assert.equal(limitationsDatePassed(null, "2026-11-05"), false);
  const stamp = Date.now().toString(36);
  const row = (ref: string, chargeOff: string) =>
    `account_ref,consumer_name,consumer_state,zip,last4,balance,charge_off_date\n${ref},Example Buyer,TX,78701,4242,40.00,${chargeOff}\n`;
  const past = importPortfolio({ workspaceId: "triton", csv: row(`PAST-${stamp}`, "2020-01-01") });
  const future = importPortfolio({ workspaceId: "triton", csv: row(`FUTR-${stamp}`, "2025-06-01") });
  const pastAccount = past.accounts.find((item) => item.accountRef === `PAST-${stamp}`);
  const futureAccount = future.accounts.find((item) => item.accountRef === `FUTR-${stamp}`);
  assert.ok(pastAccount?.solExpiresOn && pastAccount.solExpiresOn < "2026-11-05");
  assert.ok(futureAccount?.solExpiresOn && futureAccount.solExpiresOn >= "2026-11-05");
  const sms = await sendChannel({ workspaceId: "triton", accountId: pastAccount.id, channel: "sms", body: "Please pay the balance" });
  const email = await sendChannel({ workspaceId: "triton", accountId: pastAccount.id, channel: "email", body: "A settlement is available" });
  assert.equal(sms.status, "blocked");
  assert.match(sms.reason ?? "", /counsel-reviewed time-barred notice/);
  assert.equal(email.status, "blocked");
  assert.match(email.reason ?? "", /counsel-reviewed time-barred notice/);
  const later = await sendChannel({ workspaceId: "triton", accountId: futureAccount.id, channel: "sms", body: "Please pay the balance" });
  assert.equal((later.reason ?? "").includes("time-barred notice"), false);
  const templates = syncCollectionTemplates();
  const offerTemplate = templates.find((item) => item.id === "LTR-010");
  const noticeTemplate = templates.find((item) => item.id === "LTR-060");
  assert.ok(offerTemplate && noticeTemplate);
  const beforeOffer = templateForWorkspace("triton", offerTemplate);
  const beforeNotice = templateForWorkspace("triton", noticeTemplate);
  const priorOffer = loadDb().templateApprovals?.triton?.["LTR-010"];
  const priorNotice = loadDb().templateApprovals?.triton?.["LTR-060"];
  setTemplateApproval("LTR-010", { ownerApproved: true }, "admin", "triton");
  setTemplateApproval("LTR-060", { ownerApproved: true }, "admin", "triton");
  try {
    const offer = await sendChannel({ workspaceId: "triton", accountId: pastAccount.id, channel: "letter", body: "", templateId: "LTR-010" });
    const notice = await sendChannel({ workspaceId: "triton", accountId: pastAccount.id, channel: "letter", body: "Please pay", templateId: "LTR-060" });
    assert.match(offer.reason ?? "", /counsel-reviewed time-barred notice/);
    assert.equal((notice.reason ?? "").includes("time-barred notice"), false);
    const queuedOffer = queueLetter("triton", pastAccount.id, "LTR-010");
    const queuedNotice = queueLetter("triton", pastAccount.id, "LTR-060");
    assert.equal(queuedOffer.status, "paused");
    assert.match(queuedOffer.reason ?? "", /counsel-reviewed time-barred notice/);
    assert.equal((queuedNotice.reason ?? "").includes("time-barred"), false);
  } finally {
    setTemplateApproval("LTR-010", { ownerApproved: beforeOffer.ownerApproved, counselReviewed: beforeOffer.counselReviewed }, "admin", "triton");
    setTemplateApproval("LTR-060", { ownerApproved: beforeNotice.ownerApproved, counselReviewed: beforeNotice.counselReviewed }, "admin", "triton");
    if (!priorOffer || !priorNotice) {
      mutate((db) => {
        const bucket = db.templateApprovals?.triton;
        if (!bucket) return;
        if (!priorOffer) delete bucket["LTR-010"];
        if (!priorNotice) delete bucket["LTR-060"];
      });
    }
  }
});

test("sandbox payment plan stays inside the balance and the month cap", () => {
  const stamp = Date.now().toString(36);
  const ohioRef = `PLAN-${stamp}`;
  const californiaRef = `CA-PLAN-${stamp}`;
  const imported = importPortfolio({
    workspaceId: "triton",
    portfolioId: "pf_plan",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,portal_code,phone_type,seller,balance\n${ohioRef},Example Planner,OH,44101,1111,PL11,landline,Sample Seller,100.00\n${californiaRef},Example Planner,CA,90001,2222,CA22,cell,Sample Seller,40\n`,
  });
  const ohio = imported.accounts.find((item) => item.accountRef === ohioRef);
  const california = imported.accounts.find((item) => item.accountRef === californiaRef);
  assert.ok(ohio);
  assert.equal(ohio.status, "workable");
  assert.equal(california?.status, "quarantined");
  const plan = setupPaymentPlan("triton", ohio.id, 4, 2000);
  assert.equal(plan.paymentPlan?.months, 4);
  assert.equal(plan.paymentPlan?.installmentCents, 2000);
  assert.throws(() => setupPaymentPlan("triton", ohio.id, 40, 2000), /1 to/);
  assert.throws(() => setupPaymentPlan("triton", ohio.id, 4, 5000), /cannot exceed/);
  if (california) assert.throws(() => setupPaymentPlan("triton", california.id, 2, 1000), /not eligible/);
});

test("the portal does not take a plan or a payment after the limitations date", async () => {
  const stamp = Date.now().toString(36);
  const ref = `HOLD-${stamp}`;
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\n${ref},Example Planner,OH,44101,1111,40.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === ref);
  assert.ok(account);
  const prior = account.solExpiresOn ?? null;
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === account.id ? { ...item, solExpiresOn: "2020-01-01" } : item));
  });
  try {
    assert.throws(() => setupPaymentPlan("triton", account.id, 2, 1000), /counsel-reviewed time-barred notice/);
    await assert.rejects(sandboxPayment("triton", account.id, 1000), /counsel-reviewed time-barred notice/);
    await assert.rejects(
      postAchPayment({ workspaceId: "triton", accountId: account.id, amountCents: 1000, recurring: false, accepted: true }),
      /counsel-reviewed time-barred notice/,
    );
  } finally {
    mutate((db) => {
      db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => (item.id === account.id ? { ...item, solExpiresOn: prior } : item));
    });
  }
});
