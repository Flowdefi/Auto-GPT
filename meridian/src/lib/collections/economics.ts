/** Illustrative 12-month recovery shares of face. A desk model, not a forecast and not advice. */
export const MODEL_CURVE = [0.04, 0.07, 0.09, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.01];

export const MODEL_LABEL = "Model estimate. Not a forecast and not financial, legal, or investment advice.";

export function cashOnCash(collectedCents: number, costCents: number): number | null {
  if (!Number.isInteger(costCents) || costCents <= 0) return null;
  if (!Number.isInteger(collectedCents) || collectedCents < 0) return null;
  return Math.round((collectedCents / costCents) * 10000) / 10000;
}

/** Annual IRR from monthly cash flows. The first flow is the purchase (negative). */
export function annualIrr(monthlyFlows: number[]): number | null {
  const first = monthlyFlows[0];
  if (monthlyFlows.length < 2 || first === undefined || !(first < 0)) return null;
  let rate = 0.02;
  for (let step = 0; step < 50; step += 1) {
    let npv = 0;
    let derivative = 0;
    for (let month = 0; month < monthlyFlows.length; month += 1) {
      const flow = monthlyFlows[month] ?? 0;
      const discount = (1 + rate) ** month;
      npv += flow / discount;
      if (month > 0) derivative -= (month * flow) / (1 + rate) ** (month + 1);
    }
    if (Math.abs(npv) < 0.01) break;
    if (derivative === 0) return null;
    rate -= npv / derivative;
    if (rate <= -0.9 || rate > 5) return null;
  }
  if (!Number.isFinite(rate)) return null;
  const annual = (1 + rate) ** 12 - 1;
  if (!Number.isFinite(annual)) return null;
  return Math.round(annual * 10000) / 10000;
}

export function expectedMonthlyCents(faceCents: number): number[] {
  return MODEL_CURVE.map((share) => Math.round(faceCents * share));
}
