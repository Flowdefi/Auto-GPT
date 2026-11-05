import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { mergeBrand } from "../brand";
import { solFor } from "./sol";
import { setPromise, sweepBrokenPromises } from "../../server/collections/floor";
import { applySkipTrace, lookupSkipTrace } from "../../server/collections/skip-trace";
import { dialVoice, hangupActiveCalls, verifyTwilioSignature } from "../../server/collections/voice-live";
import { importPortfolio, startVoice } from "../../server/collections/service";
import { loadDb } from "../../server/db";

test("no-license states have cited limitation periods and other states stay blank", () => {
  assert.equal(solFor("TX", "2020-01-01", null).solExpiresOn, "2024-01-01");
  assert.equal(solFor("OH", "2020-01-01", null).solExpiresOn, "2026-01-01");
  assert.match(solFor("OH", "2020-01-01", null).solCitation, /2305\.06/);
  assert.equal(solFor("VA", "2020-01-01", null).solExpiresOn, "2025-01-01");
  assert.equal(solFor("MT", "2020-01-01", null).solExpiresOn, "2026-01-01");
  assert.equal(solFor("NH", "2020-01-01", null).solExpiresOn, "2023-01-01");
  assert.equal(solFor("SC", "2020-01-01", null).solExpiresOn, "2023-01-01");
  assert.equal(solFor("CA", "2020-01-01", null).solExpiresOn, null);
  assert.equal(solFor("OH", "2020-01-01", null).solNeedsCounselReview, true);
});

test("live voice stays sandbox unless the flag and live delivery are both set", async () => {
  let called = false;
  const quiet = await dialVoice({ to: "+15555550100", callId: "call_test" }, async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(quiet.sandbox, true);
  assert.equal(quiet.realtime.connectUrl, null);
  const url = "https://example.test/api/webhooks/voice";
  const params = { CallSid: "CA123", CallStatus: "completed" };
  const token = "token_example";
  const payload = Object.keys(params).sort().reduce((sum, key) => sum + key + params[key as keyof typeof params], url);
  const signature = createHmac("sha1", token).update(payload).digest("base64");
  const previous = process.env.TWILIO_AUTH_TOKEN;
  process.env.TWILIO_AUTH_TOKEN = token;
  try {
    assert.equal(verifyTwilioSignature(url, params, signature), true);
    assert.equal(verifyTwilioSignature(url, params, "nope"), false);
  } finally {
    if (previous === undefined) delete process.env.TWILIO_AUTH_TOKEN;
    else process.env.TWILIO_AUTH_TOKEN = previous;
  }
});

test("kill switch ends active sandbox calls without dialing", async () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nVOICE-${stamp},Example Caller,OH,44101,5555,10.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `VOICE-${stamp}`);
  assert.ok(account);
  const call = startVoice({ workspaceId: "triton", direction: "inbound", accountId: account.id });
  assert.notEqual(call.phase, "ended");
  let called = false;
  const hung = await hangupActiveCalls(async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.ok(hung >= 1);
  const stored = (loadDb().voiceCalls ?? []).find((item) => item.id === call.id);
  assert.equal(stored?.phase, "ended");
  assert.equal(stored?.disposition, "kill_switch");
});

test("skip-trace sandbox does not invent a number and a broken promise opens a task", async () => {
  let called = false;
  const lookup = await lookupSkipTrace({ lastName: "Example", state: "OH", zip: "44101" }, async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({ phone: "5555550100" }), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(lookup.phone, null);
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nPROM-${stamp},Example Promisor,OH,44101,6666,10.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `PROM-${stamp}`);
  assert.ok(account);
  const traced = await applySkipTrace("triton", account.id);
  assert.equal(traced.updated, false);
  setPromise("triton", account.id, 2500, "2020-01-01");
  const broken = sweepBrokenPromises(new Date("2026-11-05T12:00:00.000Z"));
  assert.ok(broken >= 1);
  const saved = (loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id);
  assert.equal(saved?.promise?.status, "broken");
  assert.ok((loadDb().collectorTasks ?? []).some((task) => task.accountId === account.id && task.title === "Broken promise to pay"));
});

test("brand settings cannot smuggle a script URL", () => {
  const brand = mergeBrand({ name: "Example Collections", logoUrl: "javascript:alert(1)", color: "#112233", domain: "example.test" });
  assert.equal(brand.logoUrl, "");
  assert.equal(brand.color, "#112233");
  assert.equal(brand.name, "Example Collections");
});
