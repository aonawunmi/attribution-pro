/**
 * Formatting utilities for the Investment Performance Appraisal System.
 *
 * All percentage helpers expect values in DECIMAL form (0.12 = 12%).
 */

/**
 * Format a decimal as a percentage string.
 * @param {number} val - Decimal value (0.12 → "12.00%")
 * @param {number} [decimals=2] - Decimal places
 * @returns {string}
 */
export const formatPct = (val, decimals = 2) => {
  if (val === undefined || val === null || !Number.isFinite(val)) return '-';
  return `${(val * 100).toFixed(decimals)}%`;
};

/**
 * Format a decimal as a signed percentage ("+12.00%" / "-3.50%").
 * @param {number} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
export const formatSignedPct = (val, decimals = 2) => {
  if (val === undefined || val === null || !Number.isFinite(val)) return '-';
  const prefix = val > 0 ? '+' : '';
  return `${prefix}${(val * 100).toFixed(decimals)}%`;
};

/**
 * Format a number with commas and fixed decimals.
 * @param {number} val
 * @param {number} [decimals=2]
 * @returns {string}
 */
export const formatNumber = (val, decimals = 2) => {
  if (val === undefined || val === null || !Number.isFinite(val)) return '-';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Robust string → float conversion.
 * Strips commas, whitespace, and currency symbols before parsing.
 * @param {*} x
 * @returns {number} Parsed float or NaN
 */
export const toFloat = (x) => {
  if (x === null || x === undefined) return NaN;
  if (typeof x === 'number') return x;
  const cleaned = String(x).replace(/[,\s$£€₦]/g, '').trim();
  if (cleaned === '') return NaN;
  const parsed = parseFloat(cleaned);
  return parsed;
};
