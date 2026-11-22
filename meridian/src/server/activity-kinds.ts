export const ACTIVITY_KINDS = ["inbound", "outbound", "draft", "nda", "note"] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export function parseActivityKind(value: unknown): ActivityKind | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  switch (text) {
    case "inbound":
    case "outbound":
    case "draft":
    case "nda":
    case "note":
      return text;
    case "email":
      return "inbound";
    default:
      return null;
  }
}

/** Create a contact only when the address is new, creation was requested, and it is not suppressed. */
export function shouldCreateContact(input: {
  exists: boolean;
  suppressed: boolean;
  allowCreate: boolean;
}): boolean {
  if (input.exists || input.suppressed || !input.allowCreate) return false;
  return true;
}
