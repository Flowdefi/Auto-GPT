import { NextResponse } from "next/server";
import { requireAccount } from "@/server/api-guard";
import { decryptSecret, encryptSecret } from "@/server/auth-crypto";
import { masterSecret } from "@/server/secrets";
import { sqliteGet, sqliteRun } from "@/server/sqlite";
import { randomBase32, verifyTotp } from "@/server/totp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireAccount(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json()) as { code?: string };
  const existing = sqliteGet("SELECT secret_ciphertext, enabled FROM account_mfa WHERE account_id = ?", gate.account.id);
  if (!body.code) {
    const secret = randomBase32();
    const ciphertext = encryptSecret(secret, masterSecret());
    if (existing) {
      sqliteRun("UPDATE account_mfa SET secret_ciphertext = ?, enabled = 0 WHERE account_id = ?", ciphertext, gate.account.id);
    } else {
      sqliteRun("INSERT INTO account_mfa (account_id, secret_ciphertext, enabled) VALUES (?, ?, 0)", gate.account.id, ciphertext);
    }
    const label = encodeURIComponent(gate.account.email);
    return NextResponse.json({
      secret,
      otpauth: `otpauth://totp/Meridian:${label}?secret=${secret}&issuer=Meridian&digits=6&period=30`,
    });
  }
  if (!existing) return NextResponse.json({ error: "Start enrollment first" }, { status: 400 });
  const secret = decryptSecret(String(existing.secret_ciphertext), masterSecret());
  if (!verifyTotp(secret, body.code)) return NextResponse.json({ error: "Code did not match" }, { status: 400 });
  sqliteRun("UPDATE account_mfa SET enabled = 1 WHERE account_id = ?", gate.account.id);
  return NextResponse.json({ enabled: true });
}
