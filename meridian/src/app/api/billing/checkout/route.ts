import { NextResponse } from "next/server";
import { requireAccount } from "@/server/api-guard";
import { createPolarCheckout } from "@/server/billing";
import { clientIp, rateLimited, tooMany } from "@/server/rate-limit";
import { selfHosted } from "@/server/self-hosted";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (selfHosted()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (rateLimited(`checkout:${clientIp(request)}`, 10, 60_000)) return tooMany();
  const gate = await requireAccount(request);
  if (!gate.ok) return gate.response;
  if (gate.licensed) {
    return NextResponse.json({ alreadyLicensed: true, url: "/w/triton/home" });
  }
  try {
    const checkout = await createPolarCheckout(gate.account);
    return NextResponse.json(checkout);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout is unavailable" },
      { status: 503 },
    );
  }
}
