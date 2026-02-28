/**
 * ACT/365 annualization of a period return.
 *
 * Formula: (1 + r)^(365 / days) - 1
 *
 * @param {number} r     - Period return in decimal form (e.g. 0.05 for 5%)
 * @param {Date}   start - Period start date
 * @param {Date}   end   - Period end date
 * @returns {number} Annualized return in decimal form
 */
export function annualize(r, start, end) {
  if (!Number.isFinite(r)) return NaN;
  const msPerDay = 86_400_000;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay);
  if (days <= 0) return NaN;
  return Math.pow(1 + r, 365 / days) - 1;
}
