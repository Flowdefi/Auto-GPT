import { cookies } from "next/headers";
import {
  API_KEY_PREFIX,
  PASSWORD_MIN,
  SESSION_COOKIE,
  SESSION_HOURS,
} from "@/lib/commerce";
import { hashPassword, hashSecret, keyPrefix, mintApiKey, randomId, signPayload, verifyPassword, verifySignedPayload } from "./auth-crypto";
import { clientIp } from "./rate-limit";
import { enterAccountContext, masterSecret } from "./secrets";
import { sqliteAll, sqliteGet, sqliteReady, sqliteRun } from "./sqlite";

export interface Account {
  id: string;
  email: string;
  name: string;
  role: "owner" | "member";
  status: "pending" | "active" | "locked";
  createdAt: string;
  lastLoginAt?: string;
}

export interface SessionClaims {
  v: 1;
  sid: string;
  aid: string;
  exp: number;
  seat: 0 | 1;
}

export interface Seat {
  account: Account;
  licensed: boolean;
  via: "session" | "api_key";
  sessionId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOCK_AFTER = 8;
const LOCK_MS = 15 * 60 * 1000;

function asAccount(row: Record<string, unknown>): Account {
  const role = row.role === "member" ? "member" : "owner";
  const status = row.status === "active" || row.status === "locked" ? row.status : "pending";
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    role,
    status,
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : undefined,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function assertEmail(email: string): string {
  const clean = normalizeEmail(email);
  if (!EMAIL_RE.test(clean) || clean.length > 180) {
    throw new Error("Enter a valid email address");
  }
  return clean;
}

export function assertPassword(password: string): string {
  if (password.length < PASSWORD_MIN) {
    throw new Error(`Password must be at least ${PASSWORD_MIN} characters`);
  }
  if (password.length > 128) {
    throw new Error("Password is too long");
  }
  if (!password.trim()) {
    throw new Error("Password cannot be blank");
  }
  return password;
}

export function accountById(id: string): Account | null {
  const row = sqliteGet("SELECT * FROM accounts WHERE id = ?", id);
  return row ? asAccount(row) : null;
}

export function accountByEmail(email: string): Account | null {
  const row = sqliteGet("SELECT * FROM accounts WHERE email = ?", normalizeEmail(email));
  return row ? asAccount(row) : null;
}

export function accountHasSeat(accountId: string): boolean {
  const row = sqliteGet(
    "SELECT id FROM licenses WHERE account_id = ? AND redeemed_at IS NOT NULL LIMIT 1",
    accountId,
  );
  return Boolean(row?.id);
}

export function markAccountActive(accountId: string): void {
  sqliteRun("UPDATE accounts SET status = 'active' WHERE id = ? AND status != 'locked'", accountId);
}

export function createAccount(input: { email: string; name: string; password: string }): Account {
  if (!sqliteReady()) throw new Error("Account store is unavailable");
  const email = assertEmail(input.email);
  if (accountByEmail(email)) throw new Error("An account with that email already exists");
  const password = assertPassword(input.password);
  const name = input.name.trim().slice(0, 80) || email.split("@")[0] || "Operator";
  const { hash, salt } = hashPassword(password);
  const id = randomId("acc");
  const now = new Date().toISOString();
  sqliteRun(
    `INSERT INTO accounts (id, email, name, password_hash, password_salt, role, status, failed_logins, created_at)
     VALUES (?, ?, ?, ?, ?, 'owner', 'pending', 0, ?)`,
    id,
    email,
    name,
    hash,
    salt,
    now,
  );
  const created = accountById(id);
  if (!created) throw new Error("Could not create account");
  return created;
}

export function authenticate(email: string, password: string): Account {
  if (!sqliteReady()) throw new Error("Account store is unavailable");
  const clean = assertEmail(email);
  const row = sqliteGet("SELECT * FROM accounts WHERE email = ?", clean);
  if (!row) throw new Error("Email or password is incorrect");
  const lockedUntil = row.locked_until ? Date.parse(String(row.locked_until)) : 0;
  if (lockedUntil && lockedUntil > Date.now()) {
    throw new Error("This account is locked. Try again in a few minutes.");
  }
  const ok = verifyPassword(password, String(row.password_hash), String(row.password_salt));
  if (!ok) {
    const fails = Number(row.failed_logins ?? 0) + 1;
    const lock = fails >= LOCK_AFTER ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    sqliteRun("UPDATE accounts SET failed_logins = ?, locked_until = ? WHERE id = ?", fails, lock, String(row.id));
    throw new Error("Email or password is incorrect");
  }
  sqliteRun(
    "UPDATE accounts SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?",
    new Date().toISOString(),
    String(row.id),
  );
  return asAccount(row);
}

function encodeClaims(claims: SessionClaims): string {
  return Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
}

function decodeClaims(payload: string): SessionClaims | null {
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
    if (parsed.v !== 1 || !parsed.sid || !parsed.aid || !parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function issueSessionCookie(account: Account, request?: Request): { cookie: string; claims: SessionClaims } {
  const sid = randomId("ses");
  const now = Date.now();
  const exp = now + SESSION_HOURS * 60 * 60 * 1000;
  const licensed = accountHasSeat(account.id);
  const claims: SessionClaims = { v: 1, sid, aid: account.id, exp, seat: licensed ? 1 : 0 };
  const token = signPayload(encodeClaims(claims), masterSecret());
  sqliteRun(
    "INSERT INTO sessions (id, account_id, token_hash, expires_at, created_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)",
    sid,
    account.id,
    hashSecret(token),
    new Date(exp).toISOString(),
    new Date(now).toISOString(),
    request ? clientIp(request) : null,
    request?.headers.get("user-agent")?.slice(0, 300) ?? null,
  );
  return { cookie: token, claims };
}

export function sessionCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: "/";
  secure: boolean;
  maxAge: number;
} {
  const publicUrl = process.env.MERIDIAN_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: publicUrl.startsWith("https://") || process.env.NODE_ENV === "production",
    maxAge: SESSION_HOURS * 60 * 60,
  };
}

export function revokeSession(sessionId: string): void {
  sqliteRun("DELETE FROM sessions WHERE id = ?", sessionId);
}

export function revokeAccountSessions(accountId: string): void {
  sqliteRun("DELETE FROM sessions WHERE account_id = ?", accountId);
}

export function readSeatFromCookie(raw: string | undefined | null): Promise<Seat | null> {
  return Promise.resolve(seatFromCookie(raw));
}

export function seatFromCookie(raw: string | undefined | null): Seat | null {
  if (!raw) return null;
  if (!sqliteReady()) return null;
  const payload = verifySignedPayload(raw, masterSecret());
  if (!payload) return null;
  const claims = decodeClaims(payload);
  if (!claims || claims.exp < Date.now()) return null;
  const session = sqliteGet("SELECT id, account_id, expires_at FROM sessions WHERE id = ?", claims.sid);
  if (!session || String(session.account_id) !== claims.aid) return null;
  if (Date.parse(String(session.expires_at)) < Date.now()) {
    sqliteRun("DELETE FROM sessions WHERE id = ?", claims.sid);
    return null;
  }
  const account = accountById(claims.aid);
  if (!account || account.status === "locked") return null;
  const licensed = accountHasSeat(account.id);
  enterAccountContext(account.id);
  return { account, licensed, via: "session", sessionId: claims.sid };
}

function seatFromApiKey(token: string): Seat | null {
  if (!sqliteReady()) return null;
  if (!token.startsWith(API_KEY_PREFIX)) return null;
  const row = sqliteGet(
    "SELECT id, account_id FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL",
    hashSecret(token),
  );
  if (!row?.account_id) return null;
  const account = accountById(String(row.account_id));
  if (!account || account.status === "locked") return null;
  if (!accountHasSeat(account.id)) return null;
  sqliteRun("UPDATE api_keys SET last_used_at = ? WHERE id = ?", new Date().toISOString(), String(row.id));
  enterAccountContext(account.id);
  return { account, licensed: true, via: "api_key" };
}

export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization") ?? request.headers.get("x-api-key");
  if (!header) return undefined;
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
}

export function seatFromRequest(request: Request): Seat | null {
  const fromKey = bearerToken(request);
  if (fromKey) {
    const viaKey = seatFromApiKey(fromKey);
    if (viaKey) return viaKey;
  }
  const cookie = readCookieHeader(request, SESSION_COOKIE);
  return seatFromCookie(cookie);
}

function readCookieHeader(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function seatFromNextCookies(): Promise<Seat | null> {
  const jar = await cookies();
  return seatFromCookie(jar.get(SESSION_COOKIE)?.value);
}

export function createApiKey(accountId: string, name: string): { id: string; key: string; prefix: string } {
  if (!accountHasSeat(accountId)) throw new Error("Buy a lifetime seat before creating API keys");
  const label = name.trim().slice(0, 60) || "Default";
  const key = mintApiKey();
  const id = randomId("key");
  sqliteRun(
    "INSERT INTO api_keys (id, account_id, name, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    accountId,
    label,
    hashSecret(key),
    keyPrefix(key, 16),
    new Date().toISOString(),
  );
  return { id, key, prefix: keyPrefix(key, 16) };
}

export function listApiKeys(accountId: string): Array<{
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
  revoked: boolean;
}> {
  return sqliteAll(
    "SELECT id, name, key_prefix AS prefix, created_at AS createdAt, last_used_at AS lastUsedAt, revoked_at AS revokedAt FROM api_keys WHERE account_id = ? ORDER BY created_at DESC",
    accountId,
  ).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    prefix: String(row.prefix),
    createdAt: String(row.createdAt),
    lastUsedAt: row.lastUsedAt ? String(row.lastUsedAt) : undefined,
    revoked: Boolean(row.revokedAt),
  }));
}

export function revokeApiKey(accountId: string, keyId: string): void {
  sqliteRun(
    "UPDATE api_keys SET revoked_at = ? WHERE id = ? AND account_id = ? AND revoked_at IS NULL",
    new Date().toISOString(),
    keyId,
    accountId,
  );
}

export function publicAccount(account: Account, licensed: boolean) {
  return {
    id: account.id,
    email: account.email,
    name: account.name,
    role: account.role,
    status: account.status,
    licensed,
    createdAt: account.createdAt,
  };
}
