import assert from "node:assert/strict";
import test from "node:test";
import type { PortfolioAccount } from "@/lib/collections/types";
import { isSealed, openCrmRecord, openPortfolioAccount, sealCrmRecord, sealPortfolioAccount } from "./at-rest";

function account(): PortfolioAccount {
  return {
    id: "acct_test",
    workspaceId: "triton",
    portfolioId: "pf_test",
    accountRef: "DEMO-1",
    consumerName: "Ada Example",
    state: "TX",
    zip: "75201",
    last4: "4242",
    portalCode: "DEMO42",
    phoneType: "cell",
    phoneLast4: "0100",
    sellerName: "Sample Seller",
    balanceCents: 100,
    status: "workable",
    quarantineReason: null,
    inconvenientWork: false,
    importedAt: "2026-11-05T00:00:00.000Z",
    returnedAt: null,
    originalCreditor: "First Bank",
    attorneyName: "Riley Counsel",
  };
}

test("debtor identity and masked file links seal at rest and open again", () => {
  const sealed = sealPortfolioAccount(account());
  assert.equal(isSealed(sealed.consumerName), true);
  assert.equal(isSealed(sealed.zip), true);
  assert.equal(isSealed(sealed.portalCode), true);
  assert.equal(isSealed(sealed.originalCreditor ?? ""), true);
  assert.equal(sealed.state, "TX");
  assert.equal(sealed.accountRef, "DEMO-1");
  const opened = openPortfolioAccount(sealed);
  assert.equal(opened.consumerName, "Ada Example");
  assert.equal(opened.zip, "75201");
  assert.equal(opened.portalCode, "DEMO42");
  assert.equal(openPortfolioAccount(opened).consumerName, "Ada Example");

  const stored = sealCrmRecord("inventory", JSON.stringify({ id: "pf_1", maskedFileUrl: "https://example.com/masked.xlsx" }));
  const parsed = JSON.parse(stored) as { maskedFileUrl: string };
  assert.equal(parsed.maskedFileUrl.startsWith("enc1:"), true);
  const revealed = openCrmRecord("inventory", parsed);
  assert.equal(revealed.maskedFileUrl, "https://example.com/masked.xlsx");

  const contact = sealCrmRecord("contacts", JSON.stringify({ id: "ct_1", email: "ada@example.com" }));
  assert.equal(JSON.parse(contact).email, "ada@example.com");
});
