import { canDialState, ruleFor } from "./states";
import type { Account } from "./types";

const MINI_MIRANDA =
  "This is an attempt to collect a debt and any information obtained will be used for that purpose. This communication is from a debt collector.";

export function miniMiranda(): string {
  return MINI_MIRANDA;
}

export function localHour(timezone: string, at = new Date()): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(at),
  );
  return Number.isFinite(hour) ? hour : at.getHours();
}

export function inCallWindow(account: Account, at = new Date()): boolean {
  const hour = localHour(account.timezone, at);
  return hour >= 8 && hour < 21;
}

export function outreachBlock(account: Account, channel: "call" | "sms" | "email"): string | null {
  const rule = ruleFor(account.state);
  if (!rule || !canDialState(account.state)) {
    return `State ${account.state} is not on the no-license allowlist. ${rule?.note ?? "License required."}`;
  }
  if (account.cease) return "Cease-and-desist is on file. No outreach.";
  if (account.dnc) return "Number is on DNC / do-not-contact.";
  if (account.timeBarred) return "Account flagged time-barred. No demand language; legal review only.";
  if (channel === "call" && !account.consent.voice) return "No TCPA voice consent on file.";
  if (channel === "sms" && !account.consent.sms) return "No TCPA SMS consent on file.";
  if (channel === "email" && !account.consent.email) return "No email consent on file.";
  if (channel === "call" && !inCallWindow(account)) {
    return `Outside 8am–9pm in ${account.timezone}.`;
  }
  if (account.nextCallAfter && channel === "call" && Date.now() < new Date(account.nextCallAfter).getTime()) {
    return "Cool-down window after last attempt.";
  }
  return null;
}

export function firstPartySafeCopy(body: string): string {
  return `${MINI_MIRANDA}\n\n${body}`;
}
