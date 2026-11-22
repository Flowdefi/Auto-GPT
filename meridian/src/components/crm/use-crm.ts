"use client";

import { useCallback, useEffect, useState } from "react";
import type { Company, Contact, WorkspaceId } from "@/lib/types";
import { useMeridian } from "@/lib/store";

const DEMO_NOTICE =
  "Showing the demo saved on this device. Sign in with a seat to load the workspace database, edit records there, and import CSV files.";

export function useCrmDirectory(workspaceId: WorkspaceId) {
  const localContacts = useMeridian((state) => state.data[workspaceId].contacts);
  const localCompanies = useMeridian((state) => state.data[workspaceId].companies);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [contactResponse, companyResponse] = await Promise.all([
        fetch(`/api/crm/contacts?workspace=${workspaceId}`),
        fetch(`/api/crm/companies?workspace=${workspaceId}`),
      ]);
      if (
        contactResponse.status === 401 ||
        contactResponse.status === 402 ||
        companyResponse.status === 401 ||
        companyResponse.status === 402
      ) {
        setContacts(null);
        setCompanies(null);
        setNotice(DEMO_NOTICE);
        return;
      }
      if (!contactResponse.ok || !companyResponse.ok) {
        setNotice("Could not load the workspace database. Showing the demo on this device.");
        return;
      }
      const contactBody = (await contactResponse.json()) as { contacts?: Contact[] };
      const companyBody = (await companyResponse.json()) as { companies?: Company[] };
      setContacts(contactBody.contacts ?? []);
      setCompanies(companyBody.companies ?? []);
      setNotice(null);
    } catch {
      setNotice("Could not load the workspace database. Showing the demo on this device.");
    } finally {
      setReady(true);
    }
  }, [workspaceId]);

  useEffect(() => {
    setReady(false);
    void reload();
  }, [reload]);

  return {
    contacts: contacts ?? localContacts,
    companies: companies ?? localCompanies,
    remote: contacts !== null && companies !== null,
    notice,
    ready,
    reload,
  };
}

export async function saveRemoteContact(
  workspaceId: WorkspaceId,
  contact: Contact,
): Promise<Contact> {
  const existing = Boolean(contact.id);
  const response = await fetch(existing ? `/api/crm/contacts/${contact.id}` : "/api/crm/contacts", {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, contact }),
  });
  const payload = (await response.json()) as { contact?: Contact; error?: string };
  if (!response.ok || !payload.contact) throw new Error(payload.error ?? "Save failed");
  return payload.contact;
}

export async function saveRemoteCompany(
  workspaceId: WorkspaceId,
  company: Company,
): Promise<Company> {
  const existing = Boolean(company.id);
  const response = await fetch(existing ? `/api/crm/companies/${company.id}` : "/api/crm/companies", {
    method: existing ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, company }),
  });
  const payload = (await response.json()) as { company?: Company; error?: string };
  if (!response.ok || !payload.company) throw new Error(payload.error ?? "Save failed");
  return payload.company;
}
