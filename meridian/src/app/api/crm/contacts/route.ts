import { NextResponse } from "next/server";
import { isWorkspaceId } from "@/lib/workspace-id";
import { companiesOf, contactsOf, updateContact, upsertContact } from "@/server/crm";
import { enrichContactRecord } from "@/server/enrich";
import { loadDb } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LIFECYCLES = new Set(["subscriber", "lead", "mql", "sql", "opportunity", "customer", "evangelist"]);

function asText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asTags(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}

function cleanLinkedin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const workspace = url.searchParams.get("workspace") ?? undefined;
  if (!isWorkspaceId(workspace)) {
    return NextResponse.json({ error: "workspace required" }, { status: 400 });
  }
  const id = url.searchParams.get("id");
  const companies = companiesOf(workspace);
  const contacts = contactsOf(workspace)
    .filter((contact) => (id ? contact.id === id : true))
    .map((contact) => ({
      ...contact,
      companyName: companies.find((company) => company.id === contact.companyId)?.name ?? "",
      companyDomain: companies.find((company) => company.id === contact.companyId)?.domain ?? "",
    }));
  return NextResponse.json({ contacts, companies });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  if (!isWorkspaceId(body.workspaceId) || typeof body.email !== "string" || !body.email.trim()) {
    return NextResponse.json({ error: "workspaceId and email are required" }, { status: 400 });
  }
  const lifecycle = asText(body.lifecycle);
  if (lifecycle && !LIFECYCLES.has(lifecycle)) {
    return NextResponse.json({ error: "Unknown lifecycle" }, { status: 400 });
  }
  const linkedinRaw = asText(body.linkedinUrl);
  const linkedinUrl = linkedinRaw !== undefined ? cleanLinkedin(linkedinRaw) : undefined;
  if (linkedinUrl === null) return NextResponse.json({ error: "LinkedIn URL must be http or https" }, { status: 400 });
  const phone = asText(body.phone);
  if (phone && phone.trim().length > 40) {
    return NextResponse.json({ error: "Phone is too long" }, { status: 400 });
  }
  const result = upsertContact({
    workspaceId: body.workspaceId,
    email: body.email,
    firstName: asText(body.firstName),
    lastName: asText(body.lastName),
    title: asText(body.title),
    phone,
    companyName: asText(body.company),
    city: asText(body.city),
    state: asText(body.state),
    lifecycle,
    tags: asTags(body.tags) ?? ["manual"],
    linkedinUrl,
    notes: asText(body.notes),
  });
  return NextResponse.json(result);
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  if (!isWorkspaceId(body.workspaceId) || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "workspaceId and id are required" }, { status: 400 });
  }
  const lifecycle = asText(body.lifecycle);
  if (lifecycle && !LIFECYCLES.has(lifecycle)) {
    return NextResponse.json({ error: "Unknown lifecycle" }, { status: 400 });
  }
  const linkedinRaw = asText(body.linkedinUrl);
  const linkedinUrl = linkedinRaw !== undefined ? cleanLinkedin(linkedinRaw) : undefined;
  if (linkedinUrl === null) return NextResponse.json({ error: "LinkedIn URL must be http or https" }, { status: 400 });
  const notes = asText(body.notes);
  if (notes && notes.length > 4000) return NextResponse.json({ error: "Notes are too long" }, { status: 400 });

  const hasField = ["firstName", "lastName", "phone", "title", "company", "city", "state", "lifecycle", "tags", "linkedinUrl", "notes"].some(
    (key) => key in body,
  );
  try {
    if (hasField) {
      updateContact(body.workspaceId, body.id, {
        firstName: asText(body.firstName),
        lastName: asText(body.lastName),
        phone: asText(body.phone),
        title: asText(body.title),
        company: asText(body.company),
        city: asText(body.city),
        state: asText(body.state),
        lifecycle,
        tags: asTags(body.tags),
        linkedinUrl,
        notes,
      });
    }
    if (body.enrich === true) {
      const enriched = await enrichContactRecord(body.workspaceId, body.id);
      if (!enriched.ok) return NextResponse.json({ error: enriched.error ?? "Enrichment failed" }, { status: 404 });
    }
    const contact = loadDb().contacts.find((row) => row.id === body.id && row.workspaceId === body.workspaceId);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    const company = loadDb().companies.find((row) => row.id === contact.companyId);
    return NextResponse.json({ contact: { ...contact, companyName: company?.name ?? "" }, enrichment: contact.enrichment ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update contact";
    return NextResponse.json({ error: message }, { status: message === "Contact not found" ? 404 : 400 });
  }
}
