import { readdirSync, readFileSync, existsSync } from "fs";
import path from "path";
import type { PortfolioAccount, TemplateChannel } from "./types";
import type { MergeValue } from "./mustache";
import { validationEndDate, withinValidationPeriod } from "./validation-period";
import { consumerTimeZone, withinCallingWindow } from "./time";

export interface ParsedTemplateFile {
  id: string;
  channel: TemplateChannel;
  name: string;
  subject: string;
  body: string;
  sourceFile: string;
  needsCounselReview: boolean;
  limitedContent: boolean;
  purpose: string;
  mergeFields: string[];
  requiredDisclosures: string[];
  sendRules: string[];
  legalCitations: string[];
}

export interface MatrixNumber {
  value: number;
  is_default?: boolean;
}

export interface SettlementTier {
  tier_id: string;
  match: { months_since_chargeoff?: [number, number]; balance?: [number, number]; time_barred?: boolean; hardship_reported?: boolean };
  applies_on_top_of_base_tier?: boolean;
  opening_offer_pct?: MatrixNumber;
  floor_pct?: MatrixNumber;
  additional_discount_pct_points?: MatrixNumber;
  absolute_floor_pct?: MatrixNumber;
}

export interface SettlementMatrix {
  version?: string;
  global_rules?: Record<string, { value: unknown; is_default?: boolean }>;
  tiers: SettlementTier[];
  needs_counsel_review?: boolean;
  customized?: boolean;
}

export interface SettlementOffer {
  tierId: string;
  openingCents: number;
  floorCents: number;
  usesDefaults: boolean;
  blockedReason: string | null;
}

const LIBRARY = path.join(process.cwd(), "templates", "collections");

const FORBIDDEN = [
  "ssn",
  "social_security",
  "ssn_last4",
  "dob",
  "date_of_birth",
  "full_account_number",
  "account_number",
  "card_number",
  "pan",
  "cvv",
  "routing_number",
  "bank_account_number",
  "pin",
  "password",
];

export function libraryRoot(): string {
  return LIBRARY;
}

export function parseFrontMatter(raw: string): { meta: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match?.[1]) return { meta: {}, body: raw.trim() };
  const meta: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const splitAt = line.indexOf(":");
    if (splitAt <= 0) continue;
    const key = line.slice(0, splitAt).trim();
    const rawValue = line.slice(splitAt + 1).trim();
    if (!key || !rawValue) continue;
    if (rawValue.startsWith("[") || rawValue.startsWith("{") || rawValue === "true" || rawValue === "false") {
      meta[key] = JSON.parse(rawValue) as unknown;
      continue;
    }
    meta[key] = rawValue.startsWith('"') ? (JSON.parse(rawValue) as string) : rawValue;
  }
  return { meta, body: (match[2] ?? "").trim() };
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function asChannel(value: unknown): TemplateChannel {
  const channel = String(value ?? "letter");
  const allowed: TemplateChannel[] = ["letter", "letter_block", "email", "sms", "voice", "voice_ai", "voicemail", "validation", "chat"];
  return allowed.includes(channel as TemplateChannel) ? (channel as TemplateChannel) : "letter";
}

export function parseTemplateFile(sourceFile: string, raw: string): ParsedTemplateFile {
  const { meta, body } = parseFrontMatter(raw);
  return {
    id: String(meta.id ?? sourceFile.replace(/\.md$/, "")),
    channel: asChannel(meta.channel),
    name: String(meta.title ?? meta.name ?? sourceFile),
    subject: String(meta.subject ?? ""),
    body,
    sourceFile,
    needsCounselReview: meta.needs_counsel_review !== false,
    limitedContent: sourceFile.includes("limited-content"),
    purpose: String(meta.purpose ?? ""),
    mergeFields: asStringList(meta.merge_fields),
    requiredDisclosures: asStringList(meta.required_disclosures),
    sendRules: asStringList(meta.send_rules),
    legalCitations: asStringList(meta.legal_citations),
  };
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...walkFiles(full));
    else if (entry.name.endsWith(".md") && entry.name.toLowerCase() !== "readme.md") found.push(full);
  }
  return found;
}

export function loadTemplateFiles(root = LIBRARY): ParsedTemplateFile[] {
  return walkFiles(root).map((file) => parseTemplateFile(path.relative(root, file), readFileSync(file, "utf8")));
}

export function forbiddenFieldHits(template: ParsedTemplateFile): string[] {
  const tokens = [...template.body.matchAll(/\{\{\s*[#^/]?([a-z0-9_]+)\s*\}\}/gi)].map((match) => (match[1] ?? "").toLowerCase());
  const names = new Set([...template.mergeFields.map((field) => field.toLowerCase()), ...tokens]);
  return FORBIDDEN.filter((field) => names.has(field));
}

function money(cents: number | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

function monthsBetween(from: string | null | undefined, today: Date): number {
  if (!from) return 0;
  const start = new Date(`${from.slice(0, 10)}T00:00:00.000Z`);
  return (today.getUTCFullYear() - start.getUTCFullYear()) * 12 + (today.getUTCMonth() - start.getUTCMonth());
}

export function loadSettlementMatrix(root = LIBRARY): SettlementMatrix {
  const raw = JSON.parse(readFileSync(path.join(root, "settlement-matrix.json"), "utf8")) as SettlementMatrix;
  return raw;
}

export function validateSettlementMatrix(matrix: SettlementMatrix): void {
  for (const tier of matrix.tiers) {
    const opening = tier.opening_offer_pct?.value;
    const floor = tier.floor_pct?.value;
    if (opening !== undefined && (!Number.isFinite(opening) || opening < 0 || opening > 100)) {
      throw new Error(`Opening percent for ${tier.tier_id} must be between 0 and 100`);
    }
    if (floor !== undefined && (!Number.isFinite(floor) || floor < 0 || floor > 100)) {
      throw new Error(`Floor percent for ${tier.tier_id} must be between 0 and 100`);
    }
    if (opening !== undefined && floor !== undefined && floor > opening) {
      throw new Error(`Floor percent for ${tier.tier_id} cannot be above the opening percent`);
    }
  }
}

export function clearMatrixDefaults(matrix: SettlementMatrix): SettlementMatrix {
  const next = structuredClone(matrix);
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    if ("is_default" in record) record.is_default = false;
    Object.values(record).forEach(visit);
  };
  visit(next);
  next.customized = true;
  return next;
}

function numberValue(field: MatrixNumber | undefined): number {
  return field?.value ?? 0;
}

function fieldIsDefault(field: MatrixNumber | undefined): boolean {
  return field?.is_default !== false;
}

export function settlementOffer(account: PortfolioAccount, matrix: SettlementMatrix, now = new Date()): SettlementOffer {
  const balance = account.balanceCents;
  const months = monthsBetween(account.chargeOffDate, now);
  const timeBarred = Boolean(account.solExpiresOn && account.solExpiresOn < now.toISOString().slice(0, 10));
  const base = matrix.tiers.find((tier) => {
    if (tier.applies_on_top_of_base_tier) return false;
    if (timeBarred && tier.match.time_barred !== true) return false;
    if (tier.match.time_barred === true) return timeBarred;
    if (tier.match.time_barred === false && timeBarred) return false;
    const monthRange = tier.match.months_since_chargeoff;
    const balanceRange = tier.match.balance;
    if (monthRange && (months < monthRange[0] || months > monthRange[1])) return false;
    if (balanceRange && (balance / 100 < balanceRange[0] || balance / 100 > balanceRange[1])) return false;
    return Boolean(monthRange || balanceRange);
  });
  const hardship = matrix.tiers.find((tier) => tier.tier_id === "HARDSHIP");
  const openingPct = numberValue(base?.opening_offer_pct);
  const floorPct = numberValue(base?.floor_pct);
  let opening = Math.round(balance * (openingPct / 100));
  let floor = Math.round(balance * (floorPct / 100));
  let usesDefaults = fieldIsDefault(base?.opening_offer_pct) || fieldIsDefault(base?.floor_pct);
  if (account.hardshipReported && hardship) {
    const cut = numberValue(hardship.additional_discount_pct_points);
    opening = Math.max(0, opening - Math.round(balance * (cut / 100)));
    const absolute = Math.round(balance * (numberValue(hardship.absolute_floor_pct) / 100));
    floor = Math.max(absolute, floor - Math.round(balance * (cut / 100)));
    usesDefaults = usesDefaults || fieldIsDefault(hardship.additional_discount_pct_points);
  }
  const blockedReason = !base
    ? "No settlement tier matches this account."
    : usesDefaults
      ? "Settlement matrix values are still the packaged defaults. An owner has to set them before an offer can be sent."
      : null;
  return {
    tierId: base?.tier_id ?? "none",
    openingCents: opening,
    floorCents: floor,
    usesDefaults,
    blockedReason,
  };
}

export interface MergeContext {
  values: Record<string, MergeValue>;
  validationEnd: string | null;
  offer: SettlementOffer | null;
}

export function mergeContext(input: {
  account: PortfolioAccount;
  agencyName: string;
  domain?: string;
  now?: Date;
  matrix?: SettlementMatrix;
  extra?: Record<string, MergeValue>;
}): MergeContext {
  const now = input.now ?? new Date();
  const today = now.toISOString().slice(0, 10);
  const mailed = input.account.validationMailedAt ?? null;
  const end = mailed ? validationEndDate(mailed) : null;
  const offer = input.matrix ? settlementOffer(input.account, input.matrix, now) : null;
  const firstName = input.account.consumerName.split(/\s+/)[0];
  const paymentsKnown = input.account.paymentsSinceItemizationCents != null || input.account.creditsSinceItemizationCents != null;
  const paymentsCredits = (input.account.paymentsSinceItemizationCents ?? 0) + (input.account.creditsSinceItemizationCents ?? 0);
  const host = input.domain?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "example.test";
  const values: Record<string, MergeValue> = {
    agency_name: input.agencyName,
    agency_name_caps: input.agencyName.toUpperCase(),
    agency_legal_name: input.agencyName,
    agency_mailing_address: "PO Box 100, Example City, OH 44101",
    agency_phone: "1-800-555-0199",
    agency_hours: "weekdays 9 a.m. to 5 p.m. Eastern",
    agency_website: `https://${host}`,
    agency_email: `consumer@${host}`,
    portal_url: `https://${host}/collect`,
    dispute_portal_url: `https://${host}/collect`,
    email_optout_link: `https://${host}/u/example-token`,
    account_ref: input.account.accountRef,
    account_last4: input.account.last4 || "0000",
    account_type: "credit card",
    consumer_name: input.account.consumerName,
    consumer_first_name: firstName || "Example",
    consumer_state: input.account.state,
    consumer_mailing_address: `1 Example Street\n${input.account.state} ${input.account.zip}`,
    current_creditor: input.account.sellerName || "Example Creditor",
    original_creditor: input.account.originalCreditor || "Example Bank",
    creditor_on_itemization_date: input.account.originalCreditor || "Example Bank",
    current_balance: money(input.account.balanceCents),
    amount_on_itemization_date: input.account.itemizationAmountCents == null ? "not supplied" : money(input.account.itemizationAmountCents),
    interest_since_itemization: input.account.interestSinceItemizationCents == null ? "not supplied" : money(input.account.interestSinceItemizationCents),
    fees_since_itemization: input.account.feesSinceItemizationCents == null ? "not supplied" : money(input.account.feesSinceItemizationCents),
    payments_credits_since_itemization: paymentsKnown ? money(paymentsCredits) : "not supplied",
    itemization_date: input.account.itemizationDate || today,
    itemization_date_basis: "charge-off",
    notice_date: mailed ? mailed.slice(0, 10) : today,
    letter_date: today,
    message_date: today,
    validation_end_date: end ?? "",
    within_validation_period: end ? withinValidationPeriod(mailed, today) : false,
    time_barred: Boolean(input.account.solExpiresOn && input.account.solExpiresOn < today),
    accepts_electronic_disputes: true,
    collector_name: "Example Collector",
    ai_agent_name: "Example Assistant",
    is_ai_agent: false,
    settlement_amount: offer ? money(offer.openingCents) : "",
    offer_expiration_date: "",
    ...input.extra,
  };
  if (offer) {
    const expiration = new Date(now);
    expiration.setUTCDate(expiration.getUTCDate() + 30);
    values.offer_expiration_date = expiration.toISOString().slice(0, 10);
    values.lump_sum_amount = money(offer.openingCents);
    values.settlement_amount = money(offer.openingCents);
    values.min_plan_payment = "25.00";
  }
  return { values, validationEnd: end, offer };
}

export function sampleMergeData(fields: Iterable<string>): Record<string, MergeValue> {
  const values: Record<string, MergeValue> = {};
  for (const field of fields) {
    if (/^(is_|has_|accepts_|within_|furnishes_|dispute_|time_barred$|recurring_)/.test(field)) values[field] = true;
    else if (field.endsWith("_date") || field.includes("date")) values[field] = "2026-04-08";
    else if (/amount|balance|payment|pct|total|sum/.test(field)) values[field] = "25.00";
    else if (field.endsWith("_url") || field.endsWith("_link")) values[field] = "https://example.test/collect";
    else values[field] = `Example ${field.replaceAll("_", " ")}`;
  }
  values.agency_name = "Example Collections";
  values.consumer_first_name = "Ada";
  values.consumer_name = "Ada Example";
  values.account_ref = "DEMO-OH-1001";
  values.account_last4 = "1001";
  values.validation_end_date = "2026-04-08";
  return values;
}

export interface SendRuleInput {
  templateId: string;
  rules: string[];
  account: PortfolioAccount;
  channel: "letter" | "email" | "sms" | "voice_outbound" | "voicemail_drop";
  now: Date;
  values: Record<string, MergeValue>;
  offer: SettlementOffer | null;
  priorLetterAt: string | null;
  smsConsent: boolean;
  emailConsent: boolean;
  reassigned: "ok" | "reassigned" | "unknown";
}

export function sendRuleBlocks(input: SendRuleInput): string[] {
  const reasons: string[] = [];
  const today = input.now.toISOString().slice(0, 10);
  const end = String(input.values.validation_end_date ?? "");
  const inValidation = Boolean(end) && today <= end;
  const text = input.rules.join("\n");
  const mentions = (snippet: string) => input.rules.some((rule) => rule.includes(snippet));

  if (mentions("8 a.m") && (input.channel === "sms" || input.channel === "voice_outbound" || input.channel === "voicemail_drop")) {
    const zone = consumerTimeZone(input.account.state, input.account.zip);
    if ("error" in zone) reasons.push(zone.error);
    else if (!withinCallingWindow(input.now, zone.zone)) reasons.push(`Outside 8:00 a.m.–9:00 p.m. in ${zone.zone}.`);
  }
  if (mentions("prior express consent") || mentions("1006.6(d)(5)")) {
    if (input.channel === "sms" && !input.smsConsent) reasons.push("SMS send rule requires stored consent.");
    if (input.reassigned === "reassigned") reasons.push("Reassigned-number check failed.");
    if (input.channel === "sms" && input.reassigned === "unknown") reasons.push("Reassigned-number check is not configured.");
  }
  if (mentions("employer-provided") && input.account.employerEmail) {
    reasons.push("Email address is marked as employer-provided.");
  }
  if (mentions("1006.6(d)(4)") && input.channel === "email" && !input.emailConsent) {
    reasons.push("Email send rule requires stored consent.");
  }
  if ((mentions("Block if today <= validation_end_date") || mentions("Not during validation period") || mentions("Not sent during validation period") || mentions("Same block conditions as LTR-002")) && inValidation) {
    reasons.push(`Blocked during the validation period, which ends ${end} under 12 CFR § 1006.34(b)(5).`);
  }
  if (mentions("open dispute, cease, attorney")) {
    const held = ["disputed", "ceased", "attorney", "bankruptcy", "deceased", "military", "quarantined", "returned"];
    if (held.includes(input.account.status)) reasons.push(`Account is ${input.account.status}.`);
  }
  if (mentions("time-barred") && mentions("litigation") && input.values.time_barred === true) {
    reasons.push("Time-barred account cannot use a template that reserves litigation wording.");
  }
  if (mentions("settlement-matrix floor") || mentions("within settlement-matrix")) {
    if (!input.offer) reasons.push("No settlement offer is available for this account.");
    else if (input.offer.blockedReason) reasons.push(input.offer.blockedReason);
    else if (input.offer.openingCents < input.offer.floorCents) reasons.push("Opening offer is below the settlement-matrix floor.");
  }
  const dayMatch = input.rules.find((rule) => /Minimum (\d+) days/.test(rule));
  if (dayMatch && input.priorLetterAt) {
    const days = Number(/Minimum (\d+) days/.exec(dayMatch)?.[1] ?? "0");
    const elapsed = input.now.getTime() - new Date(input.priorLetterAt).getTime();
    if (elapsed < days * 24 * 60 * 60 * 1000) reasons.push(dayMatch);
  }
  if (input.templateId === "LTR-074" && !input.account.attorneyName) {
    reasons.push("Attorney acknowledgment can only be addressed to a recorded attorney.");
  }
  if (input.templateId === "LTR-070" && input.account.status !== "bankruptcy") {
    reasons.push("Bankruptcy acknowledgment requires the bankruptcy flag.");
  }
  if (input.templateId === "LTR-050" && input.account.status !== "ceased") {
    reasons.push("Cease acknowledgment requires the cease flag.");
  }
  if (input.channel === "email" && mentions("must not reveal debt") && /\b(debt|balance|past due|collection)\b/i.test(String(input.values.subject_preview ?? input.values.subject ?? ""))) {
    reasons.push("Email subject reveals the debt.");
  }
  if (text.includes("Itemization fields may never be blank")) {
    for (const field of ["amount_on_itemization_date", "interest_since_itemization", "fees_since_itemization", "payments_credits_since_itemization", "current_balance"]) {
      if (!String(input.values[field] ?? "").trim()) reasons.push(`${field} is blank.`);
    }
  }
  return [...new Set(reasons)];
}

export function templateSendChannel(channel: TemplateChannel): SendRuleInput["channel"] {
  switch (channel) {
    case "email":
      return "email";
    case "sms":
      return "sms";
    case "voice":
    case "voice_ai":
      return "voice_outbound";
    case "voicemail":
      return "voicemail_drop";
    case "letter":
    case "letter_block":
    case "validation":
    case "chat":
      return "letter";
    default: {
      const exhaustive: never = channel;
      return exhaustive;
    }
  }
}
