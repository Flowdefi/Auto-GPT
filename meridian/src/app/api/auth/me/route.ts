import { NextResponse } from "next/server";
import { publicAccount, seatFromRequest } from "@/server/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const seat = seatFromRequest(request);
  if (!seat) return NextResponse.json({ account: null, licensed: false });
  return NextResponse.json({ account: publicAccount(seat.account, seat.licensed), licensed: seat.licensed });
}
