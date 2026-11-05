import assert from "node:assert/strict";
import test from "node:test";
import { STATE_ELIGIBILITY_SEED } from "./eligibility";
import { evaluateGate } from "./gate";
import { composeConsumerDraft } from "./drafting";
import { jobIntervalSeconds } from "./jobs";
import { buildMetro2, METRO2_BASE_LENGTH } from "./metro2";
import { defaultRecordingTable, requiresAllPartyRecording } from "./recording";
import type { PortfolioAccount, VoiceSettings } from "./types";
import { completeFast } from "../../server/ai/complete";
import { exportMetro2 } from "../../server/collections/service";
import { checkReassignedNumber, checkScraStatus } from "../../server/collections/scrub";

const settings: VoiceSettings = {
  killSwitch: false,
  blockInbound: false,
  dailyOutboundCap: 10,
  maxDiscountPercent: 20,
  maxPlanMonths: 12,
  rndSandboxClear: false,
};

function account(partial: Partial<PortfolioAccount> = {}): PortfolioAccount {
  return {
    id: "acct_test",
    workspaceId: "triton",
    portfolioId: "pf_test",
    accountRef: "DEMO-1",
    consumerName: "Example Consumer",
    state: "OH",
    zip: "44101",
    last4: "4242",
    portalCode: "DEMO42",
    phoneType: "landline",
    phoneLast4: "0100",
    sellerName: "Sample Seller",
    balanceCents: 8000,
    status: "workable",
    quarantineReason: null,
    inconvenientWork: false,
    importedAt: "2026-11-05T12:00:00.000Z",
    returnedAt: null,
    ...partial,
  };
}

test("rules guard replaces a model that misses a dispute or threatens the consumer", () => {
  const fallback = composeConsumerDraft({ inbound: "I dispute this debt", firstName: "Ada", agency: "Example Collections" });
  assert.equal(fallback.source, "rules");
  assert.equal(fallback.classification, "dispute");
  const overruled = composeConsumerDraft({
    inbound: "I dispute this debt",
    firstName: "Ada",
    agency: "Example Collections",
    modelText: JSON.stringify({ classification: "other", draft: "We will keep calling." }),
    model: "llama3.2:3b",
  });
  assert.equal(overruled.source, "rules");
  assert.equal(overruled.classification, "dispute");
  const threat = composeConsumerDraft({
    inbound: "hello",
    firstName: "Ada",
    agency: "Example Collections",
    modelText: JSON.stringify({ classification: "other", draft: "Pay now or we will send the police." }),
  });
  assert.equal(threat.source, "rules");
  assert.match(threat.guardNote, /threat/i);
  const kept = composeConsumerDraft({
    inbound: "hello",
    firstName: "Ada",
    agency: "Example Collections",
    modelText: JSON.stringify({ classification: "other", draft: "Ada, a collector will review this." }),
    model: "qwen2.5:7b",
  });
  assert.equal(kept.source, "model");
  assert.match(kept.draft, /debt collector/i);
  assert.equal(kept.draft.includes("pending") || kept.source === "model", true);
});

test("the model router does not call the network until a base URL is set", async () => {
  const previous = process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OLLAMA_BASE_URL;
  let called = false;
  const quiet = await completeFast([{ role: "user", content: "hello" }], async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(quiet, null);
  process.env.OPENAI_BASE_URL = "https://models.example.test/v1";
  process.env.MERIDIAN_FAST_MODEL = "llama3.2:3b";
  try {
    let url = "";
    const live = await completeFast([{ role: "user", content: "Classify this" }], async (target) => {
      url = target;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "{\"classification\":\"other\",\"draft\":\"Noted.\"}" } }] }), text: async () => "" };
    });
    assert.match(url, /chat\/completions$/);
    assert.equal(live?.model, "llama3.2:3b");
  } finally {
    if (previous === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = previous;
  }
});

test("sandbox scrubs do not call the network and unknown is not a clearance", async () => {
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({ result: "ok" }), text: async () => "" };
  };
  const rnd = await checkReassignedNumber({ phoneLast4: "0100" }, fetchImpl);
  const scra = await checkScraStatus({ lastName: "Example", activeDutyDate: "2026-11-05" }, fetchImpl);
  assert.equal(called, false);
  assert.equal(rnd.result, "unknown");
  assert.equal(scra.result, "unknown");
  await assert.rejects(() => checkScraStatus({ lastName: "Example", activeDutyDate: "2026-11-05", ssn: "900-00-0001" }), /Social Security/);
  const previous = {
    deliver: process.env.MERIDIAN_CHANNEL_DELIVER,
    provider: process.env.MERIDIAN_RND_PROVIDER,
    url: process.env.MERIDIAN_RND_API_URL,
  };
  process.env.MERIDIAN_CHANNEL_DELIVER = "live";
  process.env.MERIDIAN_RND_PROVIDER = "fcc";
  process.env.MERIDIAN_RND_API_URL = "https://rnd.example.test/query";
  try {
    const found = await checkReassignedNumber({ phoneLast4: "0100" }, async () => ({
      ok: true,
      status: 200,
      json: async () => ({ result: "reassigned" }),
      text: async () => "",
    }));
    assert.equal(found.result, "reassigned");
    assert.equal(found.sandbox, false);
  } finally {
    if (previous.deliver === undefined) delete process.env.MERIDIAN_CHANNEL_DELIVER;
    else process.env.MERIDIAN_CHANNEL_DELIVER = previous.deliver;
    if (previous.provider === undefined) delete process.env.MERIDIAN_RND_PROVIDER;
    else process.env.MERIDIAN_RND_PROVIDER = previous.provider;
    if (previous.url === undefined) delete process.env.MERIDIAN_RND_API_URL;
    else process.env.MERIDIAN_RND_API_URL = previous.url;
  }
});

test("active duty blocks outreach and unknown blocks only when the DMDC adapter is selected", () => {
  const base = {
    now: new Date("2026-11-05T18:00:00.000Z"),
    settings,
    eligibility: STATE_ELIGIBILITY_SEED,
    account: account(),
    consents: [],
    dnc: [],
    outboundCallsIn7Days: 0,
    lastConversationAt: null,
    reassigned: "ok" as const,
    channel: "email" as const,
    campaignSentToday: 0,
  };
  assert.equal(evaluateGate({ ...base, scra: "active" }).allowed, false);
  assert.equal(evaluateGate({ ...base, scra: "inactive", consents: [{ id: "c", workspaceId: "triton", accountId: "acct_test", channel: "email", source: "written", at: "2026-11-01T00:00:00.000Z" }] }).allowed, true);
  process.env.MERIDIAN_SCRA_BLOCK_UNKNOWN = "true";
  try {
    assert.equal(evaluateGate({ ...base, scra: "unknown" }).allowed, false);
  } finally {
    delete process.env.MERIDIAN_SCRA_BLOCK_UNKNOWN;
  }
});

test("recording consent follows the table and uncertain states ask first", () => {
  const table = defaultRecordingTable();
  assert.equal(table.length, 51);
  assert.equal(requiresAllPartyRecording("CA", table), true);
  assert.equal(requiresAllPartyRecording("TX", table), false);
  assert.equal(table.every((rule) => rule.needsCounselReview), true);
  const edited = table.map((rule) => (rule.code === "TX" ? { ...rule, party: "uncertain" as const } : rule));
  assert.equal(requiresAllPartyRecording("TX", edited), true);
});

test("Metro 2 stays disabled and will not furnish before consumer contact", () => {
  assert.throws(() => exportMetro2("triton"), /disabled/);
  const previous = process.env.MERIDIAN_METRO2_EXPORT;
  process.env.MERIDIAN_METRO2_EXPORT = "enabled";
  try {
    assert.throws(() => exportMetro2("triton"), /both approve/);
  } finally {
    if (previous === undefined) delete process.env.MERIDIAN_METRO2_EXPORT;
    else process.env.MERIDIAN_METRO2_EXPORT = previous;
  }
  const built = buildMetro2([
    account({ validationMailedAt: null }),
    account({ accountRef: "DEMO-2", validationMailedAt: "2026-03-02T00:00:00.000Z", state: "OH", zip: "44101" }),
  ]);
  assert.equal(built.included, 1);
  assert.match(built.excluded[0]?.reason ?? "", /1006\.30/);
  const line = built.file.split("\n")[0] ?? "";
  assert.equal(line.length, METRO2_BASE_LENGTH);
  assert.equal(line.slice(413, 415), "OH");
  assert.equal(line.includes("900"), false);
  assert.match(built.citation, /1006\.30/);
});

test("the job worker interval stays at least a minute unless configured above the floor", () => {
  assert.equal(jobIntervalSeconds(undefined), 60);
  assert.equal(jobIntervalSeconds("5"), 60);
  assert.equal(jobIntervalSeconds("120"), 120);
});
