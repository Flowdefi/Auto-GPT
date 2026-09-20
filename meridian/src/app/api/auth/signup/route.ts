import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/commerce";
import { accountHasSeat, createAccount, issueSessionCookie, publicAccount, sessionCookieOptions } from "@/server/auth";
import { claimReservedLicense } from "@/server/billing";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rateLimited(`signup:${clientIp(request)}`, 8, 60_000)) return tooMany();
  let body: { email?: string; name?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; name?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  try {
    const account = createAccount({
      email: body.email ?? "",
      name: body.name ?? "",
      password: body.password ?? "",
    });
    claimReservedLicense(account);
    const licensed = accountHasSeat(account.id);
    const session = issueSessionCookie(account, request);
    const response = NextResponse.json({
      account: publicAccount(account, licensed),
      next: licensed ? "/w/triton/home" : "/billing",
    });
    response.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create account" },
      { status: 400 },
    );
  }
}
