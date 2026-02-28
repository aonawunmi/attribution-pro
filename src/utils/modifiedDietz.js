/**
 * Modified Dietz return calculation.
 *
 * Ported from the Python implementation at:
 *   https://github.com/aonawunmi/investment-performance-portal/blob/main/app.py
 *
 * Formula:
 *   R = (EV - BV - ΣCF) / (BV + Σ(w_i × CF_i))
 *
 * Where:
 *   w_i = (t1 - t_i) / (t1 - t0)          — time weight clipped to [0, 1]
 *   CF_i is signed: +INFLOW, −OUTFLOW
 *
 * @module modifiedDietz
 */

import { annualize } from './annualize';

const EPS = 1e-12;

/**
 * Compute the Modified Dietz return for a single asset or portfolio.
 *
 * @param {Object} params
 * @param {number} params.beginningValue - Beginning market value (BV)
 * @param {number} params.endingValue    - Ending market value (EV)
 * @param {Array<{date: Date, amount: number}>} params.cashflows
 *   Array of cashflows. Each has a `date` (Date) and a signed `amount`
 *   (positive = inflow, negative = outflow).
 * @param {Date} params.startDate - Period start date (t0)
 * @param {Date} params.endDate   - Period end date (t1)
 * @returns {number} Period return in decimal form (0.05 = 5%)
 * @throws {Error} If inputs are invalid or denominator is unstable
 */
export function modifiedDietz({ beginningValue, endingValue, cashflows = [], startDate, endDate }) {
  // ── Validation ──────────────────────────────────────────────
  if (!Number.isFinite(beginningValue) || !Number.isFinite(endingValue)) {
    throw new Error('Beginning value and ending value must be finite numbers.');
  }
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    throw new Error('Start date and end date must be valid Date objects.');
  }

  const T = endDate.getTime() - startDate.getTime(); // total period in ms
  if (T <= 0) {
    throw new Error('End date must be after start date.');
  }

  // ── Filter & clean cashflows ────────────────────────────────
  const validFlows = cashflows.filter(
    (cf) =>
      cf.date instanceof Date &&
      cf.date.getTime() >= startDate.getTime() &&
      cf.date.getTime() <= endDate.getTime() &&
      Number.isFinite(cf.amount)
  );

  // ── Sum of cashflows ────────────────────────────────────────
  const sumCF = validFlows.reduce((acc, cf) => acc + cf.amount, 0);

  // ── Weighted cashflow sum for denominator ───────────────────
  let weightedCF = 0;
  for (const cf of validFlows) {
    const wi = (endDate.getTime() - cf.date.getTime()) / T;
    const wClamped = Math.max(0, Math.min(1, wi));
    weightedCF += wClamped * cf.amount;
  }

  // ── Denominator stability guard ─────────────────────────────
  const denominator = beginningValue + weightedCF;
  if (Math.abs(denominator) < EPS) {
    throw new Error('Unstable denominator — beginning value plus weighted cashflows is near zero.');
  }

  // ── Return ──────────────────────────────────────────────────
  const numerator = endingValue - beginningValue - sumCF;
  return numerator / denominator;
}

/**
 * Compute Modified Dietz time weights for a set of cashflows.
 * Useful for displaying the "Adjusted Cashflows" table.
 *
 * @param {Array<{date: Date, amount: number}>} cashflows
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Array<{date: Date, amount: number, weight: number, weightedAmount: number}>}
 */
export function computeCashflowWeights(cashflows, startDate, endDate) {
  const T = endDate.getTime() - startDate.getTime();
  if (T <= 0) return [];

  return cashflows
    .filter(
      (cf) =>
        cf.date instanceof Date &&
        cf.date.getTime() >= startDate.getTime() &&
        cf.date.getTime() <= endDate.getTime() &&
        Number.isFinite(cf.amount)
    )
    .map((cf) => {
      const w = Math.max(0, Math.min(1, (endDate.getTime() - cf.date.getTime()) / T));
      return {
        ...cf,
        weight: w,
        weightedAmount: w * cf.amount,
      };
    });
}

/**
 * Compute per-asset returns and portfolio-level aggregation.
 *
 * @param {Object} params
 * @param {Array<{name: string, beginningValue: number, endingValue: number}>} params.assets
 * @param {Array<{date: Date, amount: number, assetClass: string}>} params.cashflows
 * @param {Date} params.startDate
 * @param {Date} params.endDate
 * @returns {{
 *   assetResults: Array<{name, beginningValue, endingValue, weight, periodReturn, annualizedReturn, contribution}>,
 *   portfolio: {beginningValue, endingValue, periodReturn, annualizedReturn},
 *   issues: string[]
 * }}
 */
export function computePortfolioReturns({ assets, cashflows = [], startDate, endDate }) {
  const totalBV = assets.reduce((sum, a) => sum + a.beginningValue, 0);
  if (totalBV <= 0) {
    throw new Error('Total beginning market value must be greater than zero.');
  }

  const issues = [];
  const assetResults = assets.map((asset) => {
    const assetFlows = cashflows
      .filter((cf) => cf.assetClass === asset.name)
      .map((cf) => ({ date: cf.date, amount: cf.amount }));

    let periodReturn = 0;
    try {
      if (asset.beginningValue === 0 && (assetFlows.length === 0 || Math.abs(assetFlows.reduce((s, f) => s + f.amount, 0)) < EPS)) {
        periodReturn = 0;
      } else {
        periodReturn = modifiedDietz({
          beginningValue: asset.beginningValue,
          endingValue: asset.endingValue,
          cashflows: assetFlows,
          startDate,
          endDate,
        });
      }
    } catch (err) {
      issues.push(`${asset.name}: ${err.message}`);
      periodReturn = 0;
    }

    const weight = asset.beginningValue / totalBV;
    const contribution = weight * periodReturn;
    const annualizedReturn = annualize(periodReturn, startDate, endDate);

    return {
      name: asset.name,
      beginningValue: asset.beginningValue,
      endingValue: asset.endingValue,
      weight,
      periodReturn,
      annualizedReturn,
      contribution,
    };
  });

  // Portfolio-level aggregate
  const totalEV = assets.reduce((sum, a) => sum + a.endingValue, 0);
  const allFlows = cashflows.map((cf) => ({ date: cf.date, amount: cf.amount }));

  let portfolioReturn = 0;
  try {
    portfolioReturn = modifiedDietz({
      beginningValue: totalBV,
      endingValue: totalEV,
      cashflows: allFlows,
      startDate,
      endDate,
    });
  } catch (err) {
    throw new Error(`Portfolio Dietz error: ${err.message}`);
  }

  const portfolioAnnualized = annualize(portfolioReturn, startDate, endDate);

  return {
    assetResults,
    portfolio: {
      beginningValue: totalBV,
      endingValue: totalEV,
      periodReturn: portfolioReturn,
      annualizedReturn: portfolioAnnualized,
    },
    issues,
  };
}
