import assert from "node:assert/strict";
import test from "node:test";
import { counselPacket } from "../../server/collections/counsel";
import { portalCopy, suppliedMoney } from "./portal-copy";

test("portal English and Spanish drafts stay flagged", () => {
  assert.match(portalCopy.en.timeBarredHold, /draft/i);
  assert.match(portalCopy.es.timeBarredHold, /borrador/i);
  assert.match(portalCopy.en.bankBody, /counsel review/i);
  assert.match(portalCopy.es.bankBody, /borrador/i);
  assert.notEqual(portalCopy.en.bankTitle, portalCopy.es.bankTitle);
  assert.notEqual(portalCopy.en.privacyLead, portalCopy.es.privacyLead);
  assert.notEqual(portalCopy.en.agencySite, portalCopy.es.agencySite);
  assert.equal(suppliedMoney(undefined, portalCopy.en.notSupplied), "not supplied");
  assert.equal(suppliedMoney(null, portalCopy.es.notSupplied), "no proporcionado");
  assert.equal(suppliedMoney(0, portalCopy.en.notSupplied), "$0.00");
  assert.equal(suppliedMoney(150, portalCopy.en.notSupplied), "$1.50");
  assert.notEqual(portalCopy.en.interest, portalCopy.es.interest);
  const note = counselPacket("triton").items.find((item) => item.area.startsWith("Public agency"))?.note ?? "";
  assert.match(note, /English and Spanish/);
  assert.match(note, /not a formal accessibility audit/);
});
