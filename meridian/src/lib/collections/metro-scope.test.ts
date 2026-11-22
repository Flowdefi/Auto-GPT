import assert from "node:assert/strict";
import test from "node:test";
import { counselPacket } from "../../server/collections/counsel";
import { approveMetro2, exportMetro2, setRndSandboxClear, voiceSettingsFor } from "../../server/collections/service";
import { loadDb, mutate } from "../../server/db";

test("Metro 2 approval and the reassigned-number clear stay in the workspace", () => {
  const tritonMetro = JSON.stringify(loadDb().metro2Approval ?? null);
  const tritonClear = voiceSettingsFor("triton").rndSandboxClear;
  const priorAetherClear = loadDb().rndSandboxClearByWorkspace?.aether;
  const priorAetherMetro = loadDb().metro2Approvals?.aether;
  const previousExport = process.env.MERIDIAN_METRO2_EXPORT;
  process.env.MERIDIAN_METRO2_EXPORT = "enabled";
  try {
    setRndSandboxClear("aether", true);
    assert.equal(voiceSettingsFor("aether").rndSandboxClear, true);
    assert.equal(voiceSettingsFor("triton").rndSandboxClear, tritonClear);
    assert.equal(JSON.stringify(loadDb().voiceSettings?.rndSandboxClear ?? false), JSON.stringify(tritonClear));

    const owner = approveMetro2("admin", "ada@example.test", "aether");
    assert.equal(owner.ownerApproved, true);
    assert.equal(owner.complianceApproved, false);
    assert.equal(owner.needsCounselReview, true);
    assert.throws(() => exportMetro2("aether"), /both approve/);
    const both = approveMetro2("compliance", "bea@example.test", "aether");
    assert.equal(both.ownerApproved, true);
    assert.equal(both.complianceApproved, true);
    const file = exportMetro2("aether");
    assert.equal(file.needsCounselReview, true);
    assert.equal(JSON.stringify(loadDb().metro2Approval ?? null), tritonMetro);
    const packet = counselPacket("aether");
    assert.match(packet.items.find((item) => item.area.startsWith("Safeguards"))?.note ?? "", /own owner and compliance/);
  } finally {
    if (previousExport === undefined) delete process.env.MERIDIAN_METRO2_EXPORT;
    else process.env.MERIDIAN_METRO2_EXPORT = previousExport;
    mutate((db) => {
      db.rndSandboxClearByWorkspace = { ...(db.rndSandboxClearByWorkspace ?? {}) };
      if (priorAetherClear === undefined) delete db.rndSandboxClearByWorkspace.aether;
      else db.rndSandboxClearByWorkspace.aether = priorAetherClear;
      db.metro2Approvals = { ...(db.metro2Approvals ?? {}) };
      if (priorAetherMetro) db.metro2Approvals.aether = priorAetherMetro;
      else delete db.metro2Approvals.aether;
    });
  }
});
