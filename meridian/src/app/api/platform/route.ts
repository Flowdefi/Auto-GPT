import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { llmStatus } from "@/server/ai/cto";
import { catalogForUi } from "@/server/ai/models";
import { embedStatus } from "@/server/ai/embeddings";
import { loadDb } from "@/server/db";
import { checkDomainAuth } from "@/server/deliverability";
import { providerStatus, publicBaseUrl } from "@/server/mailer";
import { outlookStatus } from "@/server/outlook";
import { gaStatus } from "@/server/ga";
import { keywordProvider } from "@/server/seo/keywords";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const workspace = new URL(request.url).searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }

  const db = loadDb();
  const domain = workspace === "triton" ? "debtmarket.net" : "aethermarkets.io";
  const auth = await checkDomainAuth(domain);

  return NextResponse.json({
    mail: providerStatus(),
    outlook: outlookStatus(),
    ai: llmStatus(),
    embeddings: embedStatus(),
    catalog: catalogForUi(),
    seo: keywordProvider(),
    ga: gaStatus(),
    auth,
    publicUrl: publicBaseUrl(),
    forms: {
      submit: `${publicBaseUrl()}/api/forms/submit`,
      embed: `${publicBaseUrl()}/api/forms/embed.js`,
      snippet: `<script src="${publicBaseUrl()}/api/forms/embed.js" defer></script>\n<form data-meridian-form="seller-inquiry" data-meridian-workspace="${workspace}">…</form>`,
    },
    counts: {
      leads: db.leads.filter((row) => row.workspaceId === workspace).length,
      inbox: db.inbox.filter((row) => row.workspaceId === workspace).length,
      submissions: db.submissions.filter((row) => row.workspaceId === workspace).length,
      workflows: db.workflows.filter((row) => row.workspaceId === workspace).length,
    },
  });
}
