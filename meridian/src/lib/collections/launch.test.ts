import assert from "node:assert/strict";
import test from "node:test";
import { annualIrr, cashOnCash } from "./economics";
import { account360 } from "../../server/collections/floor";
import { closePortfolio, portfolioEconomics, savePortfolioCost } from "../../server/collections/economics";
import { freezeOutbound } from "../../server/collections/incident";
import { recordScrubResult, runScrub } from "../../server/collections/scrubs";
import { approveSettlement, openSettlement, releaseSettlementLetter } from "../../server/collections/settlement-desk";
import { gateFor, importPortfolio } from "../../server/collections/service";
import { seedTrainingDesk } from "../../server/collections/training";
import { loadDb, mutate, nextId } from "../../server/db";

test("cash-on-cash and IRR are labeled model math", () => {
  assert.equal(cashOnCash(50, 100), 0.5);
  assert.equal(cashOnCash(10, 0), null);
  const irr = annualIrr([-10000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]);
  assert.equal(typeof irr, "number");
  assert.ok((irr ?? 0) > 0);
});

test("portfolio economics stay inside the workspace and close with a final statement", () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance,seller\nECON-${stamp},Example Economics,OH,44101,4242,80.00,Example Seller\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `ECON-${stamp}`);
  assert.ok(account);
  savePortfolioCost("triton", account.portfolioId, 2000, "Example Seller");
  const rows = portfolioEconomics("triton");
  const row = rows.find((item) => item.portfolioId === account.portfolioId);
  assert.ok(row);
  assert.equal(row.cashOnCash, 0);
  assert.equal(row.label.includes("Not a forecast"), true);
  assert.equal(portfolioEconomics("aether").some((item) => item.portfolioId === account.portfolioId), false);
  const statement = closePortfolio("triton", account.portfolioId);
  assert.equal(statement.final, true);
  assert.equal(statement.remittanceCents, 0);
  assert.throws(() => account360("aether", account.id), /not found/i);
});

test("sandbox scrubs do not call out and a hit holds the account", async () => {
  let called = false;
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nSCRUB-${stamp},Example Scrub,OH,44101,4242,10.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `SCRUB-${stamp}`);
  assert.ok(account);
  const quiet = await runScrub("triton", account.id, "bankruptcy", async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({ status: "hit" }), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(quiet.status, "unknown");
  assert.equal((loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id)?.status, "workable");
  const hit = recordScrubResult({ workspaceId: "triton", accountId: account.id, kind: "deceased", status: "hit", source: "sandbox" });
  assert.equal(hit.status, "hit");
  assert.equal((loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id)?.status, "deceased");
  assert.equal(gateFor("triton", (loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id) ?? null, "email").allowed, false);
});

test("a large settlement needs two approvers and the letter waits", () => {
  const stamp = Date.now().toString(36);
  const imported = importPortfolio({
    workspaceId: "triton",
    csv: `account_ref,consumer_name,consumer_state,zip,last4,balance\nSTL-${stamp},Example Settlement,OH,44101,4242,800.00\n`,
  });
  const account = imported.accounts.find((item) => item.accountRef === `STL-${stamp}`);
  assert.ok(account);
  assert.throws(() => openSettlement("triton", account.id), /default/i);
  const caseId = nextId("stl");
  mutate((db) => {
    db.settlementCases = [...(db.settlementCases ?? []), {
      id: caseId,
      workspaceId: "triton",
      accountId: account.id,
      offerCents: 60000,
      counterCents: null,
      status: "open",
      ownerApprovedBy: null,
      complianceApprovedBy: null,
      holdUntil: null,
      createdAt: new Date().toISOString(),
    }];
  });
  const first = approveSettlement("triton", caseId, "owner@example.test", "admin");
  assert.equal(first.status, "open");
  assert.throws(() => approveSettlement("triton", caseId, "owner@example.test", "compliance"), /same person/);
  const second = approveSettlement("triton", caseId, "compliance@example.test", "compliance");
  assert.equal(second.status, "held");
  assert.ok(second.holdUntil);
  assert.throws(() => releaseSettlementLetter("triton", caseId, "2000-01-01"), /stays queued/);
});

test("a second demo agency cannot see the first workspace and freeze does not cross", async () => {
  seedTrainingDesk("triton");
  seedTrainingDesk("aether");
  const harbor = (loadDb().portfolioAccounts ?? []).find((account) => account.accountRef === "HBR-OH-1");
  const demo = (loadDb().portfolioAccounts ?? []).find((account) => account.accountRef === "DEMO-OH-1");
  assert.ok(harbor);
  assert.ok(demo);
  assert.equal(harbor.workspaceId, "aether");
  assert.equal(demo.workspaceId, "triton");
  assert.throws(() => account360("triton", harbor.id), /not found/i);
  let called = false;
  const frozen = await freezeOutbound("triton", async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(frozen.frozen, true);
  assert.equal(gateFor("triton", demo, "sms").reason.includes("kill switch"), true);
  assert.equal(gateFor("aether", harbor, "sms").reason.includes("kill switch"), false);
  mutate((db) => {
    db.frozenWorkspaces = (db.frozenWorkspaces ?? []).filter((id) => id !== "triton");
  });
});
