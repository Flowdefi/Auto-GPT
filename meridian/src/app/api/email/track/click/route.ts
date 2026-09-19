import { NextResponse } from "next/server";
import { recordMailEvent } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const messageId = url.searchParams.get("m");
  const target = url.searchParams.get("u");
  if (messageId && target) {
    recordMailEvent(messageId, "click", target);
  }
  if (!target || !/^https?:\/\//i.test(target)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
  return NextResponse.redirect(target, 302);
}
