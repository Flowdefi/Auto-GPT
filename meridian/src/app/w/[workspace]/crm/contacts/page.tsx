"use client";

import { useEffect, useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/meridian/legacy";
import { contactName, relativeDay } from "@/lib/format";
import { useActiveWorkspace } from "@/lib/use-workspace";

interface ServerContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
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
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");

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
      body: JSON.stringify({ workspaceId, email, firstName, lastName, title, company }),
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
    setTitle("");
    setCompany("");
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
        <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-2">
          <Field placeholder="First name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          <Field placeholder="Last name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          <Field placeholder="Work email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Field placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Field placeholder="Company" value={company} onChange={(event) => setCompany(event.target.value)} />
          <Button onClick={() => void save()}>Save contact</Button>
        </Card>
      ) : null}
      {notice ? <p className="mb-3 text-sm text-muted-foreground">{notice}</p> : null}
      <DataTable
        headers={["Name", "Title", "Company", "Lifecycle", "Score", "Last activity"]}
        rows={contacts.map((contact) => ({
          key: contact.id,
          href: `/w/${workspaceId}/crm/contacts/${contact.id}`,
          cells: [
            contactName(contact.firstName, contact.lastName),
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
