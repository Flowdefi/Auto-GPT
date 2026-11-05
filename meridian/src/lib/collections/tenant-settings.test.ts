import assert from "node:assert/strict";
import test from "node:test";
import { SESSION_COOKIE } from "../commerce";
import { requiresAllPartyRecording } from "./recording";
import { solFor } from "./sol";
import { POST } from "../../app/api/collections/route";
import { createAccount, issueSessionCookie } from "../../server/auth";
import { brandFor, currentBrand, saveBrand } from "../../server/brand";
import { createLicense } from "../../server/billing";
import { counselPacket } from "../../server/collections/counsel";
import { digestRecipients, digestSubject, writeComplianceDigest } from "../../server/collections/observe";
import { ensureRecordingTable, ensureSolTable, importPortfolio, issueValidation, saveRecordingRules, saveSolRules, setOperatorRole, startVoice } from "../../server/collections/service";
import { loadDb, mutate } from "../../server/db";

test("aether brand, limitations, and recording stay off the triton copies", () => {
  const db = loadDb();
  const priorBrand = db.agencyBrands?.aether;
  const priorPublic = db.agencyBrand;
  const priorSol = db.solTables?.aether;
  const priorRecording = db.recordingTables?.aether;
  const tritonTx = ensureSolTable("triton").find((rule) => rule.code === "TX");
  const tritonRecording = ensureRecordingTable("triton").find((rule) => rule.code === "TX");
  const tritonName = brandFor("triton").name;
  const publicBefore = JSON.stringify(loadDb().agencyBrand ?? null);
  try {
    const brand = saveBrand(
      { name: "Example Harbor Collections", domain: "harbor.example.test", logoUrl: "https://example.test/h.png", color: "#123456" },
      "admin",
      "aether",
    );
    if (!process.env.MERIDIAN_AGENCY_NAME?.trim()) {
      assert.equal(brand.name, "Example Harbor Collections");
      assert.equal(brandFor("aether").name, "Example Harbor Collections");
      assert.notEqual(brandFor("triton").name, "Example Harbor Collections");
      assert.equal(currentBrand().name, tritonName);
    }
    if (!process.env.MERIDIAN_AGENCY_DOMAIN?.trim()) {
      assert.equal(brandFor("aether").domain, "harbor.example.test");
      assert.notEqual(brandFor("triton").domain, "harbor.example.test");
    }
    assert.equal(JSON.stringify(loadDb().agencyBrand ?? null), publicBefore);

    const sol = saveSolRules(
      [{ code: "TX", years: 9, citation: "Example Harbor counsel override. Not a statute.", needsCounselReview: true }],
      "compliance",
      "aether",
    );
    const savedTx = sol.find((rule) => rule.code === "TX");
    assert.equal(savedTx?.years, 9);
    assert.equal(savedTx?.needsCounselReview, true);
    assert.equal(ensureSolTable("triton").find((rule) => rule.code === "TX")?.years, tritonTx?.years);
    assert.equal(ensureSolTable("triton").find((rule) => rule.code === "TX")?.citation, tritonTx?.citation);

    const recording = saveRecordingRules(
      [{ code: "TX", party: "uncertain", citation: "Example Harbor hold. Counsel must confirm.", needsCounselReview: true }],
      "compliance",
      "aether",
    );
    assert.equal(recording.find((rule) => rule.code === "TX")?.party, "uncertain");
    assert.equal(recording.find((rule) => rule.code === "TX")?.needsCounselReview, true);
    assert.equal(requiresAllPartyRecording("TX", ensureRecordingTable("aether")), true);
    assert.equal(ensureRecordingTable("triton").find((rule) => rule.code === "TX")?.party, tritonRecording?.party);

    const packet = counselPacket("aether");
    assert.match(packet.items.find((item) => item.area === "Limitations table")?.note ?? "", /own table/);
    assert.match(packet.items.find((item) => item.area.startsWith("Recording"))?.note ?? "", /own recording table/);
    assert.match(packet.items.find((item) => item.area.startsWith("Public"))?.note ?? "", /Triton brand/);
  } finally {
    mutate((state) => {
      state.agencyBrands = { ...(state.agencyBrands ?? {}) };
      if (priorBrand) state.agencyBrands.aether = priorBrand;
      else delete state.agencyBrands.aether;
      state.agencyBrand = priorPublic;
      state.solTables = { ...(state.solTables ?? {}) };
      if (priorSol) state.solTables.aether = priorSol;
      else delete state.solTables.aether;
      state.recordingTables = { ...(state.recordingTables ?? {}) };
      if (priorRecording) state.recordingTables.aether = priorRecording;
      else delete state.recordingTables.aether;
    });
  }
});

test("an admin without MFA cannot save another workspace's limitations", async () => {
  const stamp = Date.now().toString(36);
  const account = createAccount({ email: `sol-${stamp}@example.test`, name: "Example Owner", password: "sandbox-password-1" });
  createLicense({ kind: "minted", email: account.email, accountId: account.id, notes: "test seat" });
  const cookie = issueSessionCookie(account).cookie;
  const before = JSON.stringify(loadDb().solTables?.aether ?? null);
  const response = await POST(
    new Request("http://localhost/api/collections", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=${cookie}` },
      body: JSON.stringify({
        op: "sol_save",
        workspaceId: "aether",
        solRules: [{ code: "TX", years: 1, citation: "Should not save.", needsCounselReview: true }],
      }),
    }),
  );
  assert.equal(response.status, 403);
  const body = (await response.json()) as { mfaRequired?: boolean };
  assert.equal(body.mfaRequired, true);
  assert.equal(JSON.stringify(loadDb().solTables?.aether ?? null), before);
});

test("import, voice, and the validation notice use the workspace copies", () => {
  const db = loadDb();
  const priorBrand = db.agencyBrands?.aether;
  const priorPublic = db.agencyBrand;
  const priorSol = db.solTables?.aether;
  const priorRecording = db.recordingTables?.aether;
  const tritonParty = ensureRecordingTable("triton").find((rule) => rule.code === "TX")?.party;
  const stamp = Date.now().toString(36);
  try {
    saveBrand(
      { name: "Example Harbor Voice", domain: "harbor.example.test", logoUrl: "https://example.test/h.png", color: "#123456" },
      "admin",
      "aether",
    );
    saveSolRules(
      [{ code: "TX", years: 9, citation: "Example Harbor counsel override. Not a statute.", needsCounselReview: true }],
      "compliance",
      "aether",
    );
    saveRecordingRules(
      [{ code: "TX", party: "all", citation: "Example Harbor all-party hold. Counsel must confirm.", needsCounselReview: true }],
      "compliance",
      "aether",
    );
    const row = (ref: string) =>
      `account_ref,consumer_name,consumer_state,zip,last4,balance,charge_off_date\n${ref},Example Buyer,TX,78701,4242,40.00,2020-01-01\n`;
    const aether = importPortfolio({ workspaceId: "aether", csv: row(`HBR-${stamp}`) });
    const triton = importPortfolio({ workspaceId: "triton", csv: row(`TRI-${stamp}`) });
    const aAccount = aether.accounts.find((item) => item.accountRef === `HBR-${stamp}`);
    const tAccount = triton.accounts.find((item) => item.accountRef === `TRI-${stamp}`);
    assert.ok(aAccount && tAccount);
    assert.equal(aAccount.solExpiresOn, "2029-01-01");
    assert.equal(aAccount.solNeedsCounselReview, true);
    assert.equal(tAccount.solExpiresOn, solFor("TX", null, "2020-01-01", ensureSolTable("triton")).solExpiresOn);
    assert.notEqual(aAccount.solExpiresOn, tAccount.solExpiresOn);

    const aCall = startVoice({ workspaceId: "aether", direction: "outbound", accountId: aAccount.id });
    const tCall = startVoice({ workspaceId: "triton", direction: "outbound", accountId: tAccount.id });
    assert.equal(aCall.transcript.recordingConsent, null);
    assert.equal(tCall.transcript.recordingConsent, requiresAllPartyRecording("TX", ensureRecordingTable("triton")) ? null : true);
    assert.equal(ensureRecordingTable("triton").find((rule) => rule.code === "TX")?.party, tritonParty);
    if (!aCall.blockedReason && !process.env.MERIDIAN_AGENCY_NAME?.trim()) {
      assert.match(aCall.say, /Example Harbor Voice/);
      assert.equal(tCall.say.includes("Example Harbor Voice"), false);
      const notice = issueValidation("aether", aAccount.id);
      assert.match(notice.validationNotice ?? "", /Example Harbor Voice/);
      assert.match(notice.validationNotice ?? "", /Counsel must confirm/);
    }
    assert.throws(() => issueValidation("triton", aAccount.id), /not found/i);
  } finally {
    mutate((state) => {
      state.agencyBrands = { ...(state.agencyBrands ?? {}) };
      if (priorBrand) state.agencyBrands.aether = priorBrand;
      else delete state.agencyBrands.aether;
      state.agencyBrand = priorPublic;
      state.solTables = { ...(state.solTables ?? {}) };
      if (priorSol) state.solTables.aether = priorSol;
      else delete state.solTables.aether;
      state.recordingTables = { ...(state.recordingTables ?? {}) };
      if (priorRecording) state.recordingTables.aether = priorRecording;
      else delete state.recordingTables.aether;
    });
  }
});

test("a compliance seat limited to one workspace is left off the other digest", async () => {
  const email = `comp-${Date.now().toString(36)}@example.test`;
  setOperatorRole(email, "compliance", "aether");
  try {
    assert.equal(digestSubject("aether"), "Weekly compliance digest for aether");
    assert.equal(digestRecipients("triton").includes(email), false);
    assert.equal(digestRecipients("aether").includes(email), true);
    const digest = await writeComplianceDigest("triton");
    assert.equal(digest.delivery, "sandbox");
    assert.equal(digest.summary.includes(email), false);
    assert.match(digest.summary, /for triton/);
    assert.equal(digest.recipientCount, digestRecipients("triton").length);
  } finally {
    mutate((state) => {
      state.operatorRoles = (state.operatorRoles ?? []).filter((row) => row.email !== email);
    });
  }
});
