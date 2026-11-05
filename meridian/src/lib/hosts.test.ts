import assert from "node:assert/strict";
import test from "node:test";
import { hostDecision, type HostSplit } from "./hosts";
import { assertSameOrigin } from "../server/security";
import { ensureOwnerSeat } from "../server/seed-owner";

const split: HostSplit = {
  publicHost: "collect.debtmarket.net",
  adminHost: "crm.debtmarket.net",
  publicOrigin: "https://collect.debtmarket.net",
  adminOrigin: "https://crm.debtmarket.net",
};

test("collect serves the agency and sends the desk to crm", () => {
  assert.deepEqual(hostDecision("collect.debtmarket.net", "/", "", split), {
    kind: "redirect",
    url: "https://collect.debtmarket.net/agency",
  });
  assert.equal(hostDecision("collect.debtmarket.net", "/collect", "", split).kind, "next");
  assert.equal(hostDecision("collect.debtmarket.net", "/agency/pay", "", split).kind, "next");
  assert.deepEqual(hostDecision("collect.debtmarket.net", "/w/triton/collections", "", split), {
    kind: "redirect",
    url: "https://crm.debtmarket.net/w/triton/collections",
  });
  assert.equal(hostDecision("collect.debtmarket.net", "/api/collections", "", split).kind, "wrong-host");
  assert.equal(hostDecision("collect.debtmarket.net", "/api/health", "", split).kind, "next");
});

test("crm sends consumer pages to collect and keeps the desk", () => {
  assert.deepEqual(hostDecision("crm.debtmarket.net", "/collect", "?ref=1", split), {
    kind: "redirect",
    url: "https://collect.debtmarket.net/collect?ref=1",
  });
  assert.equal(hostDecision("crm.debtmarket.net", "/w/triton/home", "", split).kind, "next");
  assert.equal(hostDecision("crm.debtmarket.net", "/", "", split).kind, "next");
  assert.equal(hostDecision("localhost", "/w/triton/home", "", null).kind, "next");
});

test("forwarded host is the origin that cookie writes must match", () => {
  const blocked = new Request("https://crm.debtmarket.net/api/collections", {
    headers: { cookie: "meridian_session=1", origin: "https://evil.test", "x-forwarded-host": "crm.debtmarket.net", host: "localhost:3000" },
  });
  assert.throws(() => assertSameOrigin(blocked), /Cross-site/);
  const allowed = new Request("https://crm.debtmarket.net/api/collections", {
    headers: { cookie: "meridian_session=1", origin: "https://crm.debtmarket.net", "x-forwarded-host": "crm.debtmarket.net", host: "localhost:3000" },
  });
  assert.doesNotThrow(() => assertSameOrigin(allowed));
});

test("owner seed uses the env password and does not print it", () => {
  const stamp = Date.now().toString(36);
  const email = `owner-${stamp}@example.test`;
  const password = `sandbox-password-${stamp}`;
  const first = ensureOwnerSeat({ MERIDIAN_OWNER_EMAIL: email, MERIDIAN_OWNER_PASSWORD: password });
  assert.equal(first.created, true);
  assert.equal(first.seated, true);
  assert.equal(first.email, email);
  const second = ensureOwnerSeat({ MERIDIAN_OWNER_EMAIL: email, MERIDIAN_OWNER_PASSWORD: password });
  assert.equal(second.created, false);
  assert.equal(second.seated, true);
  assert.equal(ensureOwnerSeat({}).email, "");
});
