import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import { API_KEY_PREFIX, LICENSE_KEY_PREFIX } from "@/lib/commerce";

const SCRYPT = { N: 16_384, r: 8, p: 1 } as const;
const KEY_LEN = 32;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomId(prefix: string, bytes = 12): string {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN, SCRYPT).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const next = scryptSync(password, salt, KEY_LEN, SCRYPT);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function hashSecret(value: string): string {
  return sha256Hex(value);
}

export function mintLicenseKey(): string {
  return `${LICENSE_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function mintApiKey(): string {
  return `${API_KEY_PREFIX}${randomBytes(24).toString("hex")}`;
}

export function keyPrefix(value: string, keep = 12): string {
  return value.slice(0, keep);
}

export function signPayload(payload: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function verifySignedPayload(token: string, secret: string): string | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return null;
  const payload = token.slice(0, lastDot);
  const mac = token.slice(lastDot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return payload;
}

function aesKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(blob: string, secret: string): string {
  const [ivB64, tagB64, dataB64] = blob.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Corrupt secret");
  const decipher = createDecipheriv("aes-256-gcm", aesKey(secret), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64url")), decipher.final()]).toString("utf8");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
