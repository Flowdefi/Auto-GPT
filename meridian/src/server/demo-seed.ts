/** Demo CRM rows are inserted unless this is explicitly turned off. */
export function demoSeedEnabled(): boolean {
  const raw = process.env.MERIDIAN_SEED_DEMO;
  if (raw === undefined || raw.trim() === "") return true;
  switch (raw.trim().toLowerCase()) {
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return true;
  }
}
