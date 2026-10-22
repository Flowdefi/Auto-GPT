import { NextResponse } from "next/server";
import { LIFETIME_PRICE_USD } from "@/lib/commerce";
import { seatFromRequest, type Account, type Seat } from "./auth";
import { rateLimited } from "./rate-limit";

export type SeatGate =
  | { ok: true; account: Account; licensed: true; via: Seat["via"]; sessionId?: string }
  | { ok: false; response: NextResponse };

export type AccountGate =
  | { ok: true; account: Account; licensed: boolean; via: Seat["via"]; sessionId?: string }
  | { ok: false; response: NextResponse };

function unauthorized(message = "Sign in required"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

function paymentRequired(): NextResponse {
  return NextResponse.json(
    {
      error: `A $${LIFETIME_PRICE_USD} lifetime seat is required`,
      code: "seat_required",
      pricing: "/pricing",
    },
    { status: 402 },
  );
}

export async function requireAccount(request: Request): Promise<AccountGate> {
  const seat = seatFromRequest(request);
  if (!seat) return { ok: false, response: unauthorized() };
  return { ok: true, account: seat.account, licensed: seat.licensed, via: seat.via, sessionId: seat.sessionId };
}

export async function requireSeat(request: Request): Promise<SeatGate> {
  const gate = await requireAccount(request);
  if (!gate.ok) return gate;
  if (!gate.licensed) return { ok: false, response: paymentRequired() };
  if (rateLimited(`seat:${gate.account.id}`, 180, 60_000)) {
    return { ok: false, response: NextResponse.json({ error: "Too many requests" }, { status: 429 }) };
  }
  return { ok: true, account: gate.account, licensed: true, via: gate.via, sessionId: gate.sessionId };
}
