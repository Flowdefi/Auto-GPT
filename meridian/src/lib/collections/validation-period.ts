/**
 * Validation period end date under 12 CFR § 1006.34(b)(5).
 * Assumed receipt is 5 days after sending, excluding Saturdays, Sundays, and
 * legal public holidays in 5 U.S.C. § 6103 (observed dates). The period ends
 * 30 calendar days after that assumed receipt. Counsel should confirm the
 * holiday calendar before a live notice is mailed.
 */

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function nthWeekday(year: number, month: number, weekday: number, nth: number): Date {
  const first = utc(year, month, 1);
  const shift = (weekday - first.getUTCDay() + 7) % 7;
  return utc(year, month, 1 + shift + (nth - 1) * 7);
}

function lastWeekday(year: number, month: number, weekday: number): Date {
  const last = utc(year, month + 1, 0);
  const shift = (last.getUTCDay() - weekday + 7) % 7;
  return utc(year, month, last.getUTCDate() - shift);
}

function observed(date: Date): Date {
  const day = date.getUTCDay();
  if (day === 6) return utc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() - 1);
  if (day === 0) return utc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + 1);
  return date;
}

function stamp(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function federalHolidayStamps(year: number): Set<string> {
  const fixed = [utc(year, 1, 1), utc(year, 6, 19), utc(year, 7, 4), utc(year, 11, 11), utc(year, 12, 25)].map(observed);
  const floating = [
    nthWeekday(year, 1, 1, 3),
    nthWeekday(year, 2, 1, 3),
    lastWeekday(year, 5, 1),
    nthWeekday(year, 9, 1, 1),
    nthWeekday(year, 10, 1, 2),
    nthWeekday(year, 11, 4, 4),
  ];
  return new Set([...fixed, ...floating].map(stamp));
}

function isBusinessDay(date: Date): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !federalHolidayStamps(date.getUTCFullYear()).has(stamp(date));
}

/** Add business days after `sentOn`, not counting the send date itself. */
export function addFederalBusinessDays(sentOn: string, days: number): string {
  const cursor = new Date(`${sentOn.slice(0, 10)}T00:00:00.000Z`);
  let added = 0;
  while (added < days) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (isBusinessDay(cursor)) added += 1;
  }
  return stamp(cursor);
}

export function validationEndDate(sentOn: string): string {
  const assumedReceipt = addFederalBusinessDays(sentOn, 5);
  const end = new Date(`${assumedReceipt}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 30);
  return stamp(end);
}

export function withinValidationPeriod(sentOn: string | null | undefined, today: string): boolean {
  if (!sentOn) return false;
  return today.slice(0, 10) <= validationEndDate(sentOn);
}
