import assert from "node:assert/strict";
import test from "node:test";
import { parseActivityKind, shouldCreateContact } from "./activity-kinds";
import { selfHosted } from "./self-hosted";

test("self-hosted flag", () => {
  const previous = process.env.MERIDIAN_SELF_HOSTED;
  process.env.MERIDIAN_SELF_HOSTED = "true";
  assert.equal(selfHosted(), true);
  process.env.MERIDIAN_SELF_HOSTED = "0";
  assert.equal(selfHosted(), false);
  if (previous === undefined) delete process.env.MERIDIAN_SELF_HOSTED;
  else process.env.MERIDIAN_SELF_HOSTED = previous;
});

test("activity kinds skip suppressed contact creation", () => {
  assert.equal(parseActivityKind("NDA"), "nda");
  assert.equal(parseActivityKind("email"), "inbound");
  assert.equal(parseActivityKind("nope"), null);
  assert.equal(shouldCreateContact({ exists: false, suppressed: true, allowCreate: true }), false);
  assert.equal(shouldCreateContact({ exists: true, suppressed: false, allowCreate: true }), false);
  assert.equal(shouldCreateContact({ exists: false, suppressed: false, allowCreate: true }), true);
});
