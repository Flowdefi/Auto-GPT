import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";
import { fileDispute, openPortal, portalAccount, sandboxPayment } from "@/server/collections/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE = "meridian_portal";

function tokenFrom(request: Request): string {
  const header = request.headers.get("cookie") ?? "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : "";
}

export async function GET(request: Request) {
  const account = portalAccount(tokenFrom(request));
  if (!account) return NextResponse.json({ error: "Sign in with your reference number" }, { status: 401 });
  return NextResponse.json({ account });
}

export async function POST(request: Request) {
  if (rateLimited(`portal:${clientIp(request)}`, 30, 60_000)) return tooMany();
  const body = (await request.json()) as {
    op?: string;
    workspaceId?: string;
    accountRef?: string;
    last4?: string;
    zip?: string;
    text?: string;
    amountCents?: number;
  };
  try {
    if (body.op === "lookup") {
      const workspaceId = isWorkspaceId(body.workspaceId) ? body.workspaceId : "triton";
      const opened = openPortal(workspaceId, body.accountRef ?? "", body.last4 ?? "", body.zip ?? "");
      const response = NextResponse.json({ account: opened.account });
      const secure = new URL(request.url).protocol === "https:";
      response.cookies.set(COOKIE, opened.token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 1800 });
      return response;
    }
    const account = portalAccount(tokenFrom(request));
    if (!account) return NextResponse.json({ error: "Lookup expired" }, { status: 401 });
    if (body.op === "dispute") {
      return NextResponse.json({ account: fileDispute(account.workspaceId, account.id, body.text ?? "I dispute this debt") });
    }
    if (body.op === "pay") {
      const payment = sandboxPayment(account.workspaceId, account.id, body.amountCents ?? account.balanceCents);
      const paid = portalAccount(tokenFrom(request));
      return NextResponse.json({ payment, account: paid });
    }
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Portal request failed" }, { status: 400 });
  }
}
