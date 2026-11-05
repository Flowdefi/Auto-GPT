import assert from "node:assert/strict";
import test from "node:test";
import { SESSION_COOKIE } from "../commerce";
import { requiresAllPartyRecording } from "./recording";
import { POST } from "../../app/api/collections/route";
import { createAccount, issueSessionCookie } from "../../server/auth";
import { brandFor, currentBrand, saveBrand } from "../../server/brand";
import { createLicense } from "../../server/billing";
import { counselPacket } from "../../server/collections/counsel";
import { ensureRecordingTable, ensureSolTable, saveRecordingRules, saveSolRules } from "../../server/collections/service";
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
