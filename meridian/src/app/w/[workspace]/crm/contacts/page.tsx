"use client";

import { useEffect, useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { Textarea } from "@/components/ui/textarea";
import { contactName, relativeDay } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ServerContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  companyName: string;
  lifecycle: string;
  score: number;
  lastActivityAt: string;
}

export default function ContactsPage() {
  const { workspaceId } = useActiveWorkspace();
  const [contacts, setContacts] = useState<ServerContact[]>([]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [lifecycle, setLifecycle] = useState("lead");
  const [tags, setTags] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [notes, setNotes] = useState("");

  async function refresh() {
    const response = await fetch(`/api/crm/contacts?workspace=${workspaceId}`);
    const payload = await response.json();
    setContacts(payload.contacts ?? []);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  async function save() {
    if (!email.trim()) {
      setNotice("A work email is required so the contact lands in the server CRM.");
      return;
    }
    const response = await fetch("/api/crm/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        email,
        firstName,
        lastName,
        phone,
        title,
        company,
        city,
        state: stateName,
        lifecycle,
        tags,
        linkedinUrl,
        notes,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setNotice(payload.error ?? "Could not save contact");
      return;
    }
    setOpen(false);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setTitle("");
    setCompany("");
    setCity("");
    setStateName("");
    setLifecycle("lead");
    setTags("");
    setLinkedinUrl("");
    setNotes("");
    setNotice(payload.createdContact ? "Contact created on the server." : "Existing contact updated.");
    await refresh();
  }

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        subtitle="Server records — the same people forms, Outlook, and the AI CTO write to."
        actions={<Button onClick={() => setOpen((value) => !value)}>Create contact</Button>}
      />
      <Subnav
        current={`/w/${workspaceId}/crm/contacts`}
        items={[
          { href: `/w/${workspaceId}/crm/contacts`, label: "Contacts" },
          { href: `/w/${workspaceId}/crm/companies`, label: "Companies" },
        ]}
      />
      {open ? (
        <Card className="mb-4 space-y-3 p-5">
          <div className="font-semibold">New contact</div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">First name</span>
            <Field value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Last name</span>
            <Field value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Work email</span>
            <Field type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Phone</span>
            <Field type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Title</span>
            <Field value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Company</span>
            <Field value={company} onChange={(event) => setCompany(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">City</span>
            <Field value={city} onChange={(event) => setCity(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">State</span>
            <Field value={stateName} onChange={(event) => setStateName(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Lifecycle</span>
            <select className="min-h-11 w-full rounded-xl border bg-transparent px-3" value={lifecycle} onChange={(event) => setLifecycle(event.target.value)}>
              {["subscriber", "lead", "mql", "sql", "opportunity", "customer", "evangelist"].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Tags</span>
            <Field placeholder="seller, medical" value={tags} onChange={(event) => setTags(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">LinkedIn URL</span>
            <Field value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Notes</span>
            <Textarea className="min-h-24 rounded-xl" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <Button onClick={() => void save()}>Save contact</Button>
        </Card>
      ) : null}
      {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
      <DataTable
        headers={["Name", "Phone", "Title", "Company", "Lifecycle", "Score", "Last activity"]}
        rows={contacts.map((contact) => ({
          key: contact.id,
          href: `/w/${workspaceId}/crm/contacts/${contact.id}`,
          cells: [
            contactName(contact.firstName, contact.lastName),
            contact.phone || "—",
            contact.title || "—",
            contact.companyName || "—",
            <Badge key="l" tone="accent">{contact.lifecycle}</Badge>,
            String(contact.score),
            relativeDay(contact.lastActivityAt),
          ],
        }))}
      />
    </div>
  );
}
