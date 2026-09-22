"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Badge, Button, Card, Empty, Field, PageHeader } from "@/components/meridian/legacy";
import { Textarea } from "@/components/ui/textarea";
import { contactName } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface WikiBits {
  id?: string;
  label?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  query?: string;
}

interface ServerContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
  companyName: string;
  lifecycle: string;
  score: number;
  city: string;
  state: string;
  tags: string[];
  linkedinUrl?: string;
  notes?: string;
  enrichedAt?: string;
  enrichment?: {
    avatarUrl?: string;
    gravatarChecked?: boolean;
    wikidata?: WikiBits;
    company?: { ok?: boolean; error?: string };
    notes?: string[];
    fetchedAt?: string;
  };
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function ContactRecordPage() {
  const params = useParams<{ id: string }>();
  const { workspaceId } = useActiveWorkspace();
  const [contact, setContact] = useState<ServerContact | null>(null);
  const [missing, setMissing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch(`/api/crm/contacts?workspace=${workspaceId}&id=${params.id}`);
    const payload = await response.json();
    const row = payload.contacts?.[0] as ServerContact | undefined;
    if (!row) {
      setMissing(true);
      setContact(null);
      return;
    }
    setMissing(false);
    setContact(row);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, workspaceId]);

  async function save(enrich = false) {
    if (!contact) return;
    setBusy(enrich ? "enrich" : "save");
    setNotice(null);
    const response = await fetch("/api/crm/contacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        title: contact.title,
        company: contact.companyName,
        city: contact.city,
        state: contact.state,
        lifecycle: contact.lifecycle,
        tags: contact.tags,
        linkedinUrl: contact.linkedinUrl ?? "",
        notes: contact.notes ?? "",
        enrich,
      }),
    });
    const payload = await response.json();
    setBusy(null);
    if (!response.ok) {
      setNotice(payload.error ?? "Could not save contact");
      return;
    }
    setNotice(enrich ? "Enrichment stored on the contact." : "Contact saved.");
    await refresh();
  }

  if (missing) return <Empty title="Contact not found" body="This id is not on the server." />;
  if (!contact) return <PageHeader title="Loading contact" />;

  const wiki = contact.enrichment?.wikidata;
  const location = [contact.city, contact.state].filter(Boolean).join(", ") || "—";

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Contact"
        title={contactName(contact.firstName, contact.lastName)}
        subtitle={`${contact.title || "No title"} · ${contact.companyName || "No company"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{contact.lifecycle}</Badge>
            <Button disabled={busy !== null} onClick={() => void save(true)}>
              {busy === "enrich" ? "Enriching…" : "Enrich"}
            </Button>
          </div>
        }
      />
      {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-3 p-5">
          <div className="font-semibold">Record</div>
          <Labeled label="First name">
            <Field value={contact.firstName} onChange={(event) => setContact({ ...contact, firstName: event.target.value })} />
          </Labeled>
          <Labeled label="Last name">
            <Field value={contact.lastName} onChange={(event) => setContact({ ...contact, lastName: event.target.value })} />
          </Labeled>
          <Labeled label="Email">
            <Field value={contact.email} readOnly />
          </Labeled>
          <Labeled label="Phone">
            <Field type="tel" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
          </Labeled>
          <Labeled label="Title">
            <Field value={contact.title} onChange={(event) => setContact({ ...contact, title: event.target.value })} />
          </Labeled>
          <Labeled label="Company">
            <Field value={contact.companyName} onChange={(event) => setContact({ ...contact, companyName: event.target.value })} />
          </Labeled>
          <Labeled label="City">
            <Field value={contact.city} onChange={(event) => setContact({ ...contact, city: event.target.value })} />
          </Labeled>
          <Labeled label="State">
            <Field value={contact.state} onChange={(event) => setContact({ ...contact, state: event.target.value })} />
          </Labeled>
          <Labeled label="Lifecycle">
            <select
              className="min-h-11 w-full rounded-xl border bg-transparent px-3"
              value={contact.lifecycle}
              onChange={(event) => setContact({ ...contact, lifecycle: event.target.value })}
            >
              {["subscriber", "lead", "mql", "sql", "opportunity", "customer", "evangelist"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Tags">
            <Field
              value={contact.tags.join(", ")}
              onChange={(event) =>
                setContact({
                  ...contact,
                  tags: event.target.value.split(",").map((item) => item.trim()).filter(Boolean),
                })
              }
            />
          </Labeled>
          <Labeled label="LinkedIn URL">
            <Field value={contact.linkedinUrl ?? ""} onChange={(event) => setContact({ ...contact, linkedinUrl: event.target.value })} />
          </Labeled>
          <Labeled label="Notes">
            <Textarea className="min-h-28 rounded-xl" value={contact.notes ?? ""} onChange={(event) => setContact({ ...contact, notes: event.target.value })} />
          </Labeled>
          <Button disabled={busy !== null} onClick={() => void save(false)}>
            {busy === "save" ? "Saving…" : "Save contact"}
          </Button>
        </Card>
        <div className="space-y-4">
          <Card className="space-y-2 p-5 text-sm">
            <div className="font-semibold">About</div>
            {contact.enrichment?.avatarUrl ? (
              // Gravatar is a remote avatar URL returned by enrichment.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={contact.enrichment.avatarUrl} alt="" className="size-16 rounded-full" />
            ) : null}
            <div>{contact.email}</div>
            <div>{contact.phone || "No phone"}</div>
            <div>{location}</div>
            <div>Score {contact.score}</div>
            <div className="flex flex-wrap gap-1">
              {contact.tags.map((tag) => (
                <Badge key={tag}>{tag}</Badge>
              ))}
            </div>
            {contact.linkedinUrl ? (
              <a href={contact.linkedinUrl} className="block underline" target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            ) : (
              <div className="text-muted-foreground">No LinkedIn URL</div>
            )}
          </Card>
          <Card className="space-y-2 p-5 text-sm">
            <div className="font-semibold">Enrichment</div>
            <p className="text-muted-foreground">
              {contact.enrichedAt ? `Last run ${contact.enrichedAt}` : "Not enriched yet. Gravatar, Wikidata, and the company domain need no API key."}
            </p>
            {wiki?.label ? <div>{wiki.label}</div> : null}
            {wiki?.description ? <div>{wiki.description}</div> : null}
            {wiki?.website ? <div>Website {wiki.website}</div> : null}
            {wiki?.headquarters ? <div>Headquarters {wiki.headquarters}</div> : null}
            {contact.enrichment?.company?.error ? <div>{contact.enrichment.company.error}</div> : null}
            {(contact.enrichment?.notes ?? []).map((line) => (
              <div key={line} className="text-muted-foreground">
                {line}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
