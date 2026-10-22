import { NextResponse } from "next/server";
import { parsePublicHttpUrl } from "@/server/http-guard";
import { recordMailEvent } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const messageId = url.searchParams.get("m");
  const target = url.searchParams.get("u");
  let destination: URL | null = null;
  try {
    if (target) destination = parsePublicHttpUrl(target);
  } catch {
    destination = null;
  }
  if (messageId && destination) {
    recordMailEvent(messageId, "click", destination.toString());
  }
  if (!destination) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }
  return NextResponse.redirect(destination.toString(), 302);
}
