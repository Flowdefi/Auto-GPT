import { NextResponse } from "next/server";
import { providerStatus } from "@/server/mailer";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(providerStatus());
}
