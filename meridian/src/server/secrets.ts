import { AsyncLocalStorage } from "async_hooks";
import { LIFETIME_PRICE_USD } from "@/lib/commerce";
import { decryptSecret, encryptSecret, randomId } from "./auth-crypto";
import { sqliteAll, sqliteGet, sqliteRun } from "./sqlite";

const store = new AsyncLocalStorage<{ accountId: string }>();

const ALLOWED_SECRET_NAMES = new Set([
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OLLAMA_BASE_URL",
  "RESEND_API_KEY",
  "AGENTMAIL_API_KEY",
  "SERP_PROVIDER_KEY",
  "SERP_PROVIDER_URL",
  "SERP_PROVIDER_NAME",
  "MS_CLIENT_SECRET",
  "MS_CLIENT_ID",
  "MS_TENANT_ID",
  "MS_MAILBOXES",
]);

export function enterAccountContext(accountId: string): void {
  store.enterWith({ accountId });
}

export function currentAccountId(): string | undefined {
  return store.getStore()?.accountId;
}

export function masterSecret(): string {
  const fromEnv = process.env.MERIDIAN_AUTH_SECRET ?? process.env.MERIDIAN_SECRET_KEY ?? "";
  if (fromEnv.length >= 32) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MERIDIAN_AUTH_SECRET must be at least 32 characters in production");
  }
  return `meridian-dev-only-secret-do-not-ship-${LIFETIME_PRICE_USD}-lifetime`;
}

export function assertSecretName(name: string): string {
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (!ALLOWED_SECRET_NAMES.has(clean)) {
    throw new Error(`Secret ${name} is not allowed. Use one of: ${[...ALLOWED_SECRET_NAMES].join(", ")}`);
  }
  return clean;
}

export function putWorkspaceSecret(accountId: string, workspaceId: string, name: string, value: string): void {
  const key = assertSecretName(name);
  const id = randomId("sec");
  const ciphertext = encryptSecret(value, masterSecret());
  const existing = sqliteGet(
    "SELECT id FROM workspace_secrets WHERE account_id = ? AND workspace_id = ? AND name = ?",
    accountId,
    workspaceId,
    key,
  );
  if (existing?.id) {
    sqliteRun(
      "UPDATE workspace_secrets SET ciphertext = ?, created_at = ? WHERE id = ?",
      ciphertext,
      new Date().toISOString(),
      String(existing.id),
    );
    return;
  }
  sqliteRun(
    "INSERT INTO workspace_secrets (id, account_id, workspace_id, name, ciphertext, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    accountId,
    workspaceId,
    key,
    ciphertext,
    new Date().toISOString(),
  );
}

export function deleteWorkspaceSecret(accountId: string, workspaceId: string, name: string): void {
  sqliteRun(
    "DELETE FROM workspace_secrets WHERE account_id = ? AND workspace_id = ? AND name = ?",
    accountId,
    workspaceId,
    assertSecretName(name),
  );
}

export function listWorkspaceSecrets(
  accountId: string,
  workspaceId?: string,
): Array<{ name: string; workspaceId: string; createdAt: string }> {
  const rows = workspaceId
    ? sqliteAll(
        "SELECT name, workspace_id AS workspaceId, created_at AS createdAt FROM workspace_secrets WHERE account_id = ? AND workspace_id = ? ORDER BY name",
        accountId,
        workspaceId,
      )
    : sqliteAll(
        "SELECT name, workspace_id AS workspaceId, created_at AS createdAt FROM workspace_secrets WHERE account_id = ? ORDER BY workspace_id, name",
        accountId,
      );
  return rows.map((row) => ({
    name: String(row.name),
    workspaceId: String(row.workspaceId),
    createdAt: String(row.createdAt),
  }));
}

export function readWorkspaceSecret(accountId: string, workspaceId: string, name: string): string | undefined {
  const row = sqliteGet(
    "SELECT ciphertext FROM workspace_secrets WHERE account_id = ? AND workspace_id = ? AND name = ?",
    accountId,
    workspaceId,
    name,
  );
  if (!row?.ciphertext) return undefined;
  try {
    return decryptSecret(String(row.ciphertext), masterSecret());
  } catch {
    return undefined;
  }
}

/** Env wins. Otherwise the signed-in account's stored BYOK value. */
export function resolveProviderSecret(name: string, workspaceId?: string): string | undefined {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  const accountId = currentAccountId();
  if (!accountId) return undefined;
  if (workspaceId) {
    const scoped = readWorkspaceSecret(accountId, workspaceId, name);
    if (scoped) return scoped;
  }
  const rows = sqliteAll(
    "SELECT ciphertext FROM workspace_secrets WHERE account_id = ? AND name = ? ORDER BY created_at DESC LIMIT 1",
    accountId,
    name,
  );
  const cipher = rows[0]?.ciphertext;
  if (!cipher) return undefined;
  try {
    return decryptSecret(String(cipher), masterSecret());
  } catch {
    return undefined;
  }
}
