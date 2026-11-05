import { createHmac, timingSafeEqual, verify as verifySignature } from "node:crypto";
import type { WorkspaceId } from "@/lib/types";
import { decryptSecret, encryptSecret } from "@/server/auth-crypto";
import { loadDb, mutate } from "@/server/db";
import { masterSecret } from "@/server/secrets";
import type { FetchLike } from "./providers";

export function voiceLiveEnabled(): boolean {
  return process.env.MERIDIAN_VOICE_LIVE === "enabled" && process.env.MERIDIAN_CHANNEL_DELIVER === "live";
}

export function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string | null, token = process.env.TWILIO_AUTH_TOKEN ?? ""): boolean {
  if (!signature || !token) return false;
  const payload = Object.keys(params).sort().reduce((sum, key) => sum + key + (params[key] ?? ""), url);
  const digest = createHmac("sha1", token).update(payload).digest("base64");
  const left = Buffer.from(digest);
  const right = Buffer.from(signature);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Telnyx signs `${timestamp}|${body}` with ed25519. The public key is a PEM. */
export function verifyTelnyxSignature(body: string, timestamp: string | null, signature: string | null, publicKey = process.env.TELNYX_PUBLIC_KEY ?? ""): boolean {
  if (!body || !timestamp || !signature || !publicKey) return false;
  try {
    return verifySignature(null, Buffer.from(`${timestamp}|${body}`), publicKey, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export async function dialVoice(
  input: { to: string; callId: string },
  fetchImpl: FetchLike = fetch,
): Promise<{ sandbox: boolean; provider: string; providerId: string | null; realtime: { model: string; connectUrl: string | null } }> {
  const live = voiceLiveEnabled();
  const model = live ? process.env.OPENAI_REALTIME_MODEL || process.env.MERIDIAN_REALTIME_MODEL || "gpt-realtime" : "sandbox";
  const connectUrl = live ? process.env.MERIDIAN_REALTIME_URL || process.env.OPENAI_REALTIME_URL || null : null;
  if (!live) {
    return { sandbox: true, provider: "sandbox", providerId: null, realtime: { model: "sandbox", connectUrl: null } };
  }
  const provider = process.env.MERIDIAN_SMS_PROVIDER === "telnyx" ? "telnyx" : "twilio";
  if (provider === "twilio") {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from || !input.to) throw new Error("Twilio voice keys or destination are missing");
    const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: input.to, From: from, Url: `${process.env.MERIDIAN_PUBLIC_URL || ""}/api/webhooks/voice` }),
    });
    if (!response.ok) throw new Error(`Twilio voice failed (${response.status})`);
    const payload = (await response.json()) as { sid?: string };
    return { sandbox: false, provider: "twilio", providerId: payload.sid ?? null, realtime: { model, connectUrl } };
  }
  const key = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_FROM;
  if (!key || !from || !input.to) throw new Error("Telnyx voice keys or destination are missing");
  const response = await fetchImpl("https://api.telnyx.com/v2/calls", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: input.to, from, connection_id: process.env.TELNYX_CONNECTION_ID || "", client_state: input.callId }),
  });
  if (!response.ok) throw new Error(`Telnyx voice failed (${response.status})`);
  const payload = (await response.json()) as { data?: { call_control_id?: string } };
  return { sandbox: false, provider: "telnyx", providerId: payload.data?.call_control_id ?? null, realtime: { model, connectUrl } };
}

/** Outbound calls stay on the sandbox console unless live voice is enabled and a stored number exists. */
export async function attachLiveDial(callId: string, fetchImpl: FetchLike = fetch): Promise<{ sandbox: boolean; provider: string }> {
  const call = (loadDb().voiceCalls ?? []).find((item) => item.id === callId);
  if (!call || call.direction !== "outbound" || call.blockedReason || !voiceLiveEnabled()) {
    return { sandbox: true, provider: call?.provider ?? "sandbox" };
  }
  const account = call.accountId ? (loadDb().portfolioAccounts ?? []).find((item) => item.id === call.accountId) : undefined;
  const stored = account?.phoneCiphertext ? decryptSecret(account.phoneCiphertext, masterSecret()) : "";
  const digits = stored.replace(/\D/g, "");
  if (digits.length < 10) return { sandbox: true, provider: "sandbox" };
  const dialed = await dialVoice({ to: digits.length === 10 ? `+1${digits}` : `+${digits}`, callId }, fetchImpl);
  mutate((db) => {
    db.voiceCalls = (db.voiceCalls ?? []).map((item) =>
      item.id === callId ? { ...item, provider: dialed.provider, providerId: dialed.providerId, updatedAt: new Date().toISOString() } : item,
    );
  });
  return { sandbox: dialed.sandbox, provider: dialed.provider };
}

export function applyCallStatus(input: { providerId: string; status: string; workspaceId?: WorkspaceId }): boolean {
  let found = false;
  mutate((db) => {
    db.voiceCalls = (db.voiceCalls ?? []).map((call) => {
      if (call.providerId !== input.providerId) return call;
      found = true;
      const ended = ["completed", "busy", "failed", "no-answer", "canceled", "hangup"].includes(input.status);
      return { ...call, phase: ended ? "ended" : call.phase, disposition: input.status, updatedAt: new Date().toISOString() };
    });
  });
  return found;
}

export function storeCallRecording(providerId: string, audio: Uint8Array): boolean {
  if (audio.byteLength === 0 || audio.byteLength > 5_000_000) return false;
  const ciphertext = encryptSecret(Buffer.from(audio).toString("base64"), masterSecret());
  let found = false;
  mutate((db) => {
    db.voiceCalls = (db.voiceCalls ?? []).map((call) => {
      if (call.providerId !== providerId) return call;
      found = true;
      return { ...call, recordingCiphertext: ciphertext, updatedAt: new Date().toISOString() };
    });
  });
  return found;
}

export async function hangupActiveCalls(fetchImpl: FetchLike = fetch, workspaceId?: WorkspaceId): Promise<number> {
  const active = (loadDb().voiceCalls ?? []).filter((call) => call.phase !== "ended" && !call.blockedReason && (!workspaceId || call.workspaceId === workspaceId));
  const now = new Date().toISOString();
  const ending = new Set(active.map((call) => call.id));
  mutate((db) => {
    db.voiceCalls = (db.voiceCalls ?? []).map((call) => (ending.has(call.id) ? { ...call, phase: "ended", disposition: "kill_switch", updatedAt: now } : call));
  });
  if (voiceLiveEnabled()) {
    for (const call of active) {
      if (!call.providerId) continue;
      if (call.provider === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls/${call.providerId}.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ Status: "completed" }),
        });
      }
      if (call.provider === "telnyx" && process.env.TELNYX_API_KEY) {
        await fetchImpl(`https://api.telnyx.com/v2/calls/${call.providerId}/actions/hangup`, {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.TELNYX_API_KEY}`, "Content-Type": "application/json" },
          body: "{}",
        });
      }
    }
  }
  return active.length;
}
