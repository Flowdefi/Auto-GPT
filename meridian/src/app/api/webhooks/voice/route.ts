import { NextResponse } from "next/server";
import { applyCallStatus, storeCallRecording, verifyTelnyxSignature, verifyTwilioSignature } from "@/server/collections/voice-live";
import { webhookAccepted } from "@/server/collections/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = await request.text();
  const sandbox = request.headers.get("x-meridian-sandbox");
  const params = Object.fromEntries(new URLSearchParams(raw).entries());
  const twilioOk = verifyTwilioSignature(request.url, params, request.headers.get("x-twilio-signature"));
  const telnyxOk = verifyTelnyxSignature(raw, request.headers.get("telnyx-timestamp"), request.headers.get("telnyx-signature-ed25519"));
  if (!webhookAccepted(sandbox, "TWILIO_AUTH_TOKEN") && !twilioOk && !telnyxOk) {
    return NextResponse.json({ error: "Voice webhook signature missing" }, { status: 401 });
  }
  let body: { providerId?: string; status?: string; recordingBase64?: string } = {};
  try {
    body = JSON.parse(raw) as typeof body;
  } catch {
    body = { providerId: params.CallSid || params.call_control_id, status: params.CallStatus || params.status };
  }
  if (!body.providerId) return NextResponse.json({ error: "providerId required" }, { status: 400 });
  const updated = applyCallStatus({ providerId: body.providerId, status: body.status || "in-progress" });
  const stored = body.recordingBase64 ? storeCallRecording(body.providerId, Buffer.from(body.recordingBase64, "base64")) : false;
  return NextResponse.json({ updated, stored });
}
