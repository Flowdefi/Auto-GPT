import assert from "node:assert/strict";
import test from "node:test";
import { SESSION_COOKIE } from "../commerce";
import { POST } from "../../app/api/collections/route";
import { createAccount, issueSessionCookie } from "../../server/auth";
import { createLicense } from "../../server/billing";
import { freezeOutbound, liftOutboundFreeze } from "../../server/collections/incident";
import { listDigests, writeComplianceDigest } from "../../server/collections/observe";
import { setOperatorRole, voiceSettingsFor } from "../../server/collections/service";
import { loadDb, mutate, nextId } from "../../server/db";
import { loadSettlementMatrix } from "./template-library";

async function ownerCookie(email: string): Promise<string> {
  const account = createAccount({ email, name: "Example Owner", password: "sandbox-password-1" });
  createLicense({ kind: "minted", email, accountId: account.id, notes: "test seat" });
  return issueSessionCookie(account).cookie;
}

function deskRequest(cookie: string, body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/collections", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${cookie}` },
    body: JSON.stringify(body),
  });
}

test("an admin without MFA cannot save the matrix or the kill switch", async () => {
  const stamp = Date.now().toString(36);
  const cookie = await ownerCookie(`mfa-${stamp}@example.test`);
  const matrix = await POST(deskRequest(cookie, { op: "matrix", workspaceId: "aether", matrix: loadSettlementMatrix() }));
  assert.equal(matrix.status, 403);
  const matrixBody = (await matrix.json()) as { mfaRequired?: boolean };
  assert.equal(matrixBody.mfaRequired, true);
  const settings = await POST(deskRequest(cookie, { op: "settings", workspaceId: "triton", killSwitch: true }));
  assert.equal(settings.status, 403);
  assert.equal((loadDb().frozenWorkspaces ?? []).includes("triton"), false);
});

test("a collector cannot flip another agency's kill switch", async () => {
  const stamp = Date.now().toString(36);
  const email = `collector-${stamp}@example.test`;
  const cookie = await ownerCookie(email);
  setOperatorRole(email, "collector");
  const before = voiceSettingsFor("aether").killSwitch;
  const response = await POST(deskRequest(cookie, { op: "settings", workspaceId: "aether", killSwitch: true }));
  assert.equal(response.status, 403);
  assert.equal(voiceSettingsFor("aether").killSwitch, before);
  assert.equal((loadDb().frozenWorkspaces ?? []).includes("aether"), false);
});

test("the desk kill switch is per workspace and the digest stays inside it", async () => {
  const aetherBefore = voiceSettingsFor("aether").killSwitch;
  let called = false;
  await freezeOutbound("triton", async () => {
    called = true;
    return { ok: true, status: 200, json: async () => ({}), text: async () => "" };
  });
  assert.equal(called, false);
  assert.equal(voiceSettingsFor("triton").killSwitch, true);
  assert.equal(voiceSettingsFor("aether").killSwitch, aetherBefore);
  liftOutboundFreeze("triton");
  const marker = `HBR-${Date.now().toString(36)}`;
  mutate((db) => {
    db.complianceEvents = [
      {
        id: nextId("ce"),
        workspaceId: "triton",
        at: new Date().toISOString(),
        channel: "email",
        accountId: null,
        allowed: false,
        reason: `${marker} ada@example.test`,
      },
      ...(db.complianceEvents ?? []),
    ];
  });
  const digest = await writeComplianceDigest("aether");
  assert.equal(digest.summary.includes(marker), false);
  assert.equal(digest.summary.includes("@"), false);
  assert.match(digest.summary, /for aether/);
  assert.equal(listDigests("triton").some((row) => row.id === digest.id), false);
});
