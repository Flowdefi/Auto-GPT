export type LicensePosture = "none" | "bond_or_registration" | "license";

export interface StateRule {
  code: string;
  name: string;
  posture: LicensePosture;
  note: string;
}

/**
 * State-level third-party collection agency license posture.
 * Sourced from public licensing summaries (Cornerstone / Harbor, 2026).
 * Not legal advice. Local city licenses (Chicago, NYC, Buffalo, Yonkers) still apply.
 * Federal FDCPA, TCPA, FCRA, and CFPB rules always apply.
 */
export const STATE_RULES: StateRule[] = [
  { code: "AL", name: "Alabama", posture: "license", note: "State collection license required." },
  { code: "AK", name: "Alaska", posture: "license", note: "State collection license required." },
  { code: "AZ", name: "Arizona", posture: "license", note: "NMLS collection agency license." },
  { code: "AR", name: "Arkansas", posture: "license", note: "State collection license required." },
  { code: "CA", name: "California", posture: "license", note: "DFPI Debt Collection Licensing Act." },
  { code: "CO", name: "Colorado", posture: "bond_or_registration", note: "AG notification model — not treated as license-free." },
  { code: "CT", name: "Connecticut", posture: "license", note: "State collection license required." },
  { code: "DE", name: "Delaware", posture: "license", note: "Treat as licensed / verify before outreach." },
  { code: "DC", name: "District of Columbia", posture: "license", note: "Verify current DC rules before outreach." },
  { code: "FL", name: "Florida", posture: "bond_or_registration", note: "OFR consumer collection agency registration." },
  { code: "GA", name: "Georgia", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "HI", name: "Hawaii", posture: "license", note: "State collection license required." },
  { code: "ID", name: "Idaho", posture: "license", note: "State collection license required." },
  { code: "IL", name: "Illinois", posture: "license", note: "ICAA licensing and bonding. Chicago may add local rules." },
  { code: "IN", name: "Indiana", posture: "license", note: "State collection license required." },
  { code: "IA", name: "Iowa", posture: "license", note: "State collection license required." },
  { code: "KS", name: "Kansas", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "KY", name: "Kentucky", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "LA", name: "Louisiana", posture: "license", note: "State collection license required." },
  { code: "ME", name: "Maine", posture: "license", note: "State collection license required." },
  { code: "MD", name: "Maryland", posture: "license", note: "State collection license required." },
  { code: "MA", name: "Massachusetts", posture: "license", note: "State collection license required." },
  { code: "MI", name: "Michigan", posture: "license", note: "Collection Practices Act licensing." },
  { code: "MN", name: "Minnesota", posture: "license", note: "State collection license required." },
  { code: "MS", name: "Mississippi", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "MO", name: "Missouri", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "MT", name: "Montana", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "NE", name: "Nebraska", posture: "license", note: "State collection license required." },
  { code: "NV", name: "Nevada", posture: "license", note: "State collection license required." },
  { code: "NH", name: "New Hampshire", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "NJ", name: "New Jersey", posture: "license", note: "DCA collection licensure." },
  { code: "NM", name: "New Mexico", posture: "license", note: "State collection license required." },
  { code: "NY", name: "New York", posture: "license", note: "DFS / NYC local layer. Do not dial without license." },
  { code: "NC", name: "North Carolina", posture: "license", note: "State collection license required." },
  { code: "ND", name: "North Dakota", posture: "license", note: "State collection license required." },
  { code: "OH", name: "Ohio", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "OK", name: "Oklahoma", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "OR", name: "Oregon", posture: "license", note: "State collection license required." },
  { code: "PA", name: "Pennsylvania", posture: "license", note: "Treat as licensed / verify before outreach." },
  { code: "RI", name: "Rhode Island", posture: "license", note: "State collection license required." },
  { code: "SC", name: "South Carolina", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "SD", name: "South Dakota", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "TN", name: "Tennessee", posture: "license", note: "Collection Service Board license." },
  { code: "TX", name: "Texas", posture: "bond_or_registration", note: "Surety bond filing with SOS — not license-free." },
  { code: "UT", name: "Utah", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "VT", name: "Vermont", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "VA", name: "Virginia", posture: "none", note: "No state-level collection agency license. FDCPA still applies." },
  { code: "WA", name: "Washington", posture: "license", note: "DFI Collection Agency Act license." },
  { code: "WV", name: "West Virginia", posture: "license", note: "State collection license required." },
  { code: "WI", name: "Wisconsin", posture: "license", note: "State collection license required." },
  { code: "WY", name: "Wyoming", posture: "license", note: "State collection license required." },
];

export const OPEN_STATES = STATE_RULES.filter((rule) => rule.posture === "none").map((rule) => rule.code);

export function ruleFor(code: string): StateRule | undefined {
  return STATE_RULES.find((rule) => rule.code === code);
}

export function canDialState(code: string): boolean {
  return ruleFor(code)?.posture === "none";
}
