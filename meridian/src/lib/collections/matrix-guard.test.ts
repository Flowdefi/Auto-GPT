import assert from "node:assert/strict";
import test from "node:test";
import { isPrivilegedCollectionOp, roleRequiresMfa } from "../../server/mfa-policy";
import { ensureSettlementMatrix, saveSettlementMatrix, scrubAccount } from "../../server/collections/service";
import { loadDb, mutate } from "../../server/db";
import { clearMatrixDefaults, loadSettlementMatrix, settlementOffer, validateSettlementMatrix } from "./template-library";
import type { PortfolioAccount } from "./types";

function sampleAccount(partial: Partial<PortfolioAccount> = {}): PortfolioAccount {
  return {
    id: "acct_matrix",
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
    chargeOffDate: "2024-01-01",
    ...partial,
  };
}

test("the settlement matrix rejects a floor above the opening and a percent over 100", () => {
  const matrix = loadSettlementMatrix();
  const above = structuredClone(matrix);
  const tier = above.tiers.find((item) => item.opening_offer_pct && item.floor_pct);
  assert.ok(tier?.opening_offer_pct && tier.floor_pct);
  tier.floor_pct.value = (tier.opening_offer_pct.value ?? 0) + 10;
  assert.throws(() => validateSettlementMatrix(above), /cannot be above/);
  const huge = structuredClone(matrix);
  const opening = huge.tiers.find((item) => item.opening_offer_pct);
  assert.ok(opening?.opening_offer_pct);
  opening.opening_offer_pct.value = 140;
  assert.throws(() => validateSettlementMatrix(huge), /between 0 and 100/);
});

test("a time-barred account uses the time-barred tier after defaults are cleared", () => {
  const saved = clearMatrixDefaults(loadSettlementMatrix());
  const offer = settlementOffer(
    sampleAccount({ solExpiresOn: "2020-01-01", balanceCents: 80000 }),
    saved,
    new Date("2026-06-01T00:00:00.000Z"),
  );
  assert.equal(offer.blockedReason, null);
  assert.equal(offer.tierId, "T5_time_barred");
  assert.equal(offer.openingCents, 32000);
  assert.equal(offer.floorCents, 20000);
});

test("a cleared matrix can price an offer and hardship lowers it", () => {
  const saved = clearMatrixDefaults(loadSettlementMatrix());
  const plain = settlementOffer(sampleAccount(), saved, new Date("2026-06-01T00:00:00.000Z"));
  const hardship = settlementOffer(sampleAccount({ hardshipReported: true }), saved, new Date("2026-06-01T00:00:00.000Z"));
  assert.equal(plain.blockedReason, null);
  assert.equal(plain.openingCents > 0, true);
  assert.equal(hardship.openingCents < plain.openingCents, true);
  assert.equal(hardship.floorCents <= hardship.openingCents, true);
});

test("each workspace keeps its own settlement matrix", () => {
  const before = structuredClone(ensureSettlementMatrix("triton"));
  const priorMap = loadDb().settlementMatrices;
  const priorLegacy = loadDb().settlementMatrix;
  try {
    const saved = saveSettlementMatrix(loadSettlementMatrix(), "admin", "aether");
    assert.equal(saved.customized, true);
    assert.equal(saved.needs_counsel_review, true);
    assert.throws(() => saveSettlementMatrix(loadSettlementMatrix(), "collector", "aether"), /admin or compliance/);
    assert.equal(JSON.stringify(ensureSettlementMatrix("triton")), JSON.stringify(before));
    assert.equal(ensureSettlementMatrix("aether").customized, true);
  } finally {
    mutate((db) => {
      db.settlementMatrices = priorMap;
      db.settlementMatrix = priorLegacy;
    });
  }
});

test("a compliance scrub cannot read another workspace and privileged ops include the kill switch", async () => {
  await assert.rejects(() => scrubAccount("aether", "acct_demo_tx"), /not found/);
  assert.equal(roleRequiresMfa("collector"), false);
  assert.equal(roleRequiresMfa("admin"), true);
  for (const op of ["settings", "purge_pii", "payment_reverse", "brand_save", "client_bind", "portfolio_close", "matrix", "freeze_outbound"]) {
    assert.equal(isPrivilegedCollectionOp(op), true, op);
  }
  assert.equal(isPrivilegedCollectionOp("channel"), false);
});
