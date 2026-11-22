/**
 * Consumer-local calling window. 12 CFR § 1006.6 treats times before 8:00 a.m.
 * and after 9:00 p.m. local time as inconvenient unless the consumer agrees
 * otherwise. States that span time zones need a ZIP. Unknown ZIPs are refused
 * rather than guessed. The ZIP map is an approximation and needs counsel review.
 */

const SINGLE_ZONE: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  DC: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  IA: "America/Chicago",
  IL: "America/Chicago",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  OH: "America/New_York",
  OK: "America/Chicago",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
};

function zip3(zip: string): string {
  return zip.trim().slice(0, 3);
}

function multiZone(code: string, zip: string): string | null {
  const prefix = zip3(zip);
  if (!/^\d{3}/.test(prefix)) return null;
  if (code === "TX") {
    if (prefix === "798" || prefix === "799" || prefix === "885") return "America/Denver";
    if (prefix >= "750" && prefix <= "799") return "America/Chicago";
    return null;
  }
  if (code === "FL") {
    if (prefix === "323" || prefix === "324" || prefix === "325") return "America/Chicago";
    if ((prefix >= "320" && prefix <= "322") || (prefix >= "326" && prefix <= "349")) return "America/New_York";
    return null;
  }
  if (code === "TN") {
    if (prefix >= "370" && prefix <= "385") return "America/Chicago";
    return null;
  }
  if (code === "KY") {
    if (prefix >= "400" && prefix <= "427") return "America/New_York";
    return null;
  }
  if (code === "IN") {
    if (prefix >= "460" && prefix <= "479") return "America/Indiana/Indianapolis";
    return null;
  }
  return null;
}

export function consumerTimeZone(state: string, zip: string): { zone: string } | { error: string } {
  const code = state.trim().toUpperCase();
  const single = SINGLE_ZONE[code];
  if (single) return { zone: single };
  const mapped = multiZone(code, zip);
  if (mapped) return { zone: mapped };
  if (!zip.trim()) {
    return { error: `${code || "This state"} spans more than one time zone. A consumer ZIP is required before calling.` };
  }
  return { error: `No reviewed time zone for ${code} ZIP ${zip.trim()}. The call is blocked instead of guessing local time.` };
}

export function localHourMinute(now: Date, zone: string): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "NaN");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "NaN");
  return { hour, minute };
}

/** True when local time is 8:00 a.m. through 8:59 p.m. After 9:00 p.m. is blocked. */
export function withinCallingWindow(now: Date, zone: string): boolean {
  const { hour, minute } = localHourMinute(now, zone);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  if (hour < 8) return false;
  if (hour > 20) return false;
  return true;
}
