import { NextResponse } from "next/server";
import { applyPortalPay, applyPortalPlan, getState, listPortalSamples, toPortalView } from "@/server/state";
import type { PaymentPlan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isCadence(value: unknown): value is PaymentPlan["cadence"] {
  return value === "weekly" || value === "biweekly" || value === "monthly";
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.json({ ok: true, samples: await listPortalSamples() });
  }
  const state = await getState();
  const account = toPortalView(state.payload, code);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Account not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, account });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        action?: string;
        portalCode?: string;
        amount?: number;
        installment?: number;
        cadence?: string;
        method?: string;
        last4?: string;
      }
    | null;
  if (!body?.portalCode || typeof body.portalCode !== "string") {
    return NextResponse.json({ ok: false, message: "Reference code is required." }, { status: 400 });
  }
  if (body.action === "plan") {
    if (!isCadence(body.cadence) || typeof body.installment !== "number") {
      return NextResponse.json({ ok: false, message: "Plan amount and cadence are required." }, { status: 400 });
    }
    const result = await applyPortalPlan({
      portalCode: body.portalCode,
      installment: body.installment,
      cadence: body.cadence,
    });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  if (typeof body.amount !== "number" || (body.method !== "card" && body.method !== "ach")) {
    return NextResponse.json({ ok: false, message: "Amount and method are required." }, { status: 400 });
  }
  if (typeof body.last4 !== "string") {
    return NextResponse.json({ ok: false, message: "Last four is required." }, { status: 400 });
  }
  const result = await applyPortalPay({
    portalCode: body.portalCode,
    amount: body.amount,
    method: body.method,
    last4: body.last4,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
