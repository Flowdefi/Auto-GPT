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
