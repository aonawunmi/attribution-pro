/**
 * Brinson-Fachler performance attribution model.
 *
 * Decomposes active return into:
 *   Allocation  = (Wp_i - Wb_i) × (Rb_i - Rb_total)
 *   Selection   = Wb_i × (Rp_i - Rb_i)
 *   Interaction = (Wp_i - Wb_i) × (Rp_i - Rb_i)
 *
 * Where:
 *   Wp_i = portfolio weight for asset i  (decimal)
 *   Wb_i = benchmark weight for asset i  (decimal)
 *   Rp_i = portfolio return for asset i  (decimal)
 *   Rb_i = benchmark return for asset i  (decimal)
 *   Rb_total = Σ(Wb_i × Rb_i) = total benchmark return
 *
 * @module brinsonFachler
 */

/**
 * @typedef {Object} AssetInput
 * @property {string} name               - Asset class name
 * @property {number} portfolioWeight    - Weight in portfolio (decimal, e.g. 0.60)
 * @property {number} portfolioReturn    - Return in portfolio (decimal, e.g. 0.12)
 * @property {number} benchmarkWeight    - Weight in benchmark (decimal)
 * @property {number} benchmarkReturn    - Return in benchmark (decimal)
 */

/**
 * @typedef {Object} AssetAttribution
 * @property {string} name
 * @property {number} portfolioWeight
 * @property {number} portfolioReturn
 * @property {number} benchmarkWeight
 * @property {number} benchmarkReturn
 * @property {number} allocation       - Allocation effect
 * @property {number} selection        - Selection effect
 * @property {number} interaction      - Interaction effect
 * @property {number} total            - Total contribution (allocation + selection + interaction)
 */

/**
 * Run Brinson-Fachler attribution on a set of asset classes.
 *
 * @param {AssetInput[]} assets - Array of asset class data (weights and returns in DECIMAL form)
 * @returns {{
 *   attribution: AssetAttribution[],
 *   totals: { allocation: number, selection: number, interaction: number, activeReturn: number },
 *   portfolioReturn: number,
 *   benchmarkReturn: number,
 *   totalPortfolioWeight: number,
 *   totalBenchmarkWeight: number,
 *   insight: string
 * }}
 */
export function brinsonFachler(assets) {
  if (!assets || assets.length === 0) {
    return {
      attribution: [],
      totals: { allocation: 0, selection: 0, interaction: 0, activeReturn: 0 },
      portfolioReturn: 0,
      benchmarkReturn: 0,
      totalPortfolioWeight: 0,
      totalBenchmarkWeight: 0,
      insight: 'No data to analyze.',
    };
  }

  // Total weighted returns
  let portfolioReturn = 0;
  let benchmarkReturn = 0;
  let totalPortfolioWeight = 0;
  let totalBenchmarkWeight = 0;

  for (const a of assets) {
    portfolioReturn += a.portfolioWeight * a.portfolioReturn;
    benchmarkReturn += a.benchmarkWeight * a.benchmarkReturn;
    totalPortfolioWeight += a.portfolioWeight;
    totalBenchmarkWeight += a.benchmarkWeight;
  }

  // Attribution per asset
  let totalAllocation = 0;
  let totalSelection = 0;
  let totalInteraction = 0;

  const attribution = assets.map((a) => {
    const allocation = (a.portfolioWeight - a.benchmarkWeight) * (a.benchmarkReturn - benchmarkReturn);
    const selection = a.benchmarkWeight * (a.portfolioReturn - a.benchmarkReturn);
    const interaction = (a.portfolioWeight - a.benchmarkWeight) * (a.portfolioReturn - a.benchmarkReturn);
    const total = allocation + selection + interaction;

    totalAllocation += allocation;
    totalSelection += selection;
    totalInteraction += interaction;

    return { ...a, allocation, selection, interaction, total };
  });

  const activeReturn = portfolioReturn - benchmarkReturn;

  // Dynamic insight — tracks allocation, selection, AND interaction
  let insight = '';
  let maxPositive = { name: '', value: -Infinity, type: '' };
  let maxNegative = { name: '', value: Infinity, type: '' };

  for (const d of attribution) {
    const effects = [
      { value: d.allocation, type: 'Asset Allocation' },
      { value: d.selection, type: 'Stock Selection' },
      { value: d.interaction, type: 'Interaction' },
    ];
    for (const e of effects) {
      if (e.value > maxPositive.value) maxPositive = { name: d.name, value: e.value, type: e.type };
      if (e.value < maxNegative.value) maxNegative = { name: d.name, value: e.value, type: e.type };
    }
  }

  const outperforming = activeReturn > 0;
  const absPct = (v) => `${Math.abs(v * 100).toFixed(2)}%`;

  insight = `The portfolio ${outperforming ? 'outperformed' : 'underperformed'} the benchmark by ${absPct(activeReturn)}. `;
  if (maxPositive.value > 0) {
    insight += `The largest positive contributor was ${maxPositive.type} in ${maxPositive.name} (+${absPct(maxPositive.value)}). `;
  }
  if (maxNegative.value < 0) {
    insight += `The biggest detractor was ${maxNegative.type} in ${maxNegative.name} (-${absPct(maxNegative.value)}).`;
  }

  return {
    attribution,
    totals: {
      allocation: totalAllocation,
      selection: totalSelection,
      interaction: totalInteraction,
      activeReturn,
    },
    portfolioReturn,
    benchmarkReturn,
    totalPortfolioWeight,
    totalBenchmarkWeight,
    insight,
  };
}
