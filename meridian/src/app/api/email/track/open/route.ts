import { NextResponse } from "next/server";
import { ready } from "@/server/db";
import { recordMailEvent } from "@/server/mailer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: Request) {
  await ready();
  const messageId = new URL(request.url).searchParams.get("m");
  if (messageId) recordMailEvent(messageId, "open");
  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
