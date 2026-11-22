"use client";

import { useMemo, useState } from "react";
import { CrmNav } from "@/components/crm/crm-nav";
import { ContactForm } from "@/components/crm/contact-form";
import { saveRemoteContact, useCrmDirectory } from "@/components/crm/use-crm";
import { DataTable } from "@/components/tables";
import { Badge, Button, Card, PageHeader } from "@/components/meridian/legacy";
import { contactName } from "@/lib/format";
import { ASSET_CLASSES, LEAD_TYPES, US_STATES, blankContact, contactMatchesState, isNdaSigned } from "@/lib/debt";
import { useMeridian } from "@/lib/store";
import type { AssetClass, Contact } from "@/lib/types";
import { useActiveWorkspace } from "@/lib/use-workspace";

const control = "min-h-11 rounded-xl border bg-transparent px-3 text-sm";

export default function ContactsPage() {
  const { workspaceId, data } = useActiveWorkspace();
  const directory = useCrmDirectory(workspaceId);
  const addContact = useMeridian((state) => state.addContact);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadType, setLeadType] = useState("");
  const [asset, setAsset] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [nda, setNda] = useState("");
  const [dne, setDne] = useState("");
  const [formKey, setFormKey] = useState(0);

  const filtered = useMemo(() => {
    return directory.contacts.filter((contact) => {
      if (leadType && contact.leadType !== leadType) return false;
      if (asset && !(contact.assetClassPreference ?? []).includes(asset as AssetClass)) return false;
      if (stateCode && !contactMatchesState(contact, stateCode)) return false;
      if (nda === "signed" && !isNdaSigned(contact)) return false;
      if (nda === "unsigned" && isNdaSigned(contact)) return false;
      if (dne === "yes" && contact.doNotEmail !== true) return false;
      if (dne === "no" && contact.doNotEmail === true) return false;
      return true;
    });
  }, [directory.contacts, leadType, asset, stateCode, nda, dne]);

  async function create(contact: Contact) {
    setError(null);
    try {
      if (directory.remote) {
        await saveRemoteContact(workspaceId, { ...contact, id: "" });
        await directory.reload();
      } else {
        addContact(contact);
      }
      setOpen(false);
      setFormKey((value) => value + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Save failed");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="CRM"
        title="Contacts"
        subtitle="Buyers, sellers, brokers, and partners on the charged-off debt desk."
        actions={
          <Button onClick={() => setOpen((value) => !value)}>{open ? "Close" : "Create contact"}</Button>
        }
      />
      <CrmNav workspaceId={workspaceId} current={`/w/${workspaceId}/crm/contacts`} />
      {directory.notice ? <Card className="mb-4 p-4 text-sm">{directory.notice}</Card> : null}
      {open ? (
        <Card className="mb-4 p-4">
          <ContactForm
            key={formKey}
            value={blankContact({ ownerId: data.users[0]?.id ?? "", lifecycle: "lead" })}
            companies={directory.companies}
            users={data.users}
            submitLabel="Save contact"
            onSubmit={(contact) => void create(contact)}
            onCancel={() => setOpen(false)}
          />
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </Card>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        <select className={control} value={leadType} onChange={(event) => setLeadType(event.target.value)} aria-label="Lead type">
          <option value="">Lead type</option>
          {LEAD_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select className={control} value={asset} onChange={(event) => setAsset(event.target.value)} aria-label="Asset class">
          <option value="">Asset class</option>
          {ASSET_CLASSES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select className={control} value={stateCode} onChange={(event) => setStateCode(event.target.value)} aria-label="State">
          <option value="">State</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>{state.code}</option>
          ))}
        </select>
        <select className={control} value={nda} onChange={(event) => setNda(event.target.value)} aria-label="NDA signed">
          <option value="">NDA</option>
          <option value="signed">NDA signed</option>
          <option value="unsigned">NDA not signed</option>
        </select>
        <select className={control} value={dne} onChange={(event) => setDne(event.target.value)} aria-label="Do not email">
          <option value="">Email opt-out</option>
          <option value="yes">Do not email</option>
          <option value="no">Mailable</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <Card className="p-5 text-sm text-muted-foreground">No contacts match these filters.</Card>
      ) : (
        <DataTable
          headers={["Name", "Lead type", "Company", "Asset class", "State", "NDA", "Email"]}
          rows={filtered.map((contact) => {
            const company = directory.companies.find((item) => item.id === contact.companyId);
            return {
              key: contact.id,
              href: `/w/${workspaceId}/crm/contacts/${contact.id}`,
              cells: [
                contactName(contact.firstName, contact.lastName),
                contact.leadType ?? "—",
                company?.name ?? "—",
                (contact.assetClassPreference ?? []).join(", ") || "—",
                contact.state || "—",
                isNdaSigned(contact) ? (contact.ndaSigned ?? "Signed") : "—",
                contact.doNotEmail ? (
                  <Badge key="dne" tone="bad">Do not email</Badge>
                ) : (
                  contact.email || "—"
                ),
              ],
            };
          })}
        />
      )}
      <p className="mt-3 text-xs text-muted-foreground">{filtered.length} shown</p>
    </div>
  );
}
