import assert from "node:assert/strict";
import { generateKeyPairSync, sign as signRaw, type KeyObject } from "node:crypto";
import test from "node:test";
import { accessSessionEmail, verifyAccessJwt } from "./access";
import { isOwnerEmail, ownerEmails } from "./owner-policy";
import { safeNextPath, selfHostClosure } from "./self-host-routes";

function sign(privateKey: KeyObject, payload: Record<string, unknown>, kid = "kid-1"): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid, typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const signature = signRaw("RSA-SHA256", Buffer.from(data), privateKey).toString("base64url");
  return `${data}.${signature}`;
}

function keysOf(publicKey: KeyObject): Map<string, KeyObject> {
  return new Map([["kid-1", publicKey]]);
}

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const issuer = "https://team.cloudflareaccess.com";
const audience = "aud-test";
const now = Date.parse("2026-11-05T12:00:00.000Z");

function userToken(extra: Record<string, unknown> = {}): string {
  return sign(privateKey, {
    aud: [audience],
    iss: issuer,
    exp: Math.floor(now / 1000) + 600,
    email: "Portfolios@DebtMarket.net",
    ...extra,
  });
}

test("cloudflare access jwt accepts an owner email and rejects bad tokens", () => {
  const keys = keysOf(publicKey);
  const good = verifyAccessJwt(userToken(), { audience, issuer, keys, now });
  assert.equal(accessSessionEmail(good), "portfolios@debtmarket.net");

  const service = verifyAccessJwt(userToken({ email: undefined, common_name: "portfolios@debtmarket.net" }), {
    audience,
    issuer,
    keys,
    now,
  });
  assert.equal(accessSessionEmail(service), null);
  assert.equal(service.ok && service.email === null, true);

  assert.equal(verifyAccessJwt(userToken({ aud: "other" }), { audience, issuer, keys, now }).ok, false);
  assert.equal(
    verifyAccessJwt(userToken({ exp: Math.floor(now / 1000) - 120 }), { audience, issuer, keys, now }).ok,
    false,
  );
  assert.equal(verifyAccessJwt(userToken({ iss: "https://evil.example" }), { audience, issuer, keys, now }).ok, false);
  const token = userToken();
  const [header, payload, signature] = token.split(".");
  const flipped = `${header}.${payload?.slice(0, -1)}${payload?.endsWith("a") ? "b" : "a"}.${signature}`;
  assert.equal(verifyAccessJwt(flipped, { audience, issuer, keys, now }).ok, false);
  assert.equal(verifyAccessJwt(userToken(), { audience, issuer, keys: new Map(), now }).ok, false);
});

test("owner allow-list and closed self-host routes", () => {
  const previous = process.env.MERIDIAN_OWNER_EMAILS;
  process.env.MERIDIAN_OWNER_EMAILS = " portfolios@debtmarket.net, Alex.Floresj@iCloud.com ";
  assert.deepEqual(ownerEmails(), ["portfolios@debtmarket.net", "alex.floresj@icloud.com"]);
  assert.equal(isOwnerEmail("ALEX.FLORESJ@icloud.com"), true);
  assert.equal(isOwnerEmail("other@example.com"), false);
  if (previous === undefined) delete process.env.MERIDIAN_OWNER_EMAILS;
  else process.env.MERIDIAN_OWNER_EMAILS = previous;

  assert.equal(selfHostClosure("/pricing"), "page");
  assert.equal(selfHostClosure("/billing/checkout"), "page");
  assert.equal(selfHostClosure("/api/auth/signup"), "api");
  assert.equal(selfHostClosure("/api/billing/webhook"), "api");
  assert.equal(selfHostClosure("/login"), null);
  assert.equal(selfHostClosure("/api/auth/login"), null);
  assert.equal(safeNextPath("https://evil.example"), "/w/triton/home");
  assert.equal(safeNextPath("/billing"), "/w/triton/home");
  assert.equal(safeNextPath("/w/triton/inventory"), "/w/triton/inventory");
});
