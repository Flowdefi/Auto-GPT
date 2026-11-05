import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { bindClient, clientHome, placeForClient, recallForClient } from "../../server/collections/client-portal";
import { fileComplaint } from "../../server/collections/complaint-store";
import { postAchPayment, reversePayment } from "../../server/collections/payments";
import { loadDb } from "../../server/db";
import { redact } from "../../server/log";
import { assertSameOrigin, scanUpload } from "../../server/security";

const PUBLIC_ROUTES = [
  "/api/auth/login/route.ts",
  "/api/auth/signup/route.ts",
  "/api/billing/webhook/route.ts",
  "/api/email/track/open/route.ts",
  "/api/email/track/click/route.ts",
  "/api/email/unsubscribe/route.ts",
  "/api/forms/embed.js/route.ts",
  "/api/portal/route.ts",
  "/api/webhooks/channels/route.ts",
  "/api/agency/route.ts",
];

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (entry === "route.ts") found.push(full);
  }
  return found;
}

test("every API route requires a seat or is on the public allowlist", () => {
  const root = path.join(process.cwd(), "src/app/api");
  const missing: string[] = [];
  for (const file of walk(root)) {
    const relative = file.slice(file.indexOf("/api/"));
    const source = readFileSync(file, "utf8");
    const guarded = /requireSeat|requireAccount|seatFromRequest/.test(source);
    const allowed = PUBLIC_ROUTES.some((route) => relative.endsWith(route));
    if (!guarded && !allowed) missing.push(relative);
  }
  assert.deepEqual(missing, []);
});

test("cookie writes from another origin are blocked and uploads are scanned", () => {
  const request = new Request("https://example.test/api/collections", { headers: { cookie: "meridian_session=1", origin: "https://evil.test", host: "example.test" } });
  assert.throws(() => assertSameOrigin(request), /Cross-site/);
  assert.doesNotThrow(() => assertSameOrigin(new Request("https://example.test/api/collections", { headers: { host: "example.test" } })));
  assert.throws(() => scanUpload("<script>alert(1)</script>"), /rejected/);
  assert.throws(() => scanUpload("x".repeat(25_000_001)), /too large/);
});

test("logs redact identifiers", () => {
  const line = redact("ssn 900-00-0001 card 4242424242424242 mail ada@example.test");
  assert.equal(line.includes("900-00-0001"), false);
  assert.equal(line.includes("4242424242424242"), false);
  assert.equal(line.includes("ada@example.test"), false);
});

test("a client cannot see or recall another seller", () => {
  bindClient("client.a@example.test", "Client Seller A", "admin");
  bindClient("client.b@example.test", "Client Seller B", "admin");
  const placed = placeForClient("triton", "client", "client.a@example.test", "account_ref,consumer_name,consumer_state,zip,last4,balance\nCL-A,Example A,OH,44101,3333,20.00\n");
  assert.equal(placed.created, 1);
  assert.throws(
    () => placeForClient("triton", "client", "client.a@example.test", "account_ref,consumer_name,consumer_state,zip,last4,seller,balance\nCL-X,Example X,OH,44101,3333,Client Seller B,20.00\n"),
    /only its own/,
  );
  const home = clientHome("triton", "client", "client.a@example.test");
  assert.equal(home.seller, "Client Seller A");
  assert.equal(home.clients.every((row) => row.sellerName === "Client Seller A"), true);
  placeForClient("triton", "client", "client.b@example.test", "account_ref,consumer_name,consumer_state,zip,last4,balance\nCL-B,Example B,CA,90001,2222,20.00\n");
  const recalled = recallForClient("triton", "client", "client.a@example.test");
  assert.equal(recalled, 0);
  const other = (loadDb().portfolioAccounts ?? []).find((account) => account.accountRef === "CL-B");
  assert.equal(other?.status, "quarantined");
  assert.equal(other?.sellerName, "Client Seller B");
});

test("ACH stores authorization proof, posts the balance, and NSF restores it", async () => {
  const placed = placeForClient("triton", "admin", "desk@example.test", "account_ref,consumer_name,consumer_state,zip,last4,balance\nACH-1,Example Payer,OH,44101,4444,30.00\n");
  const account = placed.accounts.find((item) => item.accountRef === "ACH-1");
  assert.ok(account);
  await assert.rejects(() => postAchPayment({ workspaceId: "triton", accountId: account.id, amountCents: 1000, recurring: true, accepted: false }), /authorization/);
  const payment = await postAchPayment({ workspaceId: "triton", accountId: account.id, amountCents: 1000, recurring: false, accepted: true });
  assert.equal(payment.method, "ach");
  assert.ok(payment.authorization?.proofId);
  assert.equal(JSON.stringify(payment).includes("00000000"), false);
  const after = (loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id);
  assert.equal(after?.balanceCents, 2000);
  const reversed = reversePayment("triton", payment.id, "nsf");
  assert.equal(reversed.status, "nsf");
  const restored = (loadDb().portfolioAccounts ?? []).find((item) => item.id === account.id);
  assert.equal(restored?.balanceCents, 3000);
  const complaint = fileComplaint("triton", { channel: "cfpb", summary: "Example complaint about a letter.", cfpbId: "CFPB-EXAMPLE", rootCause: "communication" });
  assert.ok(complaint.responseDueAt > complaint.receivedAt);
});
