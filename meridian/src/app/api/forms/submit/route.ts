import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { loadDb, mutate, nextId } from "@/server/db";
import { createLead } from "@/server/workflow";
import { runAutomations } from "@/server/workflow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ORIGINS = [
  "https://www.debtmarket.net",
  "https://debtmarket.net",
  "https://aethermarkets.io",
  "https://www.aethermarkets.io",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))
      ? origin
      : ALLOWED_ORIGINS[0]!;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

/** Simple per-IP window so a public endpoint cannot be hammered. */
const hits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many submissions" }, { status: 429, headers });
  }

  let body: Record<string, string> = {};
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      body = (await request.json()) as Record<string, string>;
    } else {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        body[key] = typeof value === "string" ? value : "";
      }
    }
  } catch {
    return NextResponse.json({ error: "Unreadable submission" }, { status: 400, headers });
  }

  const workspaceRaw = body.workspace ?? "triton";
  const workspaceId = isWorkspaceId(workspaceRaw) ? workspaceRaw : "triton";
  const formId = (body.formId ?? "website-contact").slice(0, 60);
  const pageUrl = (body.pageUrl ?? origin ?? "https://www.debtmarket.net").slice(0, 300);
  const email = (body.email ?? "").trim().toLowerCase();

  // Honeypot: real users never fill a hidden field.
  const honeypot = (body.company_website ?? body._gotcha ?? "").trim();

  function record(status: "accepted" | "spam" | "duplicate" | "error", reason?: string, leadId?: string) {
    return mutate((db) => {
      const entry = {
        id: nextId("fs"),
        workspaceId,
        formId,
        pageUrl,
        fields: body,
        ip,
        userAgent: request.headers.get("user-agent") ?? undefined,
        leadId,
        status,
        reason,
        at: new Date().toISOString(),
      };
      db.submissions.unshift(entry);
      if (db.submissions.length > 1000) db.submissions.length = 1000;
      return entry;
    });
  }

  if (honeypot) {
    record("spam", "honeypot filled");
    return NextResponse.json({ ok: true }, { headers });
  }

  if (!EMAIL_RE.test(email)) {
    record("error", "invalid email");
    return NextResponse.json({ error: "A valid email is required" }, { status: 400, headers });
  }

  const submittedAt = Number(body.renderedAt ?? 0);
  if (submittedAt && Date.now() - submittedAt < 1200) {
    record("spam", "submitted faster than a human can type");
    return NextResponse.json({ ok: true }, { headers });
  }

  try {
    const payload: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (["email", "workspace", "formId", "pageUrl", "renderedAt", "company_website", "_gotcha"].includes(key)) {
        continue;
      }
      if (typeof value === "string" && value.trim()) payload[key] = value.trim().slice(0, 2000);
    }

    const result = createLead({
      workspaceId,
      source: body.source?.trim() || `website:${formId}`,
      campaign: body.campaign?.trim(),
      payload,
      notes: `Submitted from ${pageUrl}`,
      contact: {
        workspaceId,
        email,
        firstName: body.firstName ?? body.first_name ?? body.name?.split(" ")[0],
        lastName: body.lastName ?? body.last_name ?? body.name?.split(" ").slice(1).join(" "),
        phone: body.phone,
        title: body.title ?? body.jobTitle,
        companyName: body.company ?? body.companyName ?? body.organization,
        city: body.city,
        state: body.state,
        tags: ["inbound", formId],
      },
    });

    record("accepted", result.created ? "new lead" : "repeat touch", result.lead.id);
    runAutomations(workspaceId, "form.submitted", "lead", result.lead.id);

    return NextResponse.json(
      {
        ok: true,
        leadId: result.lead.id,
        created: result.created,
        score: result.lead.score,
        band: result.lead.band,
        owner: result.lead.ownerId,
      },
      { headers },
    );
  } catch (error) {
    record("error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Could not record submission" }, { status: 500, headers });
  }
}

export function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const db = loadDb();
  return NextResponse.json({
    submissions: db.submissions.filter((row) => row.workspaceId === workspace).slice(0, 100),
  });
}
