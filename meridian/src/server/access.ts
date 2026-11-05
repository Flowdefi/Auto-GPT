import { createPublicKey, createVerify, type JsonWebKey, type KeyObject } from "node:crypto";

const SKEW_MS = 60_000;
const CERT_TTL_MS = 10 * 60_000;

export type AccessVerdict =
  | { ok: true; email: string }
  | { ok: true; email: null; serviceToken: true }
  | { ok: false };

interface CertCache {
  at: number;
  keys: Map<string, KeyObject>;
}

let certCache: CertCache | null = null;

export function accessTeamHost(): string | null {
  const raw = (process.env.MERIDIAN_CF_ACCESS_TEAM_DOMAIN ?? "").trim().toLowerCase();
  if (!raw) return null;
  const host = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9.-]+$/.test(host) || !host.includes(".")) return null;
  return host;
}

export function accessAudience(): string | null {
  const audience = (process.env.MERIDIAN_CF_ACCESS_AUD ?? "").trim();
  return audience || null;
}

export function accessConfigured(): boolean {
  return Boolean(accessTeamHost() && accessAudience());
}

function decodePart(segment: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function audienceMatches(audience: unknown, expected: string): boolean {
  if (typeof audience === "string") return audience === expected;
  if (!Array.isArray(audience)) return false;
  return audience.some((item) => item === expected);
}

function emailClaim(payload: Record<string, unknown>): string | null {
  if (typeof payload.email !== "string") return null;
  const email = payload.email.trim().toLowerCase();
  if (!email.includes("@") || email.length > 180 || /\s/.test(email)) return null;
  return email;
}

export function verifyAccessJwt(
  token: string,
  input: { audience: string; issuer: string; keys: ReadonlyMap<string, KeyObject>; now?: number },
): AccessVerdict {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false };
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) return { ok: false };
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);
  if (!header || !payload) return { ok: false };
  if (header.alg !== "RS256") return { ok: false };
  const kid = typeof header.kid === "string" ? header.kid : "";
  const key = kid ? input.keys.get(kid) : undefined;
  if (!key) return { ok: false };
  let signature: Buffer;
  try {
    signature = Buffer.from(encodedSignature, "base64url");
  } catch {
    return { ok: false };
  }
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  if (!verifier.verify(key, signature)) return { ok: false };

  const now = input.now ?? Date.now();
  const exp = typeof payload.exp === "number" ? payload.exp : NaN;
  if (!Number.isFinite(exp) || exp * 1000 + SKEW_MS < now) return { ok: false };
  if (typeof payload.nbf === "number" && payload.nbf * 1000 - SKEW_MS > now) return { ok: false };
  if (payload.iss !== input.issuer) return { ok: false };
  if (!audienceMatches(payload.aud, input.audience)) return { ok: false };

  const email = emailClaim(payload);
  if (!email) return { ok: true, email: null, serviceToken: true };
  return { ok: true, email };
}

/** UI sessions require a verified email. Service tokens and bad signatures do not. */
export function accessSessionEmail(verdict: AccessVerdict): string | null {
  if (!verdict.ok || !verdict.email) return null;
  return verdict.email;
}

function publicKeyFromJwk(jwk: { kid?: string; kty?: string; n?: string; e?: string }): KeyObject | null {
  if (jwk.kty !== "RSA" || !jwk.kid || !jwk.n || !jwk.e) return null;
  try {
    const webKey: JsonWebKey = { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true };
    return createPublicKey({ key: webKey, format: "jwk" });
  } catch {
    return null;
  }
}

export async function accessPublicKeys(host: string, force = false): Promise<Map<string, KeyObject>> {
  if (!force && certCache && Date.now() - certCache.at < CERT_TTL_MS) return certCache.keys;
  const response = await fetch(`https://${host}/cdn-cgi/access/certs`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load Cloudflare Access certificates");
  const body = (await response.json()) as { keys?: Array<{ kid?: string; kty?: string; n?: string; e?: string }> };
  const keys = new Map<string, KeyObject>();
  for (const jwk of body.keys ?? []) {
    const key = publicKeyFromJwk(jwk);
    if (key && jwk.kid) keys.set(jwk.kid, key);
  }
  certCache = { at: Date.now(), keys };
  return keys;
}

export async function verifyCloudflareAccessJwt(token: string): Promise<AccessVerdict> {
  const host = accessTeamHost();
  const audience = accessAudience();
  if (!host || !audience || !token.trim()) return { ok: false };
  const issuer = `https://${host}`;
  let keys = await accessPublicKeys(host);
  let verdict = verifyAccessJwt(token, { audience, issuer, keys });
  if (verdict.ok) return verdict;
  const header = decodePart(token.split(".")[0] ?? "");
  const kid = typeof header?.kid === "string" ? header.kid : "";
  if (kid && !keys.has(kid)) {
    keys = await accessPublicKeys(host, true);
    verdict = verifyAccessJwt(token, { audience, issuer, keys });
  }
  return verdict;
}
