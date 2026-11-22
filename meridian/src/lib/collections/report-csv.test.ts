import assert from "node:assert/strict";
import test from "node:test";
import { collectionReport } from "../../server/collections/service";
import { collectionReportCsv } from "./report-csv";

test("the operations export is marked as a draft and omits account numbers", () => {
  const report = collectionReport("triton");
  assert.equal(report.needsCounselReview, true);
  assert.match(report.label, /Not a client invoice/);
  assert.match(report.label, /Counsel should confirm the fee/);
  const csv = collectionReportCsv({
    portfolios: [
      { portfolioId: "pf,1", accounts: 2, quarantined: 1, faceCents: 100, collectedCents: 40, recoveryRate: 0.4 },
    ],
    remittance: [
      { portfolioId: "pf,1", clientName: "Example, Seller", collectedCents: 40, feeCents: 0, remittanceCents: 40, paymentCount: 1 },
    ],
  });
  assert.match(csv.split("\n")[0] ?? "", /Draft operations report/);
  assert.match(csv, /"pf,1"/);
  assert.match(csv, /"Example, Seller"/);
  assert.equal(csv.includes("account_ref"), false);
  assert.equal(csv.includes("ssn"), false);
  const live = collectionReportCsv(report);
  assert.match(live, /Draft operations report/);
  assert.equal(live.includes("account_ref"), false);
});
