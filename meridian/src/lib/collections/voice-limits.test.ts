import assert from "node:assert/strict";
import test from "node:test";
import { reasonCode } from "./reason-code";
import type { ChannelMessage } from "./types";
import { defaultVoiceSettings } from "../../server/collections/defaults";
import { gateFor, saveVoiceLimits, voiceSettingsFor } from "../../server/collections/service";
import { loadDb, mutate, nextId } from "../../server/db";

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

test("the gate applies one workspace's cap and inbound block", () => {
  const priorTriton = loadDb().voiceLimitsByWorkspace?.triton;
  const priorAether = loadDb().voiceLimitsByWorkspace?.aether;
  const stored = loadDb().voiceSettings;
  const priorKill = stored?.killSwitch ?? false;
  const priorCap = stored?.dailyOutboundCap ?? defaultVoiceSettings().dailyOutboundCap;
  const priorBlock = stored?.blockInbound ?? false;
  const priorDiscount = stored?.maxDiscountPercent ?? defaultVoiceSettings().maxDiscountPercent;
  const priorMonths = stored?.maxPlanMonths ?? defaultVoiceSettings().maxPlanMonths;
  const priorFrozen = [...(loadDb().frozenWorkspaces ?? [])];
  const messageId = nextId("msg");
  try {
    mutate((db) => {
      if (db.voiceSettings) db.voiceSettings.killSwitch = false;
      db.frozenWorkspaces = (db.frozenWorkspaces ?? []).filter((id) => id !== "aether" && id !== "triton");
      const message: ChannelMessage = {
        id: messageId,
        workspaceId: "aether",
        accountId: "missing",
        channel: "email",
        status: "sandbox_queued",
        reason: null,
        templateId: null,
        provider: "sandbox",
        providerId: null,
        at: new Date().toISOString(),
      };
      db.channelMessages = [message, ...(db.channelMessages ?? [])];
    });
    saveVoiceLimits("aether", { dailyOutboundCap: 1, blockInbound: true });
    saveVoiceLimits("triton", { dailyOutboundCap: 10000, blockInbound: false });
    assert.match(gateFor("aether", null, "email").reason, /Daily outbound cap of 1/);
    assert.equal(gateFor("triton", null, "email").reason.includes("Daily outbound cap"), false);
    assert.match(gateFor("aether", null, "voice_inbound").reason, /Inbound voice is switched off/);
    assert.equal(gateFor("triton", null, "voice_inbound").reason.includes("Inbound voice"), false);
    assert.equal(reasonCode("Inbound voice is switched off."), "inbound_block");
    assert.equal(reasonCode("Daily outbound cap of 1 is reached."), "daily_cap");
  } finally {
    mutate((db) => {
      db.channelMessages = (db.channelMessages ?? []).filter((row) => row.id !== messageId);
      db.frozenWorkspaces = priorFrozen;
      if (db.voiceSettings) {
        db.voiceSettings.killSwitch = priorKill;
        db.voiceSettings.dailyOutboundCap = priorCap;
        db.voiceSettings.blockInbound = priorBlock;
        db.voiceSettings.maxDiscountPercent = priorDiscount;
        db.voiceSettings.maxPlanMonths = priorMonths;
      }
      db.voiceLimitsByWorkspace = { ...(db.voiceLimitsByWorkspace ?? {}) };
      if (priorTriton) db.voiceLimitsByWorkspace.triton = priorTriton;
      else delete db.voiceLimitsByWorkspace.triton;
      if (priorAether) db.voiceLimitsByWorkspace.aether = priorAether;
      else delete db.voiceLimitsByWorkspace.aether;
    });
  }
});
