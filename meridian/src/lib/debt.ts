import type {
  AssetClass,
  Company,
  CompanyKind,
  Contact,
  EmailStatus,
  LeadType,
  Lifecycle,
} from "./types";

export const LEAD_TYPES: LeadType[] = ["buyer", "seller", "broker", "partner", "other"];

export const ASSET_CLASSES: AssetClass[] = [
  "credit card",
  "auto deficiency",
  "medical",
  "personal/installment",
  "commercial/B2B",
  "telecom",
  "private student",
  "fintech/BNPL/payday",
  "judgments",
  "other",
];

export const EMAIL_STATUSES: EmailStatus[] = ["valid", "invalid", "bounced", "unknown"];

export const COMPANY_KINDS: CompanyKind[] = [
  "seller",
  "buyer",
  "broker",
  "partner",
  "issuer",
  "fund",
  "exchange",
  "market_maker",
  "other",
];

export const LIFECYCLES: Lifecycle[] = [
  "subscriber",
  "lead",
  "mql",
  "sql",
  "opportunity",
  "customer",
  "evangelist",
];

export const US_STATES: Array<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const STATE_BY_NAME = new Map(US_STATES.map((state) => [state.name.toLowerCase(), state.code]));
const STATE_CODES = new Set(US_STATES.map((state) => state.code));

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

const ASSET_ALIASES: Array<[string, AssetClass]> = [
  ["fintech/bnpl/payday", "fintech/BNPL/payday"],
  ["buy now pay later", "fintech/BNPL/payday"],
  ["personal/installment", "personal/installment"],
  ["personal installment", "personal/installment"],
  ["private student", "private student"],
  ["student loan", "private student"],
  ["auto deficiency", "auto deficiency"],
  ["commercial/b2b", "commercial/B2B"],
  ["credit cards", "credit card"],
  ["credit card", "credit card"],
  ["bank card", "credit card"],
  ["installment", "personal/installment"],
  ["personal loan", "personal/installment"],
  ["consumer loan", "personal/installment"],
  ["judgements", "judgments"],
  ["judgement", "judgments"],
  ["judgments", "judgments"],
  ["judgment", "judgments"],
  ["commercial", "commercial/B2B"],
  ["healthcare", "medical"],
  ["medical", "medical"],
  ["fintech", "fintech/BNPL/payday"],
  ["payday", "fintech/BNPL/payday"],
  ["bnpl", "fintech/BNPL/payday"],
  ["telecom", "telecom"],
  ["wireless", "telecom"],
  ["student", "private student"],
  ["b2b", "commercial/B2B"],
  ["auto", "auto deficiency"],
  ["other", "other"],
];

export function isFreeMailDomain(domain: string): boolean {
  return FREE_MAIL.has(domain.toLowerCase().replace(/^www\./, ""));
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).toLowerCase().trim();
}

export function websiteDomain(value: string): string {
  let host = value.trim().toLowerCase();
  if (!host) return "";
  host = host.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  host = host.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  return host.replace(/\.$/, "");
}

export function normalizeState(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (STATE_CODES.has(upper)) return upper;
  return STATE_BY_NAME.get(raw.toLowerCase().replace(/\./g, "")) ?? raw;
}

export function parseBuyingStates(value: string): string[] {
  const raw = value.trim();
  if (!raw) return [];
  const tokens = raw
    .split(/[,;|/]|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (
    tokens.some((token) =>
      /^(nationwide|national|all states|usa?|united states|50 states|continental us)$/i.test(token),
    )
  ) {
    return US_STATES.map((state) => state.code);
  }
  const codes: string[] = [];
  for (const token of tokens) {
    const code = normalizeState(token);
    if (STATE_CODES.has(code) && !codes.includes(code)) codes.push(code);
  }
  return codes;
}

export function normalizeLeadType(value: string | undefined): LeadType | undefined {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return undefined;
  if (/(looking to buy|buyer|purchaser|debt buyer)/.test(raw)) return "buyer";
  if (/(seller|creditor|originator)/.test(raw)) return "seller";
  if (/broker/.test(raw)) return "broker";
  if (/partner/.test(raw)) return "partner";
  if (LEAD_TYPES.includes(raw as LeadType)) return raw as LeadType;
  return "other";
}

export function normalizeCompanyKind(value: string | undefined): CompanyKind {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "other";
  if (/market maker/.test(raw)) return "market_maker";
  if (/exchange/.test(raw)) return "exchange";
  if (/issuer/.test(raw)) return "issuer";
  if (/fund/.test(raw)) return "fund";
  if (/broker/.test(raw)) return "broker";
  if (/partner/.test(raw)) return "partner";
  if (/(seller|creditor|originator)/.test(raw)) return "seller";
  if (/(buyer|collector|purchaser)/.test(raw)) return "buyer";
  if (COMPANY_KINDS.includes(raw as CompanyKind)) return raw as CompanyKind;
  return "other";
}

export function normalizeLifecycle(value: string | undefined): Lifecycle {
  const raw = (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (!raw) return "lead";
  if (raw === "marketingqualifiedlead" || raw === "mql") return "mql";
  if (raw === "salesqualifiedlead" || raw === "sql") return "sql";
  if (raw === "opportunity" || raw === "opp") return "opportunity";
  if (raw === "customer" || raw === "buyer" || raw === "closedwon" || raw === "closed") return "customer";
  if (raw === "evangelist") return "evangelist";
  if (raw === "subscriber") return "subscriber";
  if (raw === "lead" || raw === "other") return "lead";
  if (LIFECYCLES.includes(raw as Lifecycle)) return raw as Lifecycle;
  return "lead";
}

export function normalizeEmailStatus(value: string | undefined): EmailStatus {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "unknown";
  if (/(bounce|bounced)/.test(raw)) return "bounced";
  if (/(invalid|undeliverable|bad|dead|typo)/.test(raw)) return "invalid";
  if (/(valid|deliverable|ok|good)/.test(raw)) return "valid";
  if (EMAIL_STATUSES.includes(raw as EmailStatus)) return raw as EmailStatus;
  return "unknown";
}

function consumeAlias(text: string, alias: string): string | null {
  let from = 0;
  while (from <= text.length) {
    const idx = text.indexOf(alias, from);
    if (idx === -1) return null;
    const before = text[idx - 1] ?? " ";
    const after = text[idx + alias.length] ?? " ";
    if (/[^a-z0-9]/.test(before) && /[^a-z0-9]/.test(after)) {
      return `${text.slice(0, idx)} ${text.slice(idx + alias.length)}`;
    }
    from = idx + alias.length;
  }
  return null;
}

export function normalizeAssetClasses(value: string | string[] | undefined): AssetClass[] {
  const text = (Array.isArray(value) ? value.join("; ") : (value ?? "")).toLowerCase();
  if (!text.trim()) return [];
  let rest = ` ${text} `;
  const found: AssetClass[] = [];
  const aliases = [...ASSET_ALIASES].sort((a, b) => b[0].length - a[0].length);
  for (const [alias, canonical] of aliases) {
    const next = consumeAlias(rest, alias);
    if (next !== null) {
      if (!found.includes(canonical)) found.push(canonical);
      rest = next;
    }
  }
  return found.length > 0 ? found : ["other"];
}

export function parseDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const mdy = raw.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/);
  if (mdy?.[1] && mdy[2] && mdy[3]) {
    const year = mdy[3].length === 2 ? `20${mdy[3]}` : mdy[3];
    const month = mdy[1].padStart(2, "0");
    const day = mdy[2].padStart(2, "0");
    const candidate = `${year}-${month}-${day}`;
    const date = new Date(`${candidate}T00:00:00Z`);
    if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === candidate) return candidate;
  }
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed) && /[a-z]/i.test(raw)) return new Date(parsed).toISOString().slice(0, 10);
  return null;
}

export function parseYes(value: string): boolean | null {
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (["y", "yes", "true", "1", "signed", "closed", "x"].includes(raw)) return true;
  if (["n", "no", "false", "0"].includes(raw)) return false;
  return null;
}

export function parseNda(value: string, fallbackDate: string | null): string | null {
  const date = parseDate(value);
  if (date) return date;
  return parseYes(value) === true ? fallbackDate : null;
}

export function parseClosedDeal(value: string): boolean | string | null {
  const yes = parseYes(value);
  if (yes === true) return true;
  if (yes === false) return false;
  return parseDate(value);
}

export function splitTags(value: string): string[] {
  if (!value.trim()) return [];
  const parts = value.split(/[;,|]/).map((part) => part.trim()).filter(Boolean);
  return [...new Set(parts)];
}

export function hubspotIds(value: string | undefined): string[] {
  if (!value) return [];
  const ids = value
    .split(/[;,]+/)
    .map((part) => part.trim().replace(/^=+/, "").replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, ""))
    .filter(Boolean);
  return [...new Set(ids)];
}

export function canonicalHubspotId(value: string | undefined): string {
  return hubspotIds(value).join("; ");
}

export function hubspotOverlaps(left: string | undefined, right: string | undefined): boolean {
  const ids = new Set(hubspotIds(left));
  if (ids.size === 0) return false;
  return hubspotIds(right).some((id) => ids.has(id));
}

export function normName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeCountry(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^(us|usa|u\.s\.a?\.?|united states of america)$/i.test(raw)) return "United States";
  return raw;
}

export function safeHttpUrl(value: string | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function splitPersonName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0] ?? "", lastName: "" };
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export function indicatesDoNotEmail(reason: string, tags: string[]): boolean {
  const blob = `${reason} ${tags.join(" ")}`.toLowerCase();
  return /do[-\s]?not[-\s]?(email|contact)|unsubscribe|opt[-\s]?out|\bdnc\b|no-email|do-not-email/.test(blob);
}

export function blankContact(partial: Partial<Contact> = {}): Contact {
  return {
    id: partial.id ?? "",
    firstName: partial.firstName ?? "",
    lastName: partial.lastName ?? "",
    email: partial.email ?? "",
    phone: partial.phone ?? "",
    title: partial.title ?? "",
    companyId: partial.companyId ?? "",
    ownerId: partial.ownerId ?? "",
    lifecycle: partial.lifecycle ?? "lead",
    score: partial.score ?? 0,
    city: partial.city ?? "",
    state: partial.state ?? "",
    lastActivityAt: partial.lastActivityAt ?? new Date().toISOString(),
    tags: partial.tags ?? [],
    mobile: partial.mobile ?? "",
    website: partial.website ?? "",
    street: partial.street ?? "",
    zip: partial.zip ?? "",
    country: partial.country ?? "",
    linkedin: partial.linkedin ?? "",
    leadType: partial.leadType,
    stage: partial.stage ?? "",
    leadSource: partial.leadSource ?? "",
    ownerName: partial.ownerName ?? "",
    createdAt: partial.createdAt,
    assetClassPreference: partial.assetClassPreference ?? [],
    budget: partial.budget ?? "",
    paperAgePreference: partial.paperAgePreference ?? "",
    coverage: partial.coverage ?? "",
    buyingStates: partial.buyingStates ?? [],
    collectOrLitigate: partial.collectOrLitigate ?? "",
    ndaSigned: partial.ndaSigned ?? null,
    closedDeal: partial.closedDeal ?? null,
    deskReplied: partial.deskReplied ?? false,
    emailStatus: partial.emailStatus ?? "unknown",
    doNotEmail: partial.doNotEmail ?? false,
    hubspotRecordId: partial.hubspotRecordId ?? "",
    messageSummary: partial.messageSummary ?? "",
    notes: partial.notes ?? "",
    source: partial.source ?? "",
    removalReason: partial.removalReason ?? "",
    prospectSegment: partial.prospectSegment ?? "",
    sizeSignal: partial.sizeSignal ?? "",
  };
}

export function blankCompany(partial: Partial<Company> = {}): Company {
  return {
    id: partial.id ?? "",
    name: partial.name ?? "",
    domain: partial.domain ?? "",
    type: partial.type ?? "other",
    industry: partial.industry ?? "",
    city: partial.city ?? "",
    state: partial.state ?? "",
    employees: partial.employees ?? "",
    ownerId: partial.ownerId ?? "",
    lifecycle: partial.lifecycle ?? "lead",
    score: partial.score ?? 0,
    notes: partial.notes ?? "",
    companyType: partial.companyType ?? "",
    debtRoles: partial.debtRoles ?? [],
    targetAccount: partial.targetAccount ?? false,
    website: partial.website ?? "",
    linkedin: partial.linkedin ?? "",
    phone: partial.phone ?? "",
    description: partial.description ?? "",
    additionalPreferences: partial.additionalPreferences ?? "",
    street: partial.street ?? "",
    zip: partial.zip ?? "",
    country: partial.country ?? "",
    yearFounded: partial.yearFounded ?? "",
    leadStatus: partial.leadStatus ?? "",
    ownerName: partial.ownerName ?? "",
    closeDate: partial.closeDate ?? null,
    hubspotRecordId: partial.hubspotRecordId ?? "",
    contactCount: partial.contactCount,
  };
}

export function isCompanyKind(value: string): value is CompanyKind {
  return COMPANY_KINDS.includes(value as CompanyKind);
}

export function contactMatchesState(contact: Contact, code: string): boolean {
  if (!code) return true;
  if (normalizeState(contact.state) === code) return true;
  return (contact.buyingStates ?? []).includes(code);
}

export function isNdaSigned(contact: Contact): boolean {
  return Boolean(contact.ndaSigned);
}

function defined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function normalizeContact(input: Partial<Contact> & Pick<Contact, "id">): Contact {
  const base = blankContact(input);
  const email = base.email.trim().toLowerCase();
  const assetSource = input.assetClassPreference ?? base.assetClassPreference;
  const stateSource = input.buyingStates ?? base.buyingStates;
  return {
    ...base,
    id: input.id,
    firstName: base.firstName.trim(),
    lastName: base.lastName.trim(),
    email,
    phone: base.phone.trim(),
    mobile: base.mobile?.trim() ?? "",
    title: base.title.trim(),
    companyId: base.companyId.trim(),
    ownerId: base.ownerId.trim(),
    ownerName: base.ownerName?.trim() ?? "",
    lifecycle: normalizeLifecycle(base.lifecycle),
    score: Number.isFinite(base.score) ? base.score : 0,
    city: base.city.trim(),
    state: normalizeState(base.state),
    street: base.street?.trim() ?? "",
    zip: base.zip?.trim() ?? "",
    country: normalizeCountry(base.country ?? ""),
    website: base.website?.trim() ?? "",
    linkedin: base.linkedin?.trim() ?? "",
    leadType: normalizeLeadType(base.leadType),
    stage: base.stage?.trim() ?? "",
    leadSource: base.leadSource?.trim() ?? "",
    assetClassPreference: normalizeAssetClasses(assetSource),
    budget: base.budget?.trim() ?? "",
    paperAgePreference: base.paperAgePreference?.trim() ?? "",
    coverage: base.coverage?.trim() ?? "",
    buyingStates: Array.isArray(stateSource)
      ? [...new Set(stateSource.map((state) => normalizeState(state)).filter((state) => STATE_CODES.has(state)))]
      : parseBuyingStates(String(stateSource ?? "")),
    collectOrLitigate: base.collectOrLitigate?.trim() ?? "",
    ndaSigned: base.ndaSigned ? parseDate(base.ndaSigned) : null,
    closedDeal:
      typeof base.closedDeal === "boolean" || base.closedDeal == null
        ? (base.closedDeal ?? null)
        : parseClosedDeal(base.closedDeal),
    deskReplied: base.deskReplied === true,
    emailStatus: normalizeEmailStatus(base.emailStatus),
    doNotEmail: base.doNotEmail === true,
    hubspotRecordId: canonicalHubspotId(base.hubspotRecordId),
    messageSummary: base.messageSummary?.trim() ?? "",
    notes: (base.notes ?? "").trim().slice(0, 8000),
    source: base.source?.trim() ?? "",
    removalReason: base.removalReason?.trim() ?? "",
    prospectSegment: base.prospectSegment?.trim() ?? "",
    sizeSignal: base.sizeSignal?.trim() ?? "",
    tags: (base.tags ?? []).map((tag) => tag.trim()).filter(Boolean),
    lastActivityAt: base.lastActivityAt || new Date().toISOString(),
    createdAt: base.createdAt ? parseDate(base.createdAt) ?? base.createdAt : undefined,
  };
}

export function normalizeCompany(input: Partial<Company> & Pick<Company, "id">): Company {
  const base = blankCompany(input);
  const roles = base.debtRoles?.length
    ? base.debtRoles
    : splitTags(base.companyType ?? "");
  const kindSource = [base.type, base.companyType, ...roles].filter(defined).join(" ");
  return {
    ...base,
    id: input.id,
    name: base.name.trim(),
    domain: websiteDomain(base.domain || base.website || ""),
    type: base.type && base.type !== "other" ? normalizeCompanyKind(base.type) : normalizeCompanyKind(kindSource),
    industry: base.industry.trim(),
    city: base.city.trim(),
    state: normalizeState(base.state),
    employees: base.employees.trim(),
    ownerId: base.ownerId.trim(),
    ownerName: base.ownerName?.trim() ?? "",
    lifecycle: normalizeLifecycle(base.lifecycle),
    score: Number.isFinite(base.score) ? base.score : 0,
    notes: base.notes.trim().slice(0, 8000),
    companyType: base.companyType?.trim() ?? "",
    debtRoles: roles.map((role) => role.trim()).filter(Boolean),
    targetAccount: base.targetAccount === true,
    website: base.website?.trim() ?? "",
    linkedin: base.linkedin?.trim() ?? "",
    phone: base.phone?.trim() ?? "",
    description: base.description?.trim() ?? "",
    additionalPreferences: base.additionalPreferences?.trim() ?? "",
    street: base.street?.trim() ?? "",
    zip: base.zip?.trim() ?? "",
    country: normalizeCountry(base.country ?? ""),
    yearFounded: base.yearFounded?.trim() ?? "",
    leadStatus: base.leadStatus?.trim() ?? "",
    closeDate: base.closeDate ? parseDate(base.closeDate) ?? base.closeDate : null,
    hubspotRecordId: canonicalHubspotId(base.hubspotRecordId),
    contactCount:
      base.contactCount === undefined || !Number.isFinite(base.contactCount)
        ? undefined
        : Math.max(0, Math.round(base.contactCount)),
  };
}
