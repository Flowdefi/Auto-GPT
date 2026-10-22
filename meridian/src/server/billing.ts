import { createHmac } from "crypto";
import { LIFETIME_PRICE_CENTS, LIFETIME_PRICE_USD, LICENSE_KEY_PREFIX } from "@/lib/commerce";
import { hashSecret, keyPrefix, mintLicenseKey, randomId, safeEqual } from "./auth-crypto";
import { accountByEmail, accountById, markAccountActive, type Account } from "./auth";
import { publicBaseUrl } from "./mailer";
import { sqliteAll, sqliteGet, sqliteRun } from "./sqlite";

export interface LicenseRecord {
  id: string;
  prefix: string;
  kind: "polar" | "minted";
  email?: string;
  accountId?: string;
  redeemedAt?: string;
  createdAt: string;
  polarOrderId?: string;
}

function asLicense(row: Record<string, unknown>): LicenseRecord {
  return {
    id: String(row.id),
    prefix: String(row.key_prefix ?? row.prefix ?? ""),
    kind: row.kind === "polar" ? "polar" : "minted",
    email: row.email ? String(row.email) : undefined,
    accountId: row.account_id ? String(row.account_id) : undefined,
    redeemedAt: row.redeemed_at ? String(row.redeemed_at) : undefined,
    createdAt: String(row.created_at ?? ""),
    polarOrderId: row.polar_order_id ? String(row.polar_order_id) : undefined,
  };
}

export function polarConfigured(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_ID);
}

export function polarBaseUrl(): string {
  const server = (process.env.POLAR_SERVER ?? "production").toLowerCase();
  return server === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";
}

export function createLicense(input: {
  kind: "polar" | "minted";
  email?: string;
  accountId?: string;
  polarOrderId?: string;
  notes?: string;
  plaintext?: string;
}): { license: LicenseRecord; key: string } {
  const key = input.plaintext ?? mintLicenseKey();
  if (!key.startsWith(LICENSE_KEY_PREFIX)) {
    throw new Error("License keys must use the mdl_ prefix");
  }
  const id = randomId("lic");
  const now = new Date().toISOString();
  sqliteRun(
    `INSERT INTO licenses (id, key_hash, key_prefix, kind, email, account_id, redeemed_at, created_at, polar_order_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    hashSecret(key),
    keyPrefix(key, 12),
    input.kind,
    input.email?.toLowerCase() ?? null,
    input.accountId ?? null,
    input.accountId ? now : null,
    now,
    input.polarOrderId ?? null,
    input.notes ?? null,
  );
  if (input.accountId) markAccountActive(input.accountId);
  const row = sqliteGet("SELECT * FROM licenses WHERE id = ?", id);
  if (!row) throw new Error("Could not create license");
  return { license: asLicense(row), key };
}

export function redeemLicense(account: Account, rawKey: string): LicenseRecord {
  const key = rawKey.trim();
  if (!key.startsWith(LICENSE_KEY_PREFIX) || key.length < 20) {
    throw new Error("That does not look like a Meridian license key");
  }
  const row = sqliteGet("SELECT * FROM licenses WHERE key_hash = ?", hashSecret(key));
  if (!row) throw new Error("License key is not valid");
  if (row.account_id && String(row.account_id) !== account.id) {
    throw new Error("This license is already attached to another account");
  }
  if (row.email && String(row.email).toLowerCase() !== account.email) {
    throw new Error("This license was issued to a different email");
  }
  const now = new Date().toISOString();
  sqliteRun("UPDATE licenses SET account_id = ?, redeemed_at = ? WHERE id = ?", account.id, now, String(row.id));
  markAccountActive(account.id);
  const updated = sqliteGet("SELECT * FROM licenses WHERE id = ?", String(row.id));
  if (!updated) throw new Error("Could not redeem license");
  return asLicense(updated);
}

export function licensesForAccount(accountId: string): LicenseRecord[] {
  return sqliteAll(
    "SELECT * FROM licenses WHERE account_id = ? ORDER BY created_at DESC",
    accountId,
  ).map(asLicense);
}

export function claimReservedLicense(account: Account): LicenseRecord | null {
  const row = sqliteGet(
    "SELECT * FROM licenses WHERE email = ? AND account_id IS NULL ORDER BY created_at DESC LIMIT 1",
    account.email.toLowerCase(),
  );
  if (!row) return null;
  const now = new Date().toISOString();
  sqliteRun("UPDATE licenses SET account_id = ?, redeemed_at = ? WHERE id = ?", account.id, now, String(row.id));
  markAccountActive(account.id);
  const updated = sqliteGet("SELECT * FROM licenses WHERE id = ?", String(row.id));
  return updated ? asLicense(updated) : null;
}

export function unusedLicenseForEmail(email: string): LicenseRecord | null {
  const row = sqliteGet(
    "SELECT * FROM licenses WHERE email = ? AND account_id IS NULL ORDER BY created_at DESC LIMIT 1",
    email.toLowerCase(),
  );
  return row ? asLicense(row) : null;
}

export async function createPolarCheckout(account: Account): Promise<{ url: string; id?: string }> {
  const token = process.env.POLAR_ACCESS_TOKEN;
  const productId = process.env.POLAR_PRODUCT_ID;
  if (!token || !productId) {
    throw new Error(
      `Polar is not configured. Redeem a minted key (npm run license:mint) or set POLAR_ACCESS_TOKEN and POLAR_PRODUCT_ID for the $${LIFETIME_PRICE_USD} lifetime product.`,
    );
  }
  const success = `${publicBaseUrl()}/billing?checkout_id={CHECKOUT_ID}`;
  const body = {
    products: [productId],
    success_url: success,
    customer_email: account.email,
    metadata: {
      accountId: account.id,
      email: account.email,
      sku: "meridian-lifetime-seat",
    },
  };
  const response = await fetch(`${polarBaseUrl()}/v1/checkouts/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Polar checkout failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  const payload = (await response.json()) as { url?: string; id?: string };
  if (!payload.url) throw new Error("Polar did not return a checkout URL");
  return { url: payload.url, id: payload.id };
}

function webhookSecretBytes(secret: string): Buffer {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice(6), "base64");
  }
  return Buffer.from(secret);
}

export function verifyPolarWebhook(request: Request, rawBody: string): boolean {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signatures = request.headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;
  const expected = createHmac("sha256", webhookSecretBytes(secret)).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return signatures.split(" ").some((part) => {
    const value = part.includes(",") ? part.split(",")[1] : part;
    return Boolean(value && safeEqual(value, expected));
  });
}

function recordEvent(kind: string, payload: unknown): void {
  sqliteRun(
    "INSERT INTO billing_events (id, kind, payload, at) VALUES (?, ?, ?, ?)",
    randomId("bev"),
    kind,
    JSON.stringify(payload).slice(0, 8000),
    new Date().toISOString(),
  );
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function extractOrder(payload: Record<string, unknown>): {
  orderId?: string;
  email?: string;
  accountId?: string;
  productId?: string;
  amount?: number;
} {
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const customer = (data.customer ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? payload.metadata ?? {}) as Record<string, unknown>;
  const product = (data.product ?? {}) as Record<string, unknown>;
  return {
    orderId: pickString(data.id) ?? pickString(data.order_id),
    email: pickString(customer.email) ?? pickString(data.customer_email) ?? pickString(metadata.email),
    accountId: pickString(metadata.accountId) ?? pickString(metadata.account_id),
    productId: pickString(product.id) ?? pickString(data.product_id),
    amount: typeof data.amount === "number" ? data.amount : undefined,
  };
}

export function grantLifetimeFromPolar(payload: Record<string, unknown>): LicenseRecord {
  const order = extractOrder(payload);
  const expectedProduct = process.env.POLAR_PRODUCT_ID;
  if (expectedProduct && order.productId && order.productId !== expectedProduct) {
    throw new Error("Webhook product does not match POLAR_PRODUCT_ID");
  }
  if (order.amount != null && order.amount > 0 && order.amount < LIFETIME_PRICE_CENTS) {
    throw new Error(`Lifetime seat is $${LIFETIME_PRICE_USD}; webhook amount was too low`);
  }
  if (order.orderId) {
    const existing = sqliteGet("SELECT * FROM licenses WHERE polar_order_id = ?", order.orderId);
    if (existing) return asLicense(existing);
  }
  const account =
    (order.accountId ? accountById(order.accountId) : null) ??
    (order.email ? accountByEmail(order.email) : null);
  const minted = createLicense({
    kind: "polar",
    email: account?.email ?? order.email,
    accountId: account?.id,
    polarOrderId: order.orderId,
    notes: "Polar lifetime seat",
  });
  recordEvent("polar.granted", { orderId: order.orderId, accountId: account?.id, email: order.email });
  return minted.license;
}

export function applyPolarEvent(payload: Record<string, unknown>): { handled: boolean; license?: LicenseRecord } {
  const type = pickString(payload.type) ?? "";
  const data = (payload.data ?? {}) as Record<string, unknown>;
  const status = pickString(data.status);
  recordEvent(type || "polar.unknown", payload);
  const grant =
    type === "order.created" ||
    type === "order.paid" ||
    (type === "checkout.updated" && (status === "succeeded" || status === "confirmed"));
  if (!grant) return { handled: false };
  return { handled: true, license: grantLifetimeFromPolar(payload) };
}

export function billingStatus(account: Account) {
  const licenses = licensesForAccount(account.id);
  return {
    priceUsd: LIFETIME_PRICE_USD,
    label: "Lifetime seat — one operator, forever",
    licensed: licenses.some((row) => Boolean(row.redeemedAt)),
    polar: polarConfigured(),
    licenses: licenses.map((row) => ({
      id: row.id,
      prefix: row.prefix,
      kind: row.kind,
      redeemedAt: row.redeemedAt,
      createdAt: row.createdAt,
    })),
    reserved: unusedLicenseForEmail(account.email)
      ? { email: account.email, hint: "A purchased license is waiting to be redeemed for this email." }
      : null,
  };
}
