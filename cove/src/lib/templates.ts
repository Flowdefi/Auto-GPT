import { money } from "./format";
import type { Account, MessageTemplate } from "./types";

export const TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl_sms_intro",
    channel: "sms",
    name: "First contact + portal link",
    body:
      "{{agency}}: this is a debt collector attempting to collect a debt. Re: {{creditor}} acct ending {{last4}}, balance {{balance}}. Pay or set a plan: {{payUrl}}. Reply STOP to opt out.",
    requiresValidation: false,
    approvedBy: "Priya Shah",
    approvedAt: "2026-08-14",
  },
  {
    id: "tpl_sms_plan",
    channel: "sms",
    name: "Plan offer — payday anchored",
    body:
      "{{agency}} (debt collector): we can set {{first}} up on a plan starting your next payday on the {{creditor}} account ending {{last4}}. Start here: {{payUrl}}. Reply STOP to opt out.",
    requiresValidation: true,
    approvedBy: "Priya Shah",
    approvedAt: "2026-08-14",
  },
  {
    id: "tpl_sms_receipt",
    channel: "sms",
    name: "Payment receipt",
    body:
      "{{agency}}: payment received. Remaining balance {{balance}}. Receipt in your portal: {{payUrl}}. Reply STOP to opt out.",
    requiresValidation: false,
    approvedBy: "Priya Shah",
    approvedAt: "2026-08-14",
  },
  {
    id: "tpl_email_validation",
    channel: "email",
    name: "Validation / itemization (Reg F)",
    subject: "Your {{creditor}} account ending {{last4}} — itemization and your rights",
    body:
      "{{first}},\n\nThis is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.\n\nCreditor: {{creditor}}\nAccount ending: {{last4}}\nItemization date: {{chargeOff}}\nAmount on the itemization date: {{original}}\nCurrent amount: {{balance}}\n\nIf you dispute this debt, or any part of it, in writing within 30 days, we will stop collection until we mail you verification. You may also request the name and address of the original creditor.\n\nPay or set a plan any time at {{payUrl}}.\n\n{{agency}}",
    requiresValidation: false,
    approvedBy: "Priya Shah",
    approvedAt: "2026-08-02",
  },
  {
    id: "tpl_email_plan",
    channel: "email",
    name: "Plan confirmation",
    subject: "Your payment plan on the account ending {{last4}}",
    body:
      "{{first}},\n\nConfirming the arrangement we discussed on the {{creditor}} account ending {{last4}}. Current balance is {{balance}}.\n\nYou can change or cancel the plan at {{payUrl}} at any time, or reply to this email.\n\nThis is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.\n\n{{agency}}",
    requiresValidation: true,
    approvedBy: "Priya Shah",
    approvedAt: "2026-08-02",
  },
  {
    id: "tpl_letter_settlement",
    channel: "letter",
    name: "Settlement offer (written, no expiry pressure)",
    subject: "Settlement offer — account ending {{last4}}",
    body:
      "{{first}},\n\nWe are authorized to accept {{settlement}} as full settlement on the {{creditor}} account ending {{last4}}, current balance {{balance}}. On payment we will report the account settled in full and cease collection.\n\nThis offer does not expire without written notice to you.\n\nThis is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.\n\n{{agency}}",
    requiresValidation: true,
    approvedBy: "Priya Shah",
    approvedAt: "2026-08-22",
  },
];

export const AGENCY_NAME = "TF Recovery";

export function payUrlFor(account: Account, origin = ""): string {
  return `${origin}/pay/${account.portalCode}`;
}

export function renderTemplate(
  template: MessageTemplate,
  account: Account,
  origin = "",
): { subject?: string; body: string } {
  const values: Record<string, string> = {
    agency: AGENCY_NAME,
    first: account.firstName,
    last: account.lastName,
    creditor: account.originalCreditor,
    last4: account.last4,
    balance: money(account.balance),
    original: money(account.original),
    chargeOff: account.chargeOff,
    settlement: money(Math.round(account.balance * 0.6)),
    payUrl: payUrlFor(account, origin),
  };
  const fill = (input: string) =>
    input.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
  return {
    subject: template.subject ? fill(template.subject) : undefined,
    body: fill(template.body),
  };
}

export function templateBlocked(template: MessageTemplate, account: Account): string | null {
  if (template.requiresValidation && !account.validationSent) {
    return "Validation notice has not gone out. Reg F blocks this template until it does.";
  }
  return null;
}
