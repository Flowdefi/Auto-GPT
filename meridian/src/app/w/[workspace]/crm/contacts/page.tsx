"use client";

import { useState } from "react";
import { Subnav } from "@/components/subnav";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, Field, PageHeader } from "@/components/ui";
import { contactName, relativeDay } from "@/lib/format";
import { useMeridian } from "@/lib/store";
import { useActiveWorkspace } from "@/lib/use-workspace";

export default function ContactsPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const addContact = useMeridian((state) => state.addContact);
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const companyId = data.companies[0]?.id ?? "";

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        subtitle="People at sellers, buyers, issuers, and partners — Smart CRM record."
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
          <Field placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Field placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Button
            onClick={() => {
              if (!firstName || !lastName) return;
              addContact({
                firstName,
                lastName,
                email,
                phone: "",
                title,
                companyId,
                ownerId: data.users[0]?.id ?? "u_alex",
                lifecycle: "lead",
                city: "",
                state: "",
                tags: ["manual"],
              });
              setOpen(false);
              setFirstName("");
              setLastName("");
              setEmail("");
              setTitle("");
            }}
          >
            Save contact
          </Button>
        </Card>
      ) : null}
      <DataTable
        headers={["Name", "Title", "Company", "Lifecycle", "Score", "Last activity"]}
        rows={data.contacts.map((contact) => {
          const company = data.companies.find((item) => item.id === contact.companyId);
          return {
            key: contact.id,
            href: `/w/${workspaceId}/crm/contacts/${contact.id}`,
            cells: [
              contactName(contact.firstName, contact.lastName),
              contact.title,
              company?.name ?? "—",
              <Badge key="l" tone="accent">{contact.lifecycle}</Badge>,
              String(contact.score),
              relativeDay(contact.lastActivityAt),
            ],
          };
        })}
      />
    </div>
  );
}
