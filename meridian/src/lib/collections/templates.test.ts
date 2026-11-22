import assert from "node:assert/strict";
import test from "node:test";
import { filterVoiceUtterance, guardrailsFromJson } from "./guardrails";
import { readFileSync } from "fs";
import path from "path";
import { missingInterpolations, renderMustache } from "./mustache";
import {
  forbiddenFieldHits,
  loadSettlementMatrix,
  loadTemplateFiles,
  sampleMergeData,
  sendRuleBlocks,
  settlementOffer,
  clearMatrixDefaults,
} from "./template-library";
import { validationEndDate } from "./validation-period";
import type { PortfolioAccount } from "./types";

const templates = loadTemplateFiles();

function account(partial: Partial<PortfolioAccount> = {}): PortfolioAccount {
  return {
    id: "acct_test",
    workspaceId: "triton",
    portfolioId: "pf_demo",
    accountRef: "DEMO-OH-1001",
    consumerName: "Ada Example",
    state: "OH",
    zip: "44101",
    last4: "1001",
    portalCode: "1001",
    phoneType: "landline",
    phoneLast4: "0199",
    sellerName: "Example Creditor",
    balanceCents: 80000,
    status: "workable",
    quarantineReason: null,
    inconvenientWork: false,
    importedAt: "2026-03-02T00:00:00.000Z",
    returnedAt: null,
    originalCreditor: "Example Bank",
    chargeOffDate: "2024-01-15",
    itemizationDate: "2024-01-15",
    itemizationAmountCents: 80000,
    validationMailedAt: "2026-03-02T00:00:00.000Z",
    ...partial,
  };
}

test("validation end date follows 1006.34(b)(5)", () => {
  assert.equal(validationEndDate("2026-03-02"), "2026-04-08");
});

test("every template renders with fake seed data and has no forbidden fields", () => {
  assert.ok(templates.length >= 48);
  const fields = new Set<string>();
  for (const template of templates) fields.add(template.id);
  const data = sampleMergeData(templates.flatMap((template) => [...template.mergeFields, ...tokens(template.body), ...tokens(template.subject)]));
  for (const template of templates) {
    const rendered = renderMustache(`${template.subject}\n${template.body}`, data);
    assert.equal(rendered.includes("{{"), false, `${template.id} left a merge tag`);
    assert.equal(forbiddenFieldHits(template).join(","), "", template.id);
    assert.equal(template.needsCounselReview, true, template.id);
  }
});

test("empty required merge field blocks the send", () => {
  const template = templates.find((item) => item.id === "SMS-001");
  assert.ok(template);
  const rendered = renderMustache(template.body, { agency_name: "Example Collections" });
  assert.match(rendered, /Example Collections/);
  const missing = missingInterpolations(template.body, { agency_name: "Example Collections" });
  assert.ok(missing.includes("consumer_first_name"));
  const blocks = sendRuleBlocks({
    templateId: "LTR-002",
    rules: ["Block if today <= validation_end_date (prevents overshadowing, 1006.38(b))"],
    account: account(),
    channel: "letter",
    now: new Date("2026-03-10T15:00:00.000Z"),
    values: { validation_end_date: "2026-04-08" },
    offer: null,
    priorLetterAt: null,
    smsConsent: false,
    emailConsent: false,
    reassigned: "ok",
  });
  assert.equal(blocks.length > 0, true);
});

test("settlement offers stay blocked while matrix values are defaults", () => {
  const matrix = loadSettlementMatrix();
  const blocked = settlementOffer(account(), matrix, new Date("2026-11-05T15:00:00.000Z"));
  assert.equal(blocked.usesDefaults, true);
  assert.ok(blocked.blockedReason);
  const saved = clearMatrixDefaults(matrix);
  const open = settlementOffer(account(), saved, new Date("2026-11-05T15:00:00.000Z"));
  assert.equal(open.usesDefaults, false);
  assert.equal(open.blockedReason, null);
  assert.equal(open.openingCents > 0, true);
});

test("voice guardrails replace a banned utterance without using the script model", () => {
  const rules = guardrailsFromJson(readFileSync(path.join(process.cwd(), "templates/collections/call-scripts/voice-ai-guardrails.json"), "utf8"));
  const result = filterVoiceUtterance("If you do not pay we will sue.", rules);
  assert.equal(result.blocked, true);
  assert.equal(result.text.toLowerCase().includes("sue"), false);
  const safe = filterVoiceUtterance("I can transfer you to a person.", rules);
  assert.equal(safe.blocked, false);
});

function tokens(body: string): string[] {
  return [...body.matchAll(/\{\{\s*([#^/]?)([a-z0-9_]+)\s*\}\}/gi)].map((match) => match[2] ?? "").filter(Boolean);
}
