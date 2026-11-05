/** Comma-separated owner inbox list. Empty entries are ignored. */
export function ownerEmails(): string[] {
  const seen = new Set<string>();
  for (const part of (process.env.MERIDIAN_OWNER_EMAILS ?? "").split(",")) {
    const email = part.trim().toLowerCase();
    if (!email.includes("@") || email.length > 180) continue;
    seen.add(email);
  }
  return [...seen];
}

export function isOwnerEmail(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean) return false;
  return ownerEmails().includes(clean);
}
