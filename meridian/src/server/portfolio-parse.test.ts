import assert from "node:assert/strict";
import test from "node:test";
import { applyPortfolioDraft, excelSerialDate, parseMoney, portfolioRecordId, portfoliosFromCsv } from "./portfolio-parse";

test("inventory sheet maps sale columns and keeps links on reimport", () => {
  const csv = [
    "Portfolio Name,Paper Type,Face Value,# Accounts,States,Chargeoff Dates,Asking Price,Status,OneDrive File URL,Seller",
    'Harbor Card,credit card,"$12,500,000",8420,"FL, Georgia",2020-01 – 2022-06,$450000,Available,https://example.com/masked.xlsx,First Harbor',
  ].join("\n");
  const parsed = portfoliosFromCsv(csv);
  assert.equal(parsed.skipped.length, 0);
  const draft = parsed.drafts[0];
  assert.ok(draft);
  assert.equal(draft.faceValue, 12_500_000);
  assert.equal(draft.askingPrice, 450_000);
  assert.equal(draft.accountCount, 8420);
  assert.deepEqual(draft.states, ["FL", "GA"]);
  assert.equal(draft.status, "listed");
  assert.equal(draft.chargeOffFrom, "2020-01");
  assert.equal(draft.chargeOffTo, "2022-06");
  assert.equal(draft.kind, "credit card");

  const first = applyPortfolioDraft(undefined, draft, { sellerCompanyId: "co_seller" });
  const again = applyPortfolioDraft(
    first,
    { ...draft, maskedFileUrl: "", sellerName: "", faceValue: 0, askingPrice: 0, accountCount: 0, states: [] },
    {},
  );
  assert.equal(again.id, first.id);
  assert.equal(again.id, portfolioRecordId(draft.importKey));
  assert.equal(again.maskedFileUrl, "https://example.com/masked.xlsx");
  assert.equal(again.sellerCompanyId, "co_seller");
  assert.equal(again.faceValue, 12_500_000);
});

test("money suffixes and excel serial dates", () => {
  assert.equal(parseMoney("1.5mm"), 1_500_000);
  assert.match(excelSerialDate(44927), /^\d{4}-\d{2}-\d{2}$/);
});
