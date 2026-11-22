import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/commerce";
import { revokeSession, seatFromRequest, sessionCookieOptions } from "@/server/auth";
import { selfHosted } from "@/server/self-hosted";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const seat = seatFromRequest(request);
  if (seat?.sessionId) revokeSession(seat.sessionId);
  const response = NextResponse.json({
    ok: true,
    next: selfHosted() ? "/cdn-cgi/access/logout" : "/login",
  });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return response;
}
