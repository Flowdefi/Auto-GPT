import { STATE_ELIGIBILITY_SEED } from "./eligibility";

/**
 * Limitations periods used only where a statute was identified.
 * Accrual is last payment, otherwise charge-off. That choice is fact-specific
 * and marked for counsel review on every account. Other states stay blank
 * until counsel enters a period in the limitations table.
 */

export interface SolRule {
  code: string;
  years: number | null;
  citation: string;
  needsCounselReview: boolean;
}

export const SOL_RULES: SolRule[] = [
  {
    code: "TX",
    years: 4,
    citation: "Tex. Civ. Prac. & Rem. Code § 16.004(a)(3) (debt). Tex. Fin. Code § 392.307 bars a debt buyer from suing or arbitrating after this period and says payment does not revive the claim.",
    needsCounselReview: true,
  },
  {
    code: "GA",
    years: 6,
    citation: "O.C.G.A. § 9-3-24 (simple contracts in writing, six years). Open accounts can be four years under § 9-3-25. Counsel must pick the right period for the paper.",
    needsCounselReview: true,
  },
  {
    code: "MO",
    years: 5,
    citation: "RSMo § 516.120(1) (five years for contracts, obligations, or liabilities, except those mentioned in § 516.110). Counsel must decide whether a writing for the payment of money falls under § 516.110 instead.",
    needsCounselReview: true,
  },
  {
    code: "MT",
    years: 6,
    citation: "Mont. Code Ann. § 27-2-202(1) (six years on a contract founded on an instrument in writing). Subsection (2) is five years if it is not in writing.",
    needsCounselReview: true,
  },
  {
    code: "NH",
    years: 3,
    citation: "N.H. Rev. Stat. Ann. § 508:4 (personal actions, three years, except as otherwise provided). Counsel must confirm this is the period for the instrument.",
    needsCounselReview: true,
  },
  {
    code: "OH",
    years: 6,
    citation: "Ohio Rev. Code § 2305.06 (written contract, six years, effective September 23, 2026, with listed exceptions). Counsel must decide whether an older accrual still uses a prior version of this section.",
    needsCounselReview: true,
  },
  {
    code: "SC",
    years: 3,
    citation: "S.C. Code Ann. § 15-3-530(1) (three years on a contract, obligation, or liability, except actions under § 15-3-520).",
    needsCounselReview: true,
  },
  {
    code: "SD",
    years: 6,
    citation: "SDCL § 15-2-13(1) (six years on a contract, obligation, or liability, except the actions listed in §§ 15-2-6 to 15-2-8 and § 15-2-15(3) and (4)).",
    needsCounselReview: true,
  },
  {
    code: "VT",
    years: 6,
    citation: "12 V.S.A. § 511 (a civil action shall be commenced within six years after accrual, except judgments and where another statute provides otherwise).",
    needsCounselReview: true,
  },
  {
    code: "VA",
    years: 5,
    citation: "Va. Code § 8.01-246(A)(2) (five years on a signed writing). Unsigned or unwritten contracts are three years under (A)(4). Medical debt is three years under subsection B.",
    needsCounselReview: true,
  },
];

export function defaultSolTable(): SolRule[] {
  return STATE_ELIGIBILITY_SEED.map((state) => {
    const known = SOL_RULES.find((rule) => rule.code === state.code);
    return (
      known ?? {
        code: state.code,
        years: null,
        citation: "No reviewed limitations period for this state. Do not calculate a date.",
        needsCounselReview: true,
      }
    );
  });
}

export function solFor(
  state: string,
  lastPaymentDate: string | null,
  chargeOffDate: string | null,
  rules: SolRule[] = SOL_RULES,
): {
  solExpiresOn: string | null;
  solCitation: string;
  solNeedsCounselReview: boolean;
} {
  const rule = rules.find((item) => item.code === state.trim().toUpperCase());
  const accrual = lastPaymentDate || chargeOffDate;
  if (!rule || rule.years == null || !accrual) {
    return {
      solExpiresOn: null,
      solCitation: rule?.citation ?? "No reviewed limitations period for this state. Do not calculate a date.",
      solNeedsCounselReview: true,
    };
  }
  const date = new Date(`${accrual.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { solExpiresOn: null, solCitation: rule.citation, solNeedsCounselReview: true };
  }
  date.setUTCFullYear(date.getUTCFullYear() + rule.years);
  return {
    solExpiresOn: date.toISOString().slice(0, 10),
    solCitation: `${rule.citation} Accrual used the last payment date when present, otherwise charge-off.`,
    solNeedsCounselReview: true,
  };
}
