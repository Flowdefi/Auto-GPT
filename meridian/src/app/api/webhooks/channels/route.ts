import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { applyEmailEvent, applySmsKeyword, reconcileProviderPayment, webhookAccepted } from "@/server/collections/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const sandbox = request.headers.get("x-meridian-sandbox");
  const body = (await request.json()) as {
    workspaceId?: string;
    kind?: string;
    from?: string;
    keyword?: string;
    email?: string;
    providerId?: string;
  };
  const secretName =
    body.kind === "stripe" ? "STRIPE_WEBHOOK_SECRET" : body.kind === "lob" ? "LOB_WEBHOOK_SECRET" : body.kind?.startsWith("email") ? "SENDGRID_WEBHOOK_SECRET" : "TWILIO_AUTH_TOKEN";
  if (!webhookAccepted(sandbox, secretName)) {
    return NextResponse.json({ error: "Webhook signature missing" }, { status: 401 });
  }
  const workspaceId = isWorkspaceId(body.workspaceId) ? body.workspaceId : "triton";
  if (body.kind === "sms_stop" || body.kind === "sms_help") {
    return NextResponse.json(applySmsKeyword(workspaceId, body.from ?? "", body.keyword ?? (body.kind === "sms_help" ? "HELP" : "STOP")));
  }
  if (body.kind === "email_bounce" || body.kind === "email_unsubscribe") {
    applyEmailEvent(workspaceId, body.email ?? "", body.kind === "email_bounce" ? "bounce" : "unsubscribe");
    return NextResponse.json({ ok: true });
  }
  if (body.kind === "lob") return NextResponse.json({ ok: true, sandbox: true });
  if (body.kind === "stripe") {
    return NextResponse.json({ reconciled: reconcileProviderPayment(body.providerId ?? "") });
  }
  return NextResponse.json({ error: "Unknown webhook" }, { status: 400 });
}
