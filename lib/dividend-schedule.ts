/**
 * Convert a timestamp to the start of that calendar day in UTC.
 */
function toUtcDateStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Dividend scheduling compares calendar dates in UTC (not local timezone).
 */
export function isDividendAvailableOnDate(
  plannedDividend: Date | null,
  now: Date,
): boolean {
  if (!plannedDividend) return false;

  return toUtcDateStart(plannedDividend) <= toUtcDateStart(now);
}

/**
 * Check if an event should be treated as executed for the same-or-later
 * planned dividend date (UTC calendar-day basis).
 */
export function isExecutedOnOrAfterPlannedDividendDate(
  executedAt: Date,
  plannedDividend: Date,
): boolean {
  return toUtcDateStart(executedAt) >= toUtcDateStart(plannedDividend);
}
