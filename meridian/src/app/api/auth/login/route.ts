import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/commerce";
import { accountById, accountHasSeat, authenticate, issueSessionCookie, publicAccount, sessionCookieOptions } from "@/server/auth";
import { decryptSecret } from "@/server/auth-crypto";
import { masterSecret } from "@/server/secrets";
import { sqliteGet } from "@/server/sqlite";
import { verifyTotp } from "@/server/totp";
import { claimReservedLicense } from "@/server/billing";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rateLimited(`login:${clientIp(request)}`, 8, 60_000)) return tooMany();
  let body: { email?: string; password?: string; code?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  try {
    const account = authenticate(body.email ?? "", body.password ?? "");
    const mfa = sqliteGet("SELECT secret_ciphertext, enabled FROM account_mfa WHERE account_id = ?", account.id);
    if (mfa && Number(mfa.enabled) === 1) {
      const secret = decryptSecret(String(mfa.secret_ciphertext), masterSecret());
      if (!body.code || !verifyTotp(secret, body.code)) {
        return NextResponse.json({ error: "Authenticator code required", mfaRequired: true }, { status: 401 });
      }
    }
    claimReservedLicense(account);
    const licensed = accountHasSeat(account.id);
    const fresh = accountById(account.id) ?? account;
    const session = issueSessionCookie(fresh, request);
    const response = NextResponse.json({
      account: publicAccount(fresh, licensed),
      next: licensed ? "/w/triton/home" : "/billing",
    });
    response.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sign in" },
      { status: 401 },
    );
  }
}
