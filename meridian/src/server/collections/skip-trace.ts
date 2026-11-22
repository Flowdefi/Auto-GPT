import type { WorkspaceId } from "@/lib/types";
import { encryptSecret } from "@/server/auth-crypto";
import { loadDb, mutate, nextId } from "@/server/db";
import { masterSecret } from "@/server/secrets";
import type { FetchLike } from "./providers";

export function skipTraceEnabled(): boolean {
  return process.env.MERIDIAN_SKIPTRACE_PROVIDER === "vendor" && process.env.MERIDIAN_CHANNEL_DELIVER === "live";
}

/** Sandbox returns no new contact data and does not call the network. */
export async function lookupSkipTrace(
  input: { lastName: string; state: string; zip: string },
  fetchImpl: FetchLike = fetch,
): Promise<{ sandbox: boolean; phoneLast4: string | null; phone: string | null; email: string | null; address: string | null }> {
  if (!skipTraceEnabled() || !process.env.MERIDIAN_SKIPTRACE_API_URL) {
    return { sandbox: true, phoneLast4: null, phone: null, email: null, address: null };
  }
  const response = await fetchImpl(process.env.MERIDIAN_SKIPTRACE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MERIDIAN_SKIPTRACE_API_KEY ? { Authorization: `Bearer ${process.env.MERIDIAN_SKIPTRACE_API_KEY}` } : {}),
    },
    body: JSON.stringify({ lastName: input.lastName.slice(0, 40), state: input.state, zip: input.zip }),
  });
  if (!response.ok) return { sandbox: false, phoneLast4: null, phone: null, email: null, address: null };
  const payload = (await response.json()) as { phone?: string; email?: string; address?: { line1?: string; city?: string; state?: string; zip?: string } };
  const digits = (payload.phone ?? "").replace(/\D/g, "");
  const line1 = payload.address?.line1?.trim().slice(0, 120) ?? "";
  const address = line1
    ? [line1, payload.address?.city?.trim().slice(0, 80) ?? "", payload.address?.state?.trim().slice(0, 2) ?? "", (payload.address?.zip ?? "").replace(/\D/g, "").slice(0, 9)].filter(Boolean).join(", ")
    : null;
  return {
    sandbox: false,
    phone: digits.length >= 10 ? digits.slice(-10) : null,
    phoneLast4: digits.length >= 4 ? digits.slice(-4) : null,
    email: payload.email && payload.email.includes("@") && !payload.email.includes(" ") ? payload.email.slice(0, 120) : null,
    address,
  };
}

/**
 * A newly found number is not consented and is not RND-cleared.
 * The compliance gate blocks the first cell or SMS use until both are stored.
 */
export async function applySkipTrace(workspaceId: WorkspaceId, accountId: string, fetchImpl?: FetchLike): Promise<{ updated: boolean; sandbox: boolean }> {
  const account = (loadDb().portfolioAccounts ?? []).find((item) => item.id === accountId && item.workspaceId === workspaceId);
  if (!account) throw new Error("Account not found");
  const found = await lookupSkipTrace(
    { lastName: account.consumerName.split(" ").slice(-1)[0] ?? account.consumerName, state: account.state, zip: account.zip },
    fetchImpl,
  );
  if (!found.phoneLast4 && !found.email && !found.address) return { updated: false, sandbox: found.sandbox };
  const secret = masterSecret();
  mutate((db) => {
    db.portfolioAccounts = (db.portfolioAccounts ?? []).map((item) => {
      if (item.id !== accountId) return item;
      return {
        ...item,
        phoneLast4: found.phoneLast4 ?? item.phoneLast4,
        phoneType: found.phoneLast4 ? "unknown" as const : item.phoneType,
        phoneCiphertext: found.phone ? encryptSecret(found.phone, secret) : item.phoneCiphertext,
        emailCiphertext: found.email ? encryptSecret(found.email, secret) : item.emailCiphertext,
        addressCiphertext: found.address ? encryptSecret(found.address, secret) : item.addressCiphertext,
        rndStatus: found.phoneLast4 ? "unknown" as const : item.rndStatus,
      };
    });
    db.consents = (db.consents ?? []).filter((row) => {
      if (row.accountId !== accountId) return true;
      if (found.phoneLast4 && (row.channel === "sms" || row.channel === "voice_cell")) return false;
      if (found.email && row.channel === "email") return false;
      return true;
    });
    const reason = found.phoneLast4
      ? "Skip-trace stored a new number. Cell and SMS consent were cleared and the reassigned-number result is unknown until a new check. TCPA and the FCC RND rule still block first use."
      : found.email
        ? "Skip-trace stored a new email. Email consent was cleared. The compliance gate still blocks the first send."
        : "Skip-trace stored a new mailing address. Letters still stop at the compliance gate.";
    db.complianceEvents = [
      {
        id: nextId("ce"),
        workspaceId,
        at: new Date().toISOString(),
        channel: found.phoneLast4 ? "sms" as const : "letter" as const,
        accountId,
        allowed: false,
        reason,
      },
      ...(db.complianceEvents ?? []),
    ].slice(0, 500);
  });
  return { updated: true, sandbox: found.sandbox };
}
