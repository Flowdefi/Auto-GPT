/** True when MERIDIAN_SELF_HOSTED is an explicit on-value. Unset stays on the paid seat. */
export function selfHostedFlag(value: string | undefined): boolean {
  const raw = (value ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" || raw === "on";
}

export function selfHosted(): boolean {
  return selfHostedFlag(process.env.MERIDIAN_SELF_HOSTED);
}
