import { NextResponse } from "next/server";
import { currentBrand } from "@/server/brand";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ brand: currentBrand() });
}
