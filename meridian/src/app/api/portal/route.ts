import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";
import { fileComplaint } from "@/server/collections/complaint-store";
import { postAchPayment } from "@/server/collections/payments";
import { ensureValidationNotice, fileDispute, openPortal, portalAccount, sandboxPayment, setupPaymentPlan, validationPdfBase64 } from "@/server/collections/service";
import { assertSameOrigin } from "@/server/security";

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
  try {
    assertSameOrigin(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Cross-site request blocked" }, { status: 403 });
  }
  const body = (await request.json()) as {
    op?: string;
    workspaceId?: string;
    accountRef?: string;
    last4?: string;
    zip?: string;
    text?: string;
    amountCents?: number;
    months?: number;
    recurring?: boolean;
    accepted?: boolean;
    summary?: string;
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
    if (body.op === "ach") {
      const payment = await postAchPayment({
        workspaceId: account.workspaceId,
        accountId: account.id,
        amountCents: body.amountCents ?? Math.min(account.balanceCents, 2500),
        recurring: Boolean(body.recurring),
        accepted: Boolean(body.accepted),
      });
      return NextResponse.json({ payment, account: portalAccount(tokenFrom(request)) });
    }
    if (body.op === "complaint") {
      const complaint = fileComplaint(account.workspaceId, { channel: "portal", accountRef: account.accountRef, summary: body.summary ?? body.text, rootCause: "other" });
      return NextResponse.json({ complaintId: complaint.id, responseDueAt: complaint.responseDueAt });
    }
    if (body.op === "pay") {
      const payment = await sandboxPayment(account.workspaceId, account.id, body.amountCents ?? account.balanceCents);
      const paid = portalAccount(tokenFrom(request));
      return NextResponse.json({ payment, account: paid });
    }
    if (body.op === "plan") {
      const updated = setupPaymentPlan(account.workspaceId, account.id, body.months ?? 0, body.amountCents ?? 0);
      return NextResponse.json({ account: updated });
    }
    if (body.op === "notice") {
      const updated = ensureValidationNotice(account.workspaceId, account.id);
      const pdfBase64 = validationPdfBase64(account.workspaceId, account.id);
      return NextResponse.json({ account: updated, pdfBase64 });
    }
    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Portal request failed" }, { status: 400 });
  }
}
