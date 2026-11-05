import type { PortfolioAccount } from "./types";

function money(cents: number | undefined): string {
  return `$${((cents ?? 0) / 100).toFixed(2)}`;
}

/** Text version of the Reg F validation information. Layout is not the CFPB model form. */
export function validationNotice(account: PortfolioAccount, agency: string): { body: string; citation: string; needsCounselReview: true } {
  const body = [
    `${agency}`,
    `Validation information for reference ${account.accountRef}.`,
    `This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.`,
    `Original creditor: ${account.originalCreditor || "not supplied"}`,
    `Seller / placer: ${account.sellerName}`,
    `Chain of title: ${account.chainOfTitle || "not supplied"}`,
    `Itemization date: ${account.itemizationDate || "not supplied"}`,
    `Amount on the itemization date: ${money(account.itemizationAmountCents)}`,
    `Payments since itemization: ${money(account.paymentsSinceItemizationCents)}`,
    `Credits since itemization: ${money(account.creditsSinceItemizationCents)}`,
    `Fees since itemization: ${money(account.feesSinceItemizationCents)}`,
    `Current amount: ${money(account.balanceCents)}`,
    `Account ending: ${account.last4 || "not supplied"}`,
    `If you dispute this debt, or any part of it, write to us within 30 days after you receive this notice. We will stop collection until we mail verification. You may ask for the name and address of the original creditor.`,
    `Counsel must confirm this text against the current CFPB model validation notice before it is mailed.`,
  ].join("\n");
  return {
    body,
    citation: "12 CFR § 1006.34 (validation information and the 30-day validation period). Itemization content is § 1006.34(c). Receipt may be presumed under the regulation; this build uses mail date plus 35 days and marks that assumption for counsel.",
    needsCounselReview: true,
  };
}

export function disputeDeadline(mailedAtIso: string): string {
  const date = new Date(mailedAtIso);
  date.setUTCDate(date.getUTCDate() + 35);
  return date.toISOString().slice(0, 10);
}
