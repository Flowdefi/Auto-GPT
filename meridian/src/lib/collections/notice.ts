import type { PortfolioAccount } from "./types";
import { validationEndDate } from "./validation-period";

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
    citation: "12 CFR § 1006.34(b)(5). Assumed receipt is five days after sending, excluding Saturdays, Sundays, and legal public holidays, and the validation period ends 30 days after that date. The holiday list follows 5 U.S.C. § 6103 and needs counsel review.",
    needsCounselReview: true,
  };
}

export function disputeDeadline(mailedAtIso: string): string {
  return validationEndDate(mailedAtIso.slice(0, 10));
}
