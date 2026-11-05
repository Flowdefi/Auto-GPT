import assert from "node:assert/strict";
import test from "node:test";
import { counselPacket } from "../../server/collections/counsel";
import { portalCopy } from "./portal-copy";

test("portal English and Spanish drafts stay flagged", () => {
  assert.match(portalCopy.en.timeBarredHold, /draft/i);
  assert.match(portalCopy.es.timeBarredHold, /borrador/i);
  assert.match(portalCopy.en.bankBody, /counsel review/i);
  assert.match(portalCopy.es.bankBody, /borrador/i);
  assert.notEqual(portalCopy.en.bankTitle, portalCopy.es.bankTitle);
  assert.notEqual(portalCopy.en.privacyLead, portalCopy.es.privacyLead);
  assert.notEqual(portalCopy.en.agencySite, portalCopy.es.agencySite);
  const note = counselPacket("triton").items.find((item) => item.area.startsWith("Public agency"))?.note ?? "";
  assert.match(note, /English and Spanish/);
  assert.match(note, /not a formal accessibility audit/);
});
