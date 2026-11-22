import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/commerce";
import { accessSessionEmail, verifyCloudflareAccessJwt } from "@/server/access";
import { accountHasSeat, ensureOwnerAccount, issueSessionCookie, sessionCookieOptions } from "@/server/auth";
import { isOwnerEmail } from "@/server/owner-policy";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";
import { selfHosted } from "@/server/self-hosted";
import { safeNextPath } from "@/server/self-host-routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect(request: Request, error: string): NextResponse {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  if (!selfHosted()) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "access");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  if (rateLimited(`access:${clientIp(request)}`, 30, 60_000)) return tooMany();
  const jwt = request.headers.get("cf-access-jwt-assertion")?.trim() ?? "";
  if (!jwt) return loginRedirect(request, "access");
  let verdict;
  try {
    verdict = await verifyCloudflareAccessJwt(jwt);
  } catch {
    return loginRedirect(request, "access");
  }
  const email = accessSessionEmail(verdict);
  if (!email) return loginRedirect(request, "access");
  if (!isOwnerEmail(email)) return loginRedirect(request, "denied");
  const account = ensureOwnerAccount(email);
  accountHasSeat(account.id);
  const session = issueSessionCookie(account, request);
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(SESSION_COOKIE, session.cookie, sessionCookieOptions());
  return response;
}
