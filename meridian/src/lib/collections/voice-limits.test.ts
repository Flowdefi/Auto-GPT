import assert from "node:assert/strict";
import test from "node:test";
import { defaultVoiceSettings } from "../../server/collections/defaults";
import { saveVoiceLimits, voiceSettingsFor } from "../../server/collections/service";
import { loadDb, mutate } from "../../server/db";

test("daily cap, inbound block, and discount stay inside the workspace", () => {
  const before = voiceSettingsFor("triton");
  const priorTriton = loadDb().voiceLimitsByWorkspace?.triton;
  const priorAether = loadDb().voiceLimitsByWorkspace?.aether;
  const priorLegacy = loadDb().voiceSettings ? { ...loadDb().voiceSettings } : undefined;
  try {
    saveVoiceLimits("triton", { dailyOutboundCap: 7, blockInbound: true, maxDiscountPercent: 15, maxPlanMonths: 9 });
    const untouched = voiceSettingsFor("aether");
    const defaults = defaultVoiceSettings();
    assert.equal(untouched.dailyOutboundCap, priorAether?.dailyOutboundCap ?? defaults.dailyOutboundCap);
    assert.equal(untouched.blockInbound, priorAether?.blockInbound ?? defaults.blockInbound);
    assert.equal(untouched.maxDiscountPercent, priorAether?.maxDiscountPercent ?? defaults.maxDiscountPercent);
    assert.equal(untouched.maxPlanMonths, priorAether?.maxPlanMonths ?? defaults.maxPlanMonths);
    assert.notEqual(untouched.dailyOutboundCap, 7);

    const saved = saveVoiceLimits("aether", { dailyOutboundCap: 3, blockInbound: false, maxDiscountPercent: 5, maxPlanMonths: 4 });
    assert.equal(saved.dailyOutboundCap, 3);
    assert.equal(saved.blockInbound, false);
    assert.equal(saved.maxDiscountPercent, 5);
    assert.equal(saved.maxPlanMonths, 4);
    const triton = voiceSettingsFor("triton");
    assert.equal(triton.dailyOutboundCap, 7);
    assert.equal(triton.blockInbound, true);
    assert.equal(triton.maxDiscountPercent, 15);
    assert.equal(triton.maxPlanMonths, 9);
    assert.throws(() => saveVoiceLimits("aether", { dailyOutboundCap: 0 }), /1 to 10000/);
    assert.throws(() => saveVoiceLimits("aether", { maxDiscountPercent: 101 }), /0 to 100/);
    assert.equal(voiceSettingsFor("triton").dailyOutboundCap, 7);
  } finally {
    mutate((db) => {
      db.voiceLimitsByWorkspace = { ...(db.voiceLimitsByWorkspace ?? {}) };
      if (priorTriton) db.voiceLimitsByWorkspace.triton = priorTriton;
      else delete db.voiceLimitsByWorkspace.triton;
      if (priorAether) db.voiceLimitsByWorkspace.aether = priorAether;
      else delete db.voiceLimitsByWorkspace.aether;
      if (priorLegacy && db.voiceSettings) {
        db.voiceSettings.dailyOutboundCap = before.dailyOutboundCap;
        db.voiceSettings.blockInbound = before.blockInbound;
        db.voiceSettings.maxDiscountPercent = before.maxDiscountPercent;
        db.voiceSettings.maxPlanMonths = before.maxPlanMonths;
      }
    });
  }
});
