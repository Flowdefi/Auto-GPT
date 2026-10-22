import { NextResponse } from "next/server";
import { checkDomainAuth, scoreSpam } from "@/server/deliverability";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    subject?: string;
    html?: string;
    text?: string;
    domain?: string;
  };

  const spam = scoreSpam(body.subject ?? "", body.html ?? "", body.text ?? "");
  const domain = body.domain?.trim();
  const auth = domain ? await checkDomainAuth(domain) : undefined;

  return NextResponse.json({ spam, auth });
}

export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain") ?? "debtmarket.net";
  const auth = await checkDomainAuth(domain);
  return NextResponse.json({ auth });
}
