import type { StateEligibility, TriState } from "./types";

export const ELIGIBILITY_REVIEWED = "2026-11-05";

const CHART = "https://cornerstonelicensing.com/debt-collection-state-laws";

/**
 * Operational rule from the owner: collect only where neither a third-party
 * collector license nor a debt-buyer license is required, plus Texas.
 * Uncertain license questions stay ineligible until counsel clears them.
 * This is not a legal opinion.
 */
export function policyEligible(row: Pick<StateEligibility, "code" | "collectorLicenseRequired" | "debtBuyerLicenseRequired">): boolean {
  if (row.code === "TX") return true;
  if (row.collectorLicenseRequired === true || row.debtBuyerLicenseRequired === true) return false;
  if (row.collectorLicenseRequired === "uncertain" || row.debtBuyerLicenseRequired === "uncertain") return false;
  return true;
}

function row(partial: Omit<StateEligibility, "lastReviewed" | "eligible"> & { eligible?: boolean }): StateEligibility {
  const base = { ...partial, lastReviewed: ELIGIBILITY_REVIEWED };
  return { ...base, eligible: partial.eligible ?? policyEligible(base) };
}

function licensed(code: string, name: string, citation: string, url = CHART): StateEligibility {
  return row({
    code,
    name,
    collectorLicenseRequired: true,
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration: "A license or registration is required before collecting. Bond amount was not re-verified from the statute in this pass.",
    citation,
    citationUrl: url,
    needsCounselReview: true,
    notes:
      "Ineligible. Vendor chart reviewed 2026-11-05 lists a collector license. Confirm the statute and whether debt buyers are covered before any expansion. Not legal advice.",
  });
}

export const STATE_ELIGIBILITY_SEED: StateEligibility[] = [
  licensed("AL", "Alabama", "Collection-agency license listed as required. Confirm the current Alabama privilege-license or regulator page."),
  licensed("AK", "Alaska", "Collection-agency license listed as required (Alaska Division of Banking & Securities)."),
  licensed("AZ", "Arizona", "Collection-agency license listed as required (Arizona Department of Financial Institutions)."),
  licensed("AR", "Arkansas", "Collection-agency license listed as required."),
  licensed(
    "CA",
    "California",
    "Debt Collection Licensing Act, Cal. Fin. Code § 100000 et seq. DFPI license covers debt collectors and debt buyers.",
    "https://dfpi.ca.gov/debt-collection-licensee/",
  ),
  licensed("CO", "Colorado", "Collection-agency license listed as required (Colorado Attorney General). Confirm the debt-buyer overlay."),
  licensed("CT", "Connecticut", "Collection-agency license listed as required (Connecticut Department of Banking)."),
  licensed("DE", "Delaware", "Collection-agency license listed as required (Delaware Office of the State Bank Commissioner)."),
  licensed("DC", "District of Columbia", "Collection-agency license listed as required (DISB)."),
  licensed(
    "FL",
    "Florida",
    "Consumer collection agency registration, Fla. Stat. § 559.553 (Office of Financial Regulation). Registration is treated as a license requirement.",
    "https://www.flsenate.gov/Laws/Statutes/2025/559.553",
  ),
  row({
    code: "GA",
    name: "Georgia",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "No collection-agency bond found. O.C.G.A. § 10-6-100 bonds bill-payment agents, not collectors.",
    citation:
      "No collection-agency licensing statute found. Georgia Department of Banking and Finance debt-collection page disclaims jurisdiction. Conduct: O.C.G.A. § 10-1-393 (Fair Business Practices Act).",
    citationUrl: "https://dbf.georgia.gov/debt-collection",
    needsCounselReview: true,
    notes:
      "Eligible for ordinary third-party collection on this review. Counsel must confirm the Georgia Installment Loan Act (O.C.G.A. § 7-3) does not require a lender license for the specific paper, especially small installment loans. Municipal rules are not in this table.",
  }),
  licensed("HI", "Hawaii", "Collection-agency license listed as required (Hawaii DCCA)."),
  licensed("ID", "Idaho", "Collection-agency license listed as required (Idaho Department of Finance)."),
  licensed("IL", "Illinois", "Collection-agency license listed as required. Chicago may add a city license."),
  licensed("IN", "Indiana", "Collection-agency license listed as required."),
  licensed("IA", "Iowa", "Collection-agency license listed as required."),
  row({
    code: "KS",
    name: "Kansas",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration: "No collection-agency bond found. A supervised-loan assignee may need a license and bond under the UCCC.",
    citation:
      "No collection-agency licensing statute found in the KSA index review. K.S.A. 16a-2-301 may require a supervised-loan license for an assignee who collects consumer loans above the rate threshold. Conduct: Kansas Consumer Protection Act, K.S.A. 50-623 et seq.",
    citationUrl: "https://www.ksrevisor.gov/statutes/chapters/ch16a/016a_002_0301.html",
    needsCounselReview: true,
    notes:
      "Not eligible. Contingency collection appears unlicensed, but this operation buys portfolios. Counsel must decide whether the purchased paper is a supervised loan or other consumer-credit transaction that an unlicensed assignee cannot collect.",
  }),
  row({
    code: "KY",
    name: "Kentucky",
    collectorLicenseRequired: "uncertain",
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration: "Not established.",
    citation: "No collection-agency license was found on the 2026-11-05 Cornerstone chart ('none on record'). A primary statute was not re-read in this pass.",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Held out of the eligible set until counsel confirms there is no collector or debt-buyer license.",
  }),
  licensed("LA", "Louisiana", "Collection-agency license listed as required."),
  licensed("ME", "Maine", "Collection license listed as required (Maine Bureau of Consumer Credit Protection). Confirm the debt-buyer category."),
  licensed("MD", "Maryland", "Collection-agency license listed as required."),
  licensed("MA", "Massachusetts", "Collection-agency license listed as required (Massachusetts Division of Banks)."),
  licensed("MI", "Michigan", "Collection Practices Act license listed as required (Michigan DIFS)."),
  licensed("MN", "Minnesota", "Collection-agency license listed as required (Minnesota Department of Commerce)."),
  row({
    code: "MS",
    name: "Mississippi",
    collectorLicenseRequired: "uncertain",
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration: "Not established.",
    citation: "No collection-agency license was found on the 2026-11-05 Cornerstone chart ('none on record'). A primary statute was not re-read in this pass.",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Held out of the eligible set until counsel confirms there is no collector or debt-buyer license.",
  }),
  row({
    code: "MO",
    name: "Missouri",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation: "No collection-agency license listed (Missouri Attorney General consumer protection). Confirm there is no separate debt-buyer statute.",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Eligible on the 'no license found' review. Counsel should confirm debt-buyer and municipal overlays before go-live.",
  }),
  row({
    code: "MT",
    name: "Montana",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation: "No collection-agency license listed (Montana Attorney General consumer protection).",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Eligible on the 'no license found' review. Montana is also treated as an all-party call-recording state; see the recording rule.",
  }),
  licensed("NE", "Nebraska", "Collection-agency license listed as required."),
  licensed("NV", "Nevada", "Collection-agency license listed as required (Nevada Financial Institutions Division)."),
  row({
    code: "NH",
    name: "New Hampshire",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation: "No collection-agency license listed (New Hampshire Attorney General consumer protection).",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Eligible on the 'no license found' review. New Hampshire is also treated as an all-party call-recording state.",
  }),
  licensed("NJ", "New Jersey", "Collection license listed as required (New Jersey Department of Banking and Insurance)."),
  licensed("NM", "New Mexico", "Collection-agency license listed as required."),
  licensed("NY", "New York", "Debt-collector license listed as required. New York City has an additional city license."),
  licensed("NC", "North Carolina", "Collection-agency license listed as required (North Carolina Department of Insurance)."),
  licensed("ND", "North Dakota", "Collection-agency license listed as required."),
  row({
    code: "OH",
    name: "Ohio",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation:
      "Ohio SBDC collection-agency checklist: no state licensing requirement. Conduct statutes cited there: ORC 1319.12 and 1319.16, plus the Consumer Sales Practices Act, ORC 1345.",
    citationUrl: "https://codes.ohio.gov/ohio-revised-code/section-1319.12",
    needsCounselReview: true,
    notes: "Eligible. Counsel should re-read ORC 1319.12 and 1319.16 to confirm they are conduct rules and not a license, and confirm no debt-buyer license exists.",
  }),
  row({
    code: "OK",
    name: "Oklahoma",
    collectorLicenseRequired: "uncertain",
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration: "Not established.",
    citation: "No collection-agency license was found on the 2026-11-05 Cornerstone chart ('none on record'). A primary statute was not re-read in this pass.",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Held out of the eligible set until counsel confirms there is no collector or debt-buyer license.",
  }),
  licensed("OR", "Oregon", "Collection-agency license listed as required (Oregon Division of Financial Regulation)."),
  row({
    code: "PA",
    name: "Pennsylvania",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration:
      "No general collection bond. Collector-repossessors of motor-vehicle installment contracts need a Department of Banking and Securities license and a $5,000 bond (12 Pa.C.S. §§ 6211, 6213).",
    citation:
      "Fair Credit Extension Uniformity Act, Act of Mar. 28, 2000, P.L. 23, No. 7 (73 P.S. § 2270.1 et seq.) is a conduct statute and has no licensing section. 12 Pa.C.S. § 6211 licenses collector-repossessors.",
    citationUrl: "https://www.legis.state.pa.us/WU01/LI/LI/US/HTM/2000/0/0007..HTM",
    needsCounselReview: true,
    notes:
      "Not eligible by default. General consumer collection appears unlicensed, but auto-deficiency paper may be a motor-vehicle installment contract that requires the collector-repossessor license. Counsel must clear the book mix before Pennsylvania is turned on.",
  }),
  licensed("RI", "Rhode Island", "Collection-agency license listed as required."),
  row({
    code: "SC",
    name: "South Carolina",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation: "No collection-agency license listed (South Carolina Attorney General consumer protection).",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Eligible on the 'no license found' review. Confirm no debt-buyer or municipal license before go-live.",
  }),
  row({
    code: "SD",
    name: "South Dakota",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation: "No collection-agency license listed (South Dakota Attorney General consumer protection).",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Eligible on the 'no license found' review. Confirm no debt-buyer license before go-live.",
  }),
  licensed("TN", "Tennessee", "Collection Service Board license listed as required."),
  row({
    code: "TX",
    name: "Texas",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration:
      "$10,000 surety bond filed with the Texas Secretary of State before engaging in debt collection. Tex. Fin. Code § 392.101. The Secretary of State says this is a bond filing, not a registration. Form 2901 (rev. 04/2026).",
    citation:
      "Tex. Fin. Code § 392.101 (bond). Tex. Fin. Code § 392.001(6)-(7) (debt collector and third-party debt collector). Tex. Fin. Code § 392.307 (debt-buyer time-barred debt: no suit or arbitration after the limitations period in Civ. Prac. & Rem. Code § 16.004 or Bus. & Com. Code § 3.118; the claim is not revived by payment or reaffirmation; the initial written communication must use the statutory notice).",
    citationUrl: "https://statutes.capitol.texas.gov/Docs/FI/htm/FI.392.htm",
    needsCounselReview: true,
    notes:
      "Eligible by owner policy and because Chapter 392 requires a surety bond rather than a license. The bond must be on file before any Texas collection, including by a third-party collector collecting purchased debt. Counsel should confirm whether a passive debt buyer who never contacts consumers must itself file § 392.101. Time-barred Texas accounts need the § 392.307 notice and must not be sued. El Paso-area time zones differ from the rest of Texas.",
  }),
  row({
    code: "UT",
    name: "Utah",
    collectorLicenseRequired: "uncertain",
    debtBuyerLicenseRequired: "uncertain",
    bondOrRegistration: "Not established.",
    citation: "No collection-agency license was found on the 2026-11-05 Cornerstone chart ('none on record'). A primary statute was not re-read in this pass.",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Held out of the eligible set until counsel confirms there is no collector or debt-buyer license.",
  }),
  row({
    code: "VT",
    name: "Vermont",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for a collection agency.",
    citation: "No collection-agency license listed (Vermont Attorney General consumer protection).",
    citationUrl: CHART,
    needsCounselReview: true,
    notes: "Eligible on the 'no license found' review. Confirm no debt-buyer license before go-live.",
  }),
  row({
    code: "VA",
    name: "Virginia",
    collectorLicenseRequired: false,
    debtBuyerLicenseRequired: false,
    bondOrRegistration: "None found for creditor-side collection. Va. Code § 6.2-2027 licenses debt-settlement services providers, which is a consumer-side business.",
    citation:
      "No collection-agency or debt-buyer chapter was identified in Va. Code Title 6.2. The nearest license, § 6.2-2027, covers debt settlement services, not collection. The Virginia Debt Collection Act (Va. Code § 2.2-4800 et seq.) governs debts owed to the Commonwealth, not private consumer debt.",
    citationUrl: "https://law.lis.virginia.gov/vacode/title6.2/chapter20.1/section6.2-2027/",
    needsCounselReview: true,
    notes:
      "Eligible on this review. Counsel should confirm Title 6.2 still has no collector or debt-buyer chapter and review the Medical Debt Protection Act before medical paper is worked.",
  }),
  licensed("WA", "Washington", "Collection Agency Act license listed as required (Washington DFI)."),
  licensed("WV", "West Virginia", "Collection-agency license listed as required."),
  licensed("WI", "Wisconsin", "Collection-agency license listed as required (Wisconsin DFI)."),
  licensed("WY", "Wyoming", "Collection-agency license listed as required."),
];

const EXPECTED = 51;

export function assertSeedCoverage(): void {
  const codes = new Set(STATE_ELIGIBILITY_SEED.map((item) => item.code));
  if (codes.size !== EXPECTED || STATE_ELIGIBILITY_SEED.length !== EXPECTED) {
    throw new Error(`State eligibility seed must cover 50 states plus DC, found ${codes.size}`);
  }
}

export function eligibilityByCode(rows: StateEligibility[], code: string): StateEligibility | undefined {
  const target = code.trim().toUpperCase();
  return rows.find((row) => row.code === target);
}

export function stateIsEligible(rows: StateEligibility[], code: string): boolean {
  return eligibilityByCode(rows, code)?.eligible === true;
}

export function mergeEligibilitySeed(existing: StateEligibility[]): StateEligibility[] {
  const saved = new Map(existing.map((row) => [row.code, row]));
  return STATE_ELIGIBILITY_SEED.map((seed) => saved.get(seed.code) ?? seed);
}

export function triLabel(value: TriState): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "Uncertain";
}
