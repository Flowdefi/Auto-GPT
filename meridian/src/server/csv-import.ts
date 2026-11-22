import {
  blankCompany,
  blankContact,
  canonicalHubspotId,
  emailDomain,
  hubspotOverlaps,
  indicatesDoNotEmail,
  isFreeMailDomain,
  normalizeAssetClasses,
  normalizeCompany,
  normalizeCompanyKind,
  normalizeContact,
  normalizeCountry,
  normalizeEmailStatus,
  normalizeLeadType,
  normalizeLifecycle,
  normalizeState,
  normName,
  parseBuyingStates,
  parseClosedDeal,
  parseDate,
  parseNda,
  parseYes,
  splitPersonName,
  splitTags,
  websiteDomain,
} from "@/lib/debt";
import { seedAether } from "@/lib/seed/aether";
import { seedTriton } from "@/lib/seed/triton";
import type { Company, Contact, EmailStatus, User, WorkspaceId } from "@/lib/types";
import { isWorkspaceId } from "@/lib/workspace-id";
import { cell, hasHeader, headerSet, parseCsv, type CsvRow, type CsvTable } from "./csv";
import {
  listCompanies,
  listContacts,
  mergeCompany,
  mergeContact,
  reconcileContactSuppression,
  suppressionEdits,
  writeCrmBlobs,
} from "./crm-store";
import { loadDb, mutate, nextId } from "./db";
import type { SuppressionReason } from "./models";

export interface SkipRow {
  file: "contacts" | "companies" | "prospects";
  row: number;
  reason: string;
}

export interface ImportCounts {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
}

export interface ImportReport {
  dryRun: boolean;
  workspaceId: WorkspaceId;
  companies: ImportCounts;
  contacts: ImportCounts;
  suppressionsAdded: number;
  suppressionsRemoved: number;
  warnings: string[];
  skipped: SkipRow[];
}

export interface CsvImportInput {
  workspaceId: WorkspaceId;
  contactsCsv?: string;
  companiesCsv?: string;
  prospectsCsv?: string;
  doNotEmail?: boolean;
  invalidEmail?: boolean;
  dryRun?: boolean;
  /** Added to every contact and prospect this run. Does not remove existing tags. */
  tags?: string[];
}

interface WorkingState {
  companies: Company[];
  contacts: Contact[];
  touchedCompanies: Set<string>;
  touchedContacts: Set<string>;
  skipped: SkipRow[];
  warnings: string[];
  users: User[];
  now: string;
  doNotEmail: boolean;
  invalidEmail: boolean;
  extraTags: string[];
  suppressedEmails: Set<string>;
}

const MAX_CSV_CHARS = 25_000_000;

export function formatImportReport(report: ImportReport): string {
  const line = (label: string, counts: ImportCounts) =>
    `${label}: created ${counts.created}, updated ${counts.updated}, unchanged ${counts.unchanged}, skipped ${counts.skipped}`;
  const lines = [
    `Workspace: ${report.workspaceId}`,
    `Mode: ${report.dryRun ? "dry-run" : "write"}`,
    line("Companies", report.companies),
    line("Contacts", report.contacts),
    `Suppressions added: ${report.suppressionsAdded}`,
    `Suppressions removed: ${report.suppressionsRemoved}`,
  ];
  for (const warning of report.warnings) lines.push(`Warning: ${warning}`);
  if (report.skipped.length === 0) {
    lines.push("Skipped rows: 0");
  } else {
    lines.push(`Skipped rows: ${report.skipped.length}`);
    for (const skip of report.skipped.slice(0, 100)) {
      lines.push(`  ${skip.file} row ${skip.row}: ${skip.reason}`);
    }
    if (report.skipped.length > 100) lines.push(`  … ${report.skipped.length - 100} more`);
  }
  return lines.join("\n");
}

export function runCsvImport(input: CsvImportInput): ImportReport {
  if (!isWorkspaceId(input.workspaceId)) {
    throw new Error("workspace must be triton or aether");
  }
  for (const [name, text] of [
    ["contacts", input.contactsCsv],
    ["companies", input.companiesCsv],
    ["prospects", input.prospectsCsv],
  ] as const) {
    if ((text?.length ?? 0) > MAX_CSV_CHARS) {
      throw new Error(`${name} CSV is too large for the API; use npm run import:csv`);
    }
  }
  const plan = planCsvImport(
    {
      companies: listCompanies(input.workspaceId),
      contacts: listContacts(input.workspaceId),
      suppressions: loadDb()
        .suppressions.filter((row) => row.workspaceId === input.workspaceId)
        .map((row) => ({ email: row.email.toLowerCase(), reason: row.reason })),
    },
    input,
  );
  if (!input.dryRun) applyCsvPlan(input.workspaceId, plan);
  return plan.report;
}

interface Bundle {
  companies: Company[];
  contacts: Contact[];
  suppressions: Array<{ email: string; reason: SuppressionReason }>;
}

interface CsvPlan {
  report: ImportReport;
  companies: Company[];
  contacts: Contact[];
  suppressionContacts: Contact[];
}

export function planCsvImport(bundle: Bundle, input: CsvImportInput): CsvPlan {
  const now = new Date().toISOString();
  const state: WorkingState = {
    companies: structuredClone(bundle.companies),
    contacts: structuredClone(bundle.contacts),
    touchedCompanies: new Set<string>(),
    touchedContacts: new Set<string>(),
    skipped: [],
    warnings: [],
    users: (input.workspaceId === "triton" ? seedTriton() : seedAether()).users,
    now,
    doNotEmail: input.doNotEmail === true,
    invalidEmail: input.invalidEmail === true,
    extraTags: [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
    suppressedEmails: new Set(
      bundle.suppressions.map((row) => row.email.trim().toLowerCase()).filter(Boolean),
    ),
  };

  let contactsCsv = input.contactsCsv ?? "";
  let prospectsCsv = input.prospectsCsv ?? "";
  if (!prospectsCsv && contactsCsv) {
    const sniffed = parseCsv(contactsCsv);
    if (isProspectTable(sniffed)) {
      prospectsCsv = contactsCsv;
      contactsCsv = "";
      state.warnings.push("Contacts file matches the prospects column layout and was imported as prospects.");
    }
  }

  const companiesTable = input.companiesCsv ? parseCsv(input.companiesCsv) : null;
  const contactsTable = contactsCsv ? parseCsv(contactsCsv) : null;
  const prospectsTable = prospectsCsv ? parseCsv(prospectsCsv) : null;
  if (!companiesTable && !contactsTable && !prospectsTable) {
    throw new Error("Provide a contacts, companies, or prospects CSV");
  }
  if (companiesTable && companiesTable.rows.length === 0) state.warnings.push("Companies file has no data rows.");
  if (contactsTable && contactsTable.rows.length === 0) state.warnings.push("Contacts file has no data rows.");
  if (prospectsTable && prospectsTable.rows.length === 0) state.warnings.push("Prospects file has no data rows.");

  if (companiesTable) {
    const headers = headerSet(companiesTable);
    for (const row of companiesTable.rows) applyCompanyRow(state, row, headers);
  }
  if (contactsTable) {
    const headers = headerSet(contactsTable);
    for (const row of contactsTable.rows) applyContactRow(state, row, headers);
  }
  if (prospectsTable) {
    for (const row of prospectsTable.rows) applyProspectRow(state, row);
  }

  const companyCounts = tally(bundle.companies, state.companies, state.touchedCompanies);
  const contactCounts = tally(bundle.contacts, state.contacts, state.touchedContacts);
  companyCounts.skipped = state.skipped.filter((skip) => skip.file === "companies").length;
  contactCounts.skipped =
    state.skipped.filter((skip) => skip.file === "contacts" || skip.file === "prospects").length;

  const suppressionContacts = state.contacts.filter((contact) => state.touchedContacts.has(contact.id));
  let suppressionsAdded = 0;
  let suppressionsRemoved = 0;
  const seenAdd = new Set<string>();
  const seenDrop = new Set<string>();
  for (const contact of suppressionContacts) {
    const edits = suppressionEdits(bundle.suppressions, contact, { retainExisting: true });
    for (const reason of edits.add) {
      const key = `${contact.email.toLowerCase()}|${reason}`;
      if (seenAdd.has(key)) continue;
      seenAdd.add(key);
      suppressionsAdded += 1;
    }
    for (const reason of edits.remove) {
      const key = `${contact.email.toLowerCase()}|${reason}`;
      if (seenDrop.has(key)) continue;
      seenDrop.add(key);
      suppressionsRemoved += 1;
    }
  }

  const changedCompanies = state.companies.filter((company) => {
    if (!state.touchedCompanies.has(company.id)) return false;
    const prior = bundle.companies.find((row) => row.id === company.id);
    return !prior || canonical(prior) !== canonical(company);
  });
  const changedContacts = state.contacts.filter((contact) => {
    if (!state.touchedContacts.has(contact.id)) return false;
    const prior = bundle.contacts.find((row) => row.id === contact.id);
    return !prior || canonical(prior) !== canonical(contact);
  });

  return {
    report: {
      dryRun: input.dryRun === true,
      workspaceId: input.workspaceId,
      companies: companyCounts,
      contacts: contactCounts,
      suppressionsAdded,
      suppressionsRemoved,
      warnings: state.warnings,
      skipped: state.skipped,
    },
    companies: changedCompanies,
    contacts: changedContacts,
    suppressionContacts,
  };
}

function applyCsvPlan(workspaceId: WorkspaceId, plan: CsvPlan): void {
  mutate((db) => {
    for (const company of plan.companies) mergeCompany(db, workspaceId, company);
    for (const contact of plan.contacts) mergeContact(db, workspaceId, contact);
    for (const contact of plan.suppressionContacts) {
      reconcileContactSuppression(db, workspaceId, contact, new Date().toISOString(), { retainExisting: true });
    }
  });
  writeCrmBlobs(
    workspaceId,
    "companies",
    plan.companies.map((company) => ({
      id: company.id,
      label: company.name || company.domain || company.id,
      json: JSON.stringify(company),
    })),
  );
  writeCrmBlobs(
    workspaceId,
    "contacts",
    plan.contacts.map((contact) => ({
      id: contact.id,
      label: `${contact.firstName} ${contact.lastName}`.trim() || contact.email || contact.id,
      json: JSON.stringify(contact),
    })),
  );
}

function applyCompanyRow(state: WorkingState, row: CsvRow, headers: Set<string>): void {
  const name = cell(row, "Company Name", "Account Name", "Business Name");
  const domain = websiteDomain(cell(row, "Domain") || cell(row, "Website"));
  const hubspot = canonicalHubspotId(cell(row, "HubSpot Record ID", "Record ID", "hs_object_id"));
  if (!name && !domain && !hubspot) {
    state.skipped.push({
      file: "companies",
      row: row.line,
      reason: "missing company name, domain, and HubSpot Record ID",
    });
    return;
  }
  const existing = findCompany(state.companies, hubspot, domain, name);
  const next = existing ? { ...existing } : blankCompany({ id: nextId("co"), name: name || domain || `Company ${hubspot}` });
  assignCompany(state, next, row, headers, { name, domain, hubspot });
  const normalized = normalizeCompany({ ...next, id: next.id, score: existing?.score ?? 0 });
  storeCompany(state, existing, normalized);
}

function assignCompany(
  state: WorkingState,
  company: Company,
  row: CsvRow,
  headers: Set<string>,
  identity: { name: string; domain: string; hubspot: string },
): void {
  if (hasHeader(headers, "Company Name", "Account Name", "Business Name")) {
    company.name = identity.name || company.name;
  }
  if (hasHeader(headers, "Domain", "Website")) company.domain = identity.domain || company.domain;
  if (hasHeader(headers, "Website")) company.website = cell(row, "Website");
  if (hasHeader(headers, "Phone")) company.phone = cell(row, "Phone");
  if (hasHeader(headers, "Industry")) company.industry = cell(row, "Industry");
  if (hasHeader(headers, "Company Type / Debt Roles", "Company Type", "Debt Roles")) {
    const raw = cell(row, "Company Type / Debt Roles", "Company Type", "Debt Roles");
    company.companyType = raw;
    company.debtRoles = splitTags(raw);
    company.type = normalizeCompanyKind(raw);
  }
  if (hasHeader(headers, "Description")) company.description = cell(row, "Description");
  if (hasHeader(headers, "Additional Preferences")) {
    company.additionalPreferences = cell(row, "Additional Preferences");
  }
  if (hasHeader(headers, "Street", "Address")) company.street = cell(row, "Street", "Address");
  if (hasHeader(headers, "City")) company.city = cell(row, "City");
  if (hasHeader(headers, "State")) company.state = normalizeState(cell(row, "State"));
  if (hasHeader(headers, "Zip", "Postal Code")) company.zip = cell(row, "Zip", "Postal Code");
  if (hasHeader(headers, "Country")) company.country = normalizeCountry(cell(row, "Country"));
  if (hasHeader(headers, "Employees")) company.employees = cell(row, "Employees");
  if (hasHeader(headers, "Year Founded")) company.yearFounded = cell(row, "Year Founded");
  if (hasHeader(headers, "Lead Status")) company.leadStatus = cell(row, "Lead Status");
  if (hasHeader(headers, "Lifecycle")) company.lifecycle = normalizeLifecycle(cell(row, "Lifecycle"));
  if (hasHeader(headers, "Owner")) {
    company.ownerName = cell(row, "Owner");
    company.ownerId = matchOwner(company.ownerName, state.users);
  }
  if (hasHeader(headers, "LinkedIn")) company.linkedin = cell(row, "LinkedIn");
  if (hasHeader(headers, "Target Account")) company.targetAccount = parseYes(cell(row, "Target Account")) === true;
  if (hasHeader(headers, "Close Date")) {
    const raw = cell(row, "Close Date");
    company.closeDate = raw ? parseDate(raw) ?? raw : null;
  }
  if (hasHeader(headers, "Notes")) company.notes = cell(row, "Notes").slice(0, 8000);
  if (hasHeader(headers, "HubSpot Record ID", "Record ID", "hs_object_id")) company.hubspotRecordId = identity.hubspot;
  if (hasHeader(headers, "Contact Count")) {
    const raw = cell(row, "Contact Count");
    const parsed = Number.parseInt(raw, 10);
    company.contactCount = raw && Number.isFinite(parsed) ? parsed : undefined;
  }
}

function applyContactRow(state: WorkingState, row: CsvRow, headers: Set<string>): void {
  const firstName = cell(row, "First Name");
  const lastName = cell(row, "Last Name");
  const email = firstEmail(firstNonEmpty(row, "Email", "contact_email", "Contact Email"));
  const hubspot = canonicalHubspotId(cell(row, "HubSpot Record ID", "Record ID", "hs_object_id"));
  const companyName = cell(row, "Company Name");
  if (!firstName && !lastName && !email && !hubspot) {
    state.skipped.push({
      file: "contacts",
      row: row.line,
      reason: "missing name, email, and HubSpot Record ID",
    });
    return;
  }
  const existing = findContact(state, hubspot, email, firstName, lastName, companyName);
  const next = existing
    ? { ...existing }
    : blankContact({ id: nextId("ct"), firstName, lastName, email, lastActivityAt: state.now });
  assignContact(state, next, row, headers, { firstName, lastName, email, hubspot, companyName });
  const normalized = normalizeContact({ ...next, id: next.id, score: existing?.score ?? next.score ?? 0 });
  storeContact(state, existing, normalized);
}

function assignContact(
  state: WorkingState,
  contact: Contact,
  row: CsvRow,
  headers: Set<string>,
  identity: { firstName: string; lastName: string; email: string; hubspot: string; companyName: string },
): void {
  if (hasHeader(headers, "First Name")) contact.firstName = identity.firstName;
  if (hasHeader(headers, "Last Name")) contact.lastName = identity.lastName;
  if (hasHeader(headers, "Email", "contact_email", "Contact Email")) contact.email = identity.email;
  if (hasHeader(headers, "Phone", "contact_phone", "Contact Phone")) {
    contact.phone = firstNonEmpty(row, "Phone", "contact_phone", "Contact Phone");
  }
  if (hasHeader(headers, "Mobile")) contact.mobile = cell(row, "Mobile");
  if (hasHeader(headers, "Job Title", "Title", "contact_title", "Contact Title")) {
    contact.title = firstNonEmpty(row, "Job Title", "Title", "contact_title", "Contact Title");
  }
  if (hasHeader(headers, "Website")) contact.website = cell(row, "Website");
  if (hasHeader(headers, "Street", "Address")) contact.street = cell(row, "Street", "Address");
  if (hasHeader(headers, "City")) contact.city = cell(row, "City");
  if (hasHeader(headers, "State")) contact.state = normalizeState(cell(row, "State"));
  if (hasHeader(headers, "Zip", "Postal Code")) contact.zip = cell(row, "Zip", "Postal Code");
  if (hasHeader(headers, "Country")) contact.country = normalizeCountry(cell(row, "Country"));
  if (hasHeader(headers, "LinkedIn", "contact_linkedin", "Contact LinkedIn")) {
    contact.linkedin = firstNonEmpty(row, "LinkedIn", "contact_linkedin", "Contact LinkedIn");
  }
  if (hasHeader(headers, "Lead Type")) contact.leadType = normalizeLeadType(cell(row, "Lead Type"));
  if (hasHeader(headers, "Stage")) {
    contact.stage = cell(row, "Stage");
    contact.lifecycle = contact.stage ? normalizeLifecycle(contact.stage) : contact.lifecycle;
  }
  if (hasHeader(headers, "Lead Source")) contact.leadSource = cell(row, "Lead Source");
  if (hasHeader(headers, "Owner")) {
    contact.ownerName = cell(row, "Owner");
    contact.ownerId = matchOwner(contact.ownerName ?? "", state.users);
  }
  if (hasHeader(headers, "Created Date")) {
    const created = parseDate(cell(row, "Created Date"));
    if (created) contact.createdAt = created;
  }
  if (hasHeader(headers, "Last Contacted")) {
    const last = parseDate(cell(row, "Last Contacted"));
    if (last) contact.lastActivityAt = `${last}T00:00:00.000Z`;
  }
  if (hasHeader(headers, "Asset Class Preference")) {
    contact.assetClassPreference = normalizeAssetClasses(cell(row, "Asset Class Preference"));
  }
  if (hasHeader(headers, "Budget")) contact.budget = cell(row, "Budget");
  if (hasHeader(headers, "Paper Age Preference")) contact.paperAgePreference = cell(row, "Paper Age Preference");
  if (hasHeader(headers, "Coverage")) contact.coverage = cell(row, "Coverage");
  if (hasHeader(headers, "Buying States")) contact.buyingStates = parseBuyingStates(cell(row, "Buying States"));
  if (hasHeader(headers, "Collect or Litigate")) contact.collectOrLitigate = cell(row, "Collect or Litigate");
  if (hasHeader(headers, "NDA Signed")) {
    contact.ndaSigned = parseNda(cell(row, "NDA Signed"), contact.ndaSigned ?? contact.createdAt ?? state.now.slice(0, 10));
  }
  if (hasHeader(headers, "Closed Deal")) {
    const parsed = parseClosedDeal(cell(row, "Closed Deal"));
    contact.closedDeal = parsed === true && typeof contact.closedDeal === "string" ? contact.closedDeal : parsed;
  }
  if (hasHeader(headers, "Desk Replied")) contact.deskReplied = parseYes(cell(row, "Desk Replied")) === true;
  if (hasHeader(headers, "Message Summary")) contact.messageSummary = cell(row, "Message Summary");
  if (hasHeader(headers, "Notes")) contact.notes = cell(row, "Notes").slice(0, 8000);
  contact.tags = mergeTags(contact.tags, splitTags(cell(row, "Tags", "Tag")), state.extraTags);
  if (hasHeader(headers, "HubSpot Record ID", "Record ID", "hs_object_id")) contact.hubspotRecordId = identity.hubspot;
  if (hasHeader(headers, "Source")) contact.source = cell(row, "Source");
  if (hasHeader(headers, "Reason", "Removal Reason")) {
    contact.removalReason = [cell(row, "Reason"), cell(row, "Removal Reason")].filter(Boolean).join(" — ");
  }

  const reason = `${contact.removalReason ?? ""} ${cell(row, "Reason")} ${cell(row, "Removal Reason")}`;
  const tags = contact.tags ?? [];
  contact.doNotEmail = Boolean(state.doNotEmail || indicatesDoNotEmail(reason, tags) || contact.doNotEmail);
  stickSuppression(state, contact);
  contact.emailStatus = resolveEmailStatus(state, headers, row, contact.emailStatus, reason, tags);

  const domain = contactDomain(row, contact.email);
  const linked = ensureCompany(state, domain, identity.companyName, contact);
  if (linked) contact.companyId = linked.id;
}

function applyProspectRow(state: WorkingState, row: CsvRow): void {
  const companyName = cell(row, "company", "Company");
  const website = cell(row, "website", "Website");
  const domain = websiteDomain(website);
  const email = firstEmail(firstNonEmpty(row, "email", "Email", "contact_email", "Contact Email"));
  const person = splitPersonName(cell(row, "contact_name", "Contact Name", "Name"));
  if (!companyName && !domain && !person.firstName && !person.lastName && !email) {
    state.skipped.push({
      file: "prospects",
      row: row.line,
      reason: "missing company, website, contact name, and email",
    });
    return;
  }
  const segment = cell(row, "segment", "Segment");
  const subType = cell(row, "sub_type", "Sub Type", "Subtype");
  const why = cell(row, "why_fit", "Why Fit");
  const sourceUrl = cell(row, "source_url", "Source URL");
  const confidence = cell(row, "confidence", "Confidence");
  const size = cell(row, "size_signal", "Size Signal");
  const hq = normalizeState(cell(row, "hq_state", "HQ State", "State"));
  let company = findCompany(state.companies, "", domain, companyName);
  if (companyName || domain) {
    if (!company) {
      company = normalizeCompany({
        ...blankCompany({ id: nextId("co"), name: companyName || domain }),
        domain,
        website,
        state: hq,
        type: normalizeCompanyKind(segment),
        notes: why,
      });
      state.companies.push(company);
      state.touchedCompanies.add(company.id);
    } else {
      const filled = normalizeCompany({
        ...company,
        id: company.id,
        name: company.name || companyName,
        domain: company.domain || domain,
        website: company.website || website,
        state: company.state || hq,
        notes: company.notes || why,
        score: company.score,
      });
      Object.assign(company, filled);
      state.touchedCompanies.add(company.id);
    }
  }
  if (!person.firstName && !person.lastName && !email) return;
  const existing = findContact(state, "", email, person.firstName, person.lastName, company?.name || companyName);
  const note = [sourceUrl, confidence ? `confidence ${confidence}` : ""].filter(Boolean).join("\n");
  const prospectSegment = [segment, subType].filter(Boolean).join(" / ");
  const next = existing
    ? { ...existing }
    : blankContact({
        id: nextId("ct"),
        firstName: person.firstName,
        lastName: person.lastName,
        email,
        lastActivityAt: state.now,
      });
  next.firstName = next.firstName || person.firstName;
  next.lastName = next.lastName || person.lastName;
  next.email = next.email || email;
  next.title = next.title || firstNonEmpty(row, "title", "Title", "contact_title", "Contact Title");
  next.phone = next.phone || firstNonEmpty(row, "phone", "Phone", "contact_phone", "Contact Phone");
  next.linkedin = next.linkedin || firstNonEmpty(row, "linkedin", "LinkedIn", "contact_linkedin", "Contact LinkedIn");
  next.state = next.state || hq;
  next.companyId = company?.id || next.companyId;
  next.prospectSegment = prospectSegment || next.prospectSegment;
  next.sizeSignal = size || next.sizeSignal;
  next.messageSummary = why || next.messageSummary;
  next.notes = note || next.notes;
  next.source = sourceUrl || next.source;
  next.leadSource = next.leadSource || "outbound prospect";
  next.leadType = next.leadType ?? normalizeLeadType(segment);
  const tags = new Set(next.tags ?? []);
  tags.add("outbound-prospect");
  if (segment) tags.add(segment);
  if (subType) tags.add(subType);
  for (const tag of splitTags(cell(row, "tags", "Tags", "Tag"))) tags.add(tag);
  for (const tag of state.extraTags) tags.add(tag);
  next.tags = [...tags];
  next.doNotEmail = Boolean(state.doNotEmail || next.doNotEmail);
  stickSuppression(state, next);
  if (state.invalidEmail) next.emailStatus = "invalid";
  const normalized = normalizeContact({ ...next, id: next.id, score: existing?.score ?? 0 });
  storeContact(state, existing, normalized);
}

function ensureCompany(state: WorkingState, domain: string, companyName: string, contact: Contact): Company | undefined {
  const usableDomain = domain && !isFreeMailDomain(domain) ? domain : "";
  if (!companyName && !usableDomain) return contact.companyId ? findCompanyById(state, contact.companyId) : undefined;
  const existing = findCompany(state.companies, "", usableDomain, companyName);
  if (existing) return existing;
  const created = normalizeCompany({
    ...blankCompany({ id: nextId("co"), name: companyName || usableDomain }),
    domain: usableDomain,
    website: contact.website || (usableDomain ? `https://${usableDomain}` : ""),
    type: normalizeCompanyKind(contact.leadType),
    city: contact.city,
    state: contact.state,
    street: contact.street,
    zip: contact.zip,
    country: contact.country,
    ownerId: contact.ownerId,
    ownerName: contact.ownerName,
    lifecycle: "lead",
    notes: "Created from contact import.",
  });
  state.companies.push(created);
  state.touchedCompanies.add(created.id);
  return created;
}

function resolveEmailStatus(
  state: WorkingState,
  headers: Set<string>,
  row: CsvRow,
  existing: EmailStatus | undefined,
  reason: string,
  tags: string[],
): EmailStatus {
  let status: EmailStatus = existing ?? "unknown";
  if (hasHeader(headers, "Email Status")) {
    const raw = cell(row, "Email Status");
    const parsed = raw ? normalizeEmailStatus(raw) : "unknown";
    if (parsed === "unknown" && (existing === "invalid" || existing === "bounced")) status = existing;
    else status = parsed;
  }
  if (status === "unknown" && /invalid email|undeliverable|email typo/.test(reason.toLowerCase())) status = "invalid";
  if (status === "unknown" && tags.some((tag) => /email-typo|invalid-email/i.test(tag))) status = "invalid";
  if (status === "unknown" && /bounced/.test(reason.toLowerCase())) status = "bounced";
  if (state.invalidEmail) status = "invalid";
  return status;
}

function contactDomain(row: CsvRow, email: string): string {
  const explicit = websiteDomain(cell(row, "Company Domain") || cell(row, "Website"));
  if (explicit) return explicit;
  const domain = emailDomain(email);
  return domain && !isFreeMailDomain(domain) ? domain : "";
}

function findCompany(companies: Company[], hubspot: string, domain: string, name: string): Company | undefined {
  if (hubspot) {
    const byId = companies.find((company) => hubspotOverlaps(company.hubspotRecordId, hubspot));
    if (byId) return byId;
  }
  const dom = websiteDomain(domain);
  if (dom && !isFreeMailDomain(dom)) {
    const byDomain = companies.find(
      (company) => websiteDomain(company.domain) === dom || websiteDomain(company.website ?? "") === dom,
    );
    if (byDomain) return byDomain;
  }
  const named = normName(name);
  if (!named) return undefined;
  return companies.find((company) => normName(company.name) === named);
}

function findCompanyById(state: WorkingState, id: string): Company | undefined {
  return state.companies.find((company) => company.id === id);
}

function findContact(
  state: WorkingState,
  hubspot: string,
  email: string,
  firstName: string,
  lastName: string,
  companyName: string,
): Contact | undefined {
  if (hubspot) {
    const byId = state.contacts.find((contact) => hubspotOverlaps(contact.hubspotRecordId, hubspot));
    if (byId) return byId;
  }
  if (email) {
    const byEmail = state.contacts.find((contact) => contact.email.toLowerCase() === email);
    if (byEmail) return byEmail;
  }
  if ((firstName || lastName) && companyName) {
    const key = `${normName(firstName)}|${normName(lastName)}|${normName(companyName)}`;
    return state.contacts.find((contact) => personKey(state, contact) === key);
  }
  return undefined;
}

function personKey(state: WorkingState, contact: Contact): string {
  const company = state.companies.find((item) => item.id === contact.companyId);
  return `${normName(contact.firstName)}|${normName(contact.lastName)}|${normName(company?.name ?? "")}`;
}

function storeCompany(state: WorkingState, existing: Company | undefined, company: Company): void {
  if (existing) {
    const index = state.companies.findIndex((item) => item.id === existing.id);
    if (index >= 0) state.companies[index] = company;
  } else {
    state.companies.push(company);
  }
  state.touchedCompanies.add(company.id);
}

function storeContact(state: WorkingState, existing: Contact | undefined, contact: Contact): void {
  if (existing) {
    const index = state.contacts.findIndex((item) => item.id === existing.id);
    if (index >= 0) state.contacts[index] = contact;
  } else {
    state.contacts.push(contact);
  }
  state.touchedContacts.add(contact.id);
}

function matchOwner(name: string, users: User[]): string {
  const target = normName(name);
  if (!target) return "";
  const found = users.find(
    (user) => normName(user.name) === target || user.email.toLowerCase() === name.trim().toLowerCase(),
  );
  return found?.id ?? "";
}

function mergeTags(existing: string[] | undefined, column: string[], extra: string[]): string[] {
  return [...new Set([...(existing ?? []), ...column, ...extra].map((tag) => tag.trim()).filter(Boolean))];
}

function stickSuppression(state: WorkingState, contact: Contact): void {
  const email = contact.email.trim().toLowerCase();
  if (email && state.suppressedEmails.has(email)) contact.doNotEmail = true;
}

function firstNonEmpty(row: CsvRow, ...names: string[]): string {
  for (const name of names) {
    const value = cell(row, name).trim();
    if (value) return value;
  }
  return "";
}

function firstEmail(value: string): string {
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? "";
}

function isProspectTable(table: CsvTable): boolean {
  const headers = headerSet(table);
  if (headers.has("first name")) return false;
  return (
    headers.has("segment") ||
    headers.has("why_fit") ||
    headers.has("size_signal") ||
    (headers.has("contact_name") && headers.has("company")) ||
    headers.has("contact_email") ||
    headers.has("contact_title") ||
    headers.has("contact_linkedin") ||
    headers.has("contact_phone")
  );
}

function canonical(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, item]) => [key, sortValue(item)]));
  }
  return value;
}

function tally<T extends { id: string }>(original: T[], next: T[], touched: Set<string>): ImportCounts {
  const before = new Map(original.map((row) => [row.id, canonical(row)]));
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  for (const row of next) {
    if (!touched.has(row.id)) continue;
    const prior = before.get(row.id);
    if (prior === undefined) created += 1;
    else if (prior === canonical(row)) unchanged += 1;
    else updated += 1;
  }
  return { created, updated, unchanged, skipped: 0 };
}
