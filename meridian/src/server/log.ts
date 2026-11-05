const SSN = /\b\d{3}-?\d{2}-?\d{4}\b/g;
const CARD = /\b(?:\d[ -]*?){13,19}\b/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

/** Social Security numbers and card numbers. Email addresses are left in place. */
export function redactIdentifiers(value: string): string {
  return value.replace(SSN, "[redacted]").replace(CARD, "[redacted]");
}

/** Structured log line. Digit-heavy identifiers and email addresses are redacted. */
export function redact(value: string): string {
  return redactIdentifiers(value).replace(EMAIL, "[redacted-email]");
}

export function logEvent(event: string, fields: Record<string, string | number | boolean | null> = {}): void {
  const safe: Record<string, string | number | boolean | null> = { event, at: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    safe[key] = typeof value === "string" ? redact(value).slice(0, 300) : value;
  }
  console.log(JSON.stringify(safe));
}
