/**
 * Standalone validation script — tests core math functions.
 * Inlines the logic to avoid Node ESM extension issues with Vite-style imports.
 * Run with: node test-validation.mjs
 */

let passed = 0;
let failed = 0;

function assert(label, actual, expected, tolerance = 0.0001) {
  const ok = Math.abs(actual - expected) < tolerance;
  if (ok) {
    console.log(`  PASS  ${label}: ${actual.toFixed(6)} (expected ${expected.toFixed(6)})`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}: got ${actual.toFixed(6)}, expected ${expected.toFixed(6)}`);
    failed++;
  }
}

// ── Inline: Modified Dietz ────────────────────────────────────
function modifiedDietz({ beginningValue, endingValue, cashflows = [], startDate, endDate }) {
  const EPS = 1e-12;
  if (!Number.isFinite(beginningValue) || !Number.isFinite(endingValue)) throw new Error('Non-finite');
  const T = endDate.getTime() - startDate.getTime();
  if (T <= 0) throw new Error('Bad period');

  const valid = cashflows.filter(
    cf => cf.date instanceof Date && cf.date.getTime() >= startDate.getTime() && cf.date.getTime() <= endDate.getTime() && Number.isFinite(cf.amount)
  );
  const sumCF = valid.reduce((s, cf) => s + cf.amount, 0);
  let weightedCF = 0;
  for (const cf of valid) {
    const wi = Math.max(0, Math.min(1, (endDate.getTime() - cf.date.getTime()) / T));
    weightedCF += wi * cf.amount;
  }
  const denom = beginningValue + weightedCF;
  if (Math.abs(denom) < EPS) throw new Error('Unstable');
  return (endingValue - beginningValue - sumCF) / denom;
}

// ── Inline: Annualize ─────────────────────────────────────────
function annualize(r, start, end) {
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  if (days <= 0) return NaN;
  return Math.pow(1 + r, 365 / days) - 1;
}

// ── Inline: Brinson-Fachler ───────────────────────────────────
function brinsonFachler(assets) {
  let portfolioReturn = 0, benchmarkReturn = 0, totalPW = 0, totalBW = 0;
  for (const a of assets) {
    portfolioReturn += a.portfolioWeight * a.portfolioReturn;
    benchmarkReturn += a.benchmarkWeight * a.benchmarkReturn;
    totalPW += a.portfolioWeight;
    totalBW += a.benchmarkWeight;
  }
  let tA = 0, tS = 0, tI = 0;
  const attribution = assets.map(a => {
    const alloc = (a.portfolioWeight - a.benchmarkWeight) * (a.benchmarkReturn - benchmarkReturn);
    const sel = a.benchmarkWeight * (a.portfolioReturn - a.benchmarkReturn);
    const inter = (a.portfolioWeight - a.benchmarkWeight) * (a.portfolioReturn - a.benchmarkReturn);
    tA += alloc; tS += sel; tI += inter;
    return { ...a, allocation: alloc, selection: sel, interaction: inter, total: alloc + sel + inter };
  });
  return { attribution, totals: { allocation: tA, selection: tS, interaction: tI, activeReturn: portfolioReturn - benchmarkReturn }, portfolioReturn, benchmarkReturn, totalPW, totalBW };
}

// ── Inline: Cashflow Weights ──────────────────────────────────
function computeCashflowWeights(cashflows, startDate, endDate) {
  const T = endDate.getTime() - startDate.getTime();
  if (T <= 0) return [];
  return cashflows
    .filter(cf => cf.date instanceof Date && cf.date.getTime() >= startDate.getTime() && cf.date.getTime() <= endDate.getTime() && Number.isFinite(cf.amount))
    .map(cf => {
      const w = Math.max(0, Math.min(1, (endDate.getTime() - cf.date.getTime()) / T));
      return { ...cf, weight: w, weightedAmount: w * cf.amount };
    });
}

// ═══════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════

console.log('\n=== Modified Dietz Validation ===\n');

// Test 1: No cashflows
{
  const r = modifiedDietz({ beginningValue: 1000, endingValue: 1100, cashflows: [], startDate: new Date('2025-01-01'), endDate: new Date('2025-06-30') });
  assert('No cashflows (BV=1000, EV=1100)', r, 0.10);
}

// Test 2: Mid-period inflow
{
  const s = new Date('2025-01-01'), e = new Date('2025-07-01');
  const cfDate = new Date('2025-04-01');
  const r = modifiedDietz({ beginningValue: 1000, endingValue: 1150, cashflows: [{ date: cfDate, amount: 100 }], startDate: s, endDate: e });
  const w = (e.getTime() - cfDate.getTime()) / (e.getTime() - s.getTime());
  const expected = 50 / (1000 + w * 100);
  assert('Mid-period inflow', r, expected);
}

// Test 3: Outflow break-even
{
  const r = modifiedDietz({ beginningValue: 1000, endingValue: 800, cashflows: [{ date: new Date('2025-03-15'), amount: -200 }], startDate: new Date('2025-01-01'), endDate: new Date('2025-06-30') });
  assert('Outflow break-even', r, 0.0);
}

// Test 4: Large portfolio — BV=1,000,000, EV=1,050,000, two cashflows
{
  const s = new Date('2025-01-01'), e = new Date('2025-12-31');
  const cf1 = { date: new Date('2025-03-01'), amount: 50000 };
  const cf2 = { date: new Date('2025-09-01'), amount: -30000 };
  const r = modifiedDietz({ beginningValue: 1000000, endingValue: 1050000, cashflows: [cf1, cf2], startDate: s, endDate: e });
  const T = e.getTime() - s.getTime();
  const w1 = (e.getTime() - cf1.date.getTime()) / T;
  const w2 = (e.getTime() - cf2.date.getTime()) / T;
  const num = 1050000 - 1000000 - (50000 - 30000);
  const den = 1000000 + w1 * 50000 + w2 * (-30000);
  assert('Large portfolio with 2 cashflows', r, num / den);
}

console.log('\n=== Annualization Validation ===\n');

// Test 5: 6-month return
{
  const r = annualize(0.05, new Date('2025-01-01'), new Date('2025-07-01'));
  const expected = Math.pow(1.05, 365 / 181) - 1;
  assert('Annualize 5% over ~181 days', r, expected);
}

// Test 6: Full year
{
  const r = annualize(0.12, new Date('2025-01-01'), new Date('2026-01-01'));
  assert('Annualize 12% over 365 days', r, 0.12, 0.001);
}

// Test 7: 30-day return
{
  const r = annualize(0.01, new Date('2025-01-01'), new Date('2025-01-31'));
  const expected = Math.pow(1.01, 365 / 30) - 1;
  assert('Annualize 1% over 30 days', r, expected);
}

console.log('\n=== Brinson-Fachler Validation ===\n');

// Test 8: Default data
{
  const result = brinsonFachler([
    { name: 'Equities', portfolioWeight: 0.60, portfolioReturn: 0.12, benchmarkWeight: 0.50, benchmarkReturn: 0.10 },
    { name: 'Fixed Income', portfolioWeight: 0.30, portfolioReturn: 0.04, benchmarkWeight: 0.40, benchmarkReturn: 0.05 },
    { name: 'Cash', portfolioWeight: 0.10, portfolioReturn: 0.01, benchmarkWeight: 0.10, benchmarkReturn: 0.01 },
  ]);

  assert('Portfolio return', result.portfolioReturn, 0.085);
  assert('Benchmark return', result.benchmarkReturn, 0.071);
  assert('Active return', result.totals.activeReturn, 0.014);

  // Key property: allocation + selection + interaction = active return
  const decomp = result.totals.allocation + result.totals.selection + result.totals.interaction;
  assert('Decomposition = active return', decomp, result.totals.activeReturn);

  // Per-asset totals sum correctly
  let sA = 0, sS = 0, sI = 0;
  for (const a of result.attribution) { sA += a.allocation; sS += a.selection; sI += a.interaction; }
  assert('Sum of allocations', sA, result.totals.allocation);
  assert('Sum of selections', sS, result.totals.selection);
  assert('Sum of interactions', sI, result.totals.interaction);
}

// Test 9: Single asset — all effects should be zero except selection
{
  const result = brinsonFachler([
    { name: 'Only', portfolioWeight: 1.0, portfolioReturn: 0.08, benchmarkWeight: 1.0, benchmarkReturn: 0.05 },
  ]);
  assert('Single asset: allocation = 0', result.totals.allocation, 0.0);
  assert('Single asset: interaction = 0', result.totals.interaction, 0.0);
  assert('Single asset: selection = active return', result.totals.selection, 0.03);
  assert('Single asset: active return', result.totals.activeReturn, 0.03);
}

console.log('\n=== Cashflow Weights Validation ===\n');

// Test 10: Weights at boundaries
{
  const weights = computeCashflowWeights(
    [
      { date: new Date('2025-01-01'), amount: 100 },
      { date: new Date('2025-07-01'), amount: 200 },
      { date: new Date('2025-12-31'), amount: 50 },
    ],
    new Date('2025-01-01'),
    new Date('2025-12-31')
  );
  assert('Start-date weight ≈ 1.0', weights[0].weight, 1.0, 0.01);
  assert('Mid-period weight ≈ 0.5', weights[1].weight, 0.5, 0.02);
  assert('End-date weight ≈ 0.0', weights[2].weight, 0.0, 0.01);
  assert('Weighted amount (start)', weights[0].weightedAmount, weights[0].weight * 100, 1);
  assert('Weighted amount (mid)', weights[1].weightedAmount, weights[1].weight * 200, 1);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
