import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/commerce";
import { requireAccount } from "@/server/api-guard";
import { issueSessionCookie, publicAccount, sessionCookieOptions } from "@/server/auth";
import { redeemLicense } from "@/server/billing";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rateLimited(`redeem:${clientIp(request)}`, 10, 60_000)) return tooMany();
  const gate = await requireAccount(request);
  if (!gate.ok) return gate.response;
  let body: { key?: string };
  try {
    body = (await request.json()) as { key?: string };
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  try {
    const license = redeemLicense(gate.account, body.key ?? "");
    const session = issueSessionCookie(gate.account, request);
    const response = NextResponse.json({
      license: { id: license.id, prefix: license.prefix, kind: license.kind },
      account: publicAccount(gate.account, true),
      next: "/w/triton/home",
    });
    response.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not redeem license" },
      { status: 400 },
    );
  }
}
