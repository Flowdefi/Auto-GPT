import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import type { WorkspaceData, WorkspaceId } from "@/lib/types";
import { loadDb, mutate, nextId } from "./db";
import type { CrmCompany, CrmContact, DatabaseFile } from "./models";

const FREE_MAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "pm.me",
  "protonmail.com",
  "live.com",
  "msn.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "zoho.com",
]);

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL.has(domain.toLowerCase());
}

export function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase().trim();
}

export function seedCrmRecords(db: DatabaseFile): void {
  if (db.companies.length > 0) return;
  const now = new Date().toISOString();
  const sets: Array<[WorkspaceId, WorkspaceData]> = [
    ["triton", seedTriton()],
    ["aether", seedAether()],
  ];
  for (const [workspaceId, data] of sets) {
    for (const company of data.companies) {
      db.companies.push({
        id: company.id,
        workspaceId,
        name: company.name,
        domain: company.domain,
        type: company.type,
        industry: company.industry,
        city: company.city,
        state: company.state,
        employees: company.employees,
        ownerId: company.ownerId,
        lifecycle: company.lifecycle,
        score: company.score,
        notes: company.notes,
        createdAt: now,
      });
    }
    for (const contact of data.contacts) {
      db.contacts.push({
        id: contact.id,
        workspaceId,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email.toLowerCase(),
        phone: contact.phone,
        title: contact.title,
        companyId: contact.companyId,
        ownerId: contact.ownerId,
        lifecycle: contact.lifecycle,
        score: contact.score,
        city: contact.city,
        state: contact.state,
        tags: contact.tags,
        lastActivityAt: contact.lastActivityAt,
        createdAt: now,
      });
    }
  }
}

export function findContactByEmail(workspaceId: WorkspaceId, email: string): CrmContact | undefined {
  const target = email.toLowerCase().trim();
  return loadDb().contacts.find(
    (contact) => contact.workspaceId === workspaceId && contact.email === target,
  );
}

export function findCompanyByDomain(workspaceId: WorkspaceId, domain: string): CrmCompany | undefined {
  const target = domain.toLowerCase().replace(/^www\./, "");
  if (!target) return undefined;
  return loadDb().companies.find(
    (company) => company.workspaceId === workspaceId && company.domain.toLowerCase().replace(/^www\./, "") === target,
  );
}

export interface UpsertContactInput {
  workspaceId: WorkspaceId;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  companyName?: string;
  city?: string;
  state?: string;
  ownerId?: string;
  tags?: string[];
  lifecycle?: string;
  linkedinUrl?: string;
  notes?: string;
}

export interface UpsertResult {
  contact: CrmContact;
  company: CrmCompany;
  createdContact: boolean;
  createdCompany: boolean;
}

function titleCase(value: string): string {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function namesFromEmail(email: string): { firstName: string; lastName: string } {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: titleCase(parts[0] ?? ""), lastName: titleCase(parts.slice(1).join(" ")) };
  }
  return { firstName: titleCase(local || "Unknown"), lastName: "" };
}

export function upsertContact(input: UpsertContactInput): UpsertResult {
  const email = input.email.toLowerCase().trim();
  const domain = domainOf(email);
  const derived = namesFromEmail(email);

  return mutate((db) => {
    let createdCompany = false;
    let company = db.companies.find(
      (row) =>
        row.workspaceId === input.workspaceId &&
        row.domain.toLowerCase().replace(/^www\./, "") === domain.replace(/^www\./, ""),
    );

    if (!company && input.companyName) {
      company = db.companies.find(
        (row) =>
          row.workspaceId === input.workspaceId &&
          row.name.toLowerCase() === input.companyName?.toLowerCase(),
      );
    }

    if (!company) {
      createdCompany = true;
      const inferredName =
        input.companyName?.trim() ||
        (domain && !isFreeMailDomain(domain) ? titleCase(domain.replace(/\.[a-z.]+$/, "")) : "Unknown company");
      company = {
        id: nextId("co"),
        workspaceId: input.workspaceId,
        name: inferredName,
        domain: isFreeMailDomain(domain) ? "" : domain,
        type: "prospect",
        industry: "",
        city: input.city ?? "",
        state: input.state ?? "",
        employees: "",
        ownerId: input.ownerId ?? "",
        lifecycle: "lead",
        score: 40,
        notes: "Created from inbound capture.",
        createdAt: new Date().toISOString(),
      };
      db.companies.push(company);
    }

    let createdContact = false;
    let contact = db.contacts.find(
      (row) => row.workspaceId === input.workspaceId && row.email === email,
    );
    if (!contact) {
      createdContact = true;
      contact = {
        id: nextId("ct"),
        workspaceId: input.workspaceId,
        firstName: input.firstName?.trim() || derived.firstName,
        lastName: input.lastName?.trim() || derived.lastName,
        email,
        phone: input.phone ?? "",
        title: input.title ?? "",
        companyId: company.id,
        ownerId: input.ownerId ?? "",
        lifecycle: input.lifecycle ?? "lead",
        score: 40,
        city: input.city ?? "",
        state: input.state ?? "",
        tags: input.tags ?? [],
        linkedinUrl: input.linkedinUrl ?? "",
        notes: input.notes ?? "",
        lastActivityAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      db.contacts.push(contact);
    } else {
      if (input.firstName?.trim()) contact.firstName = input.firstName.trim();
      if (input.lastName?.trim()) contact.lastName = input.lastName.trim();
      if (input.phone) contact.phone = input.phone;
      if (input.title) contact.title = input.title;
      if (input.city) contact.city = input.city;
      if (input.state) contact.state = input.state;
      if (input.tags?.length) {
        contact.tags = [...new Set([...contact.tags, ...input.tags])];
      }
      if (input.lifecycle) contact.lifecycle = input.lifecycle;
      if (input.linkedinUrl !== undefined) contact.linkedinUrl = input.linkedinUrl;
      if (input.notes !== undefined) contact.notes = input.notes;
      contact.lastActivityAt = new Date().toISOString();
      if (!contact.companyId) contact.companyId = company.id;
    }

    return { contact, company, createdContact, createdCompany };
  });
}

const LIFECYCLES = new Set(["subscriber", "lead", "mql", "sql", "opportunity", "customer", "evangelist"]);

export function updateContact(
  workspaceId: WorkspaceId,
  id: string,
  patch: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    title?: string;
    company?: string;
    city?: string;
    state?: string;
    lifecycle?: string;
    tags?: string[];
    linkedinUrl?: string;
    notes?: string;
  },
): CrmContact {
  return mutate((db) => {
    const contact = db.contacts.find((row) => row.id === id && row.workspaceId === workspaceId);
    if (!contact) throw new Error("Contact not found");
    if (patch.firstName !== undefined) contact.firstName = patch.firstName.trim();
    if (patch.lastName !== undefined) contact.lastName = patch.lastName.trim();
    if (patch.phone !== undefined) contact.phone = patch.phone.trim();
    if (patch.title !== undefined) contact.title = patch.title.trim();
    if (patch.city !== undefined) contact.city = patch.city.trim();
    if (patch.state !== undefined) contact.state = patch.state.trim();
    if (patch.lifecycle !== undefined) {
      if (!LIFECYCLES.has(patch.lifecycle)) throw new Error("Unknown lifecycle");
      contact.lifecycle = patch.lifecycle;
    }
    if (patch.tags !== undefined) contact.tags = patch.tags;
    if (patch.linkedinUrl !== undefined) contact.linkedinUrl = patch.linkedinUrl;
    if (patch.notes !== undefined) contact.notes = patch.notes;
    if (patch.company !== undefined) {
      const name = patch.company.trim();
      const match = db.companies.find(
        (company) => company.workspaceId === workspaceId && company.name.toLowerCase() === name.toLowerCase(),
      );
      if (match) {
        contact.companyId = match.id;
      } else if (name) {
        const current = db.companies.find((company) => company.id === contact.companyId);
        if (current) current.name = name;
        else {
          const created: CrmCompany = {
            id: nextId("co"),
            workspaceId,
            name,
            domain: "",
            type: "prospect",
            industry: "",
            city: contact.city,
            state: contact.state,
            employees: "",
            ownerId: contact.ownerId,
            lifecycle: "lead",
            score: 40,
            notes: "",
            createdAt: new Date().toISOString(),
          };
          db.companies.push(created);
          contact.companyId = created.id;
        }
      }
    }
    contact.lastActivityAt = new Date().toISOString();
    return contact;
  });
}

export function contactsOf(workspaceId: WorkspaceId): CrmContact[] {
  return loadDb().contacts.filter((contact) => contact.workspaceId === workspaceId);
}

export function companiesOf(workspaceId: WorkspaceId): CrmCompany[] {
  return loadDb().companies.filter((company) => company.workspaceId === workspaceId);
}
