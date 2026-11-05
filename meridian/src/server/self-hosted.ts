/** True when this process is the owner box and Polar seat checks should not block it. */
export function selfHosted(): boolean {
  const raw = (process.env.MERIDIAN_SELF_HOSTED ?? "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
