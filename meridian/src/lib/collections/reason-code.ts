/** Bucket a gate sentence into a label that contains no consumer data. */
export function reasonCode(reason: string): string {
  const text = reason.toLowerCase();
  if (text.includes("kill switch")) return "kill_switch";
  if (text.includes("outside 8")) return "calling_window";
  if (text.includes("conversation")) return "conversation_wait";
  if (text.includes("seven telephone")) return "seven_in_seven";
  if (text.includes("consent")) return "consent";
  if (text.includes("reassigned")) return "reassigned";
  if (text.includes("not eligible") || text.includes("quarantine")) return "eligibility";
  if (text.includes("returned mail")) return "returned_mail";
  if (text.includes("do-not-call")) return "dnc";
  if (text.includes("marked") || text.includes("ceased") || text.includes("disputed")) return "account_hold";
  if (text.includes("cap")) return "daily_cap";
  if (text.includes("template")) return "template";
  if (text.includes("scra") || text.includes("active duty")) return "scra";
  if (text.includes("training")) return "training";
  return "other";
}
