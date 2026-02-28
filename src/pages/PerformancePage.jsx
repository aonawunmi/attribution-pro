import { useState, useMemo, useCallback } from 'react';
import {
  Settings, Upload, TableProperties, BarChart3, Plus, Trash2, AlertCircle,
  CheckCircle2, Download, Calculator
} from 'lucide-react';
import usePortfolioStore from '../store/usePortfolioStore';
import CsvUploader from '../components/CsvUploader';
import KpiCard from '../components/KpiCard';
import AiAnalyst from '../components/AiAnalyst';
import { parseAssetsCSV, parseCashflowsCSV } from '../utils/csvParser';
import { modifiedDietz, computeCashflowWeights, computePortfolioReturns } from '../utils/modifiedDietz';
import { formatPct, formatSignedPct, formatNumber, toFloat } from '../utils/formatters';
import { generatePerformanceCommentary } from '../services/geminiService';

const TABS = [
  { id: 'settings', label: 'Global Settings', icon: Settings },
  { id: 'cashflows', label: 'Cashflows Upload', icon: Upload },
  { id: 'adjusted', label: 'Adjusted Cashflows', icon: TableProperties },
  { id: 'results', label: 'Results', icon: BarChart3 },
];

export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState('settings');
  const {
    startDate, endDate, setDates,
    assets, setAssets, addAsset, updateAsset, removeAsset,
    cashflows, setCashflows,
    setPerformanceResults,
  } = usePortfolioStore();

  // ── CSV Upload State ──
  const [assetErrors, setAssetErrors] = useState([]);
  const [assetSuccess, setAssetSuccess] = useState(false);
  const [cfErrors, setCfErrors] = useState([]);
  const [cfSuccess, setCfSuccess] = useState(false);

  // ── Handlers ──
  const handleAssetsUpload = useCallback(async (file) => {
    setAssetErrors([]);
    setAssetSuccess(false);
    const { assets: parsed, errors } = await parseAssetsCSV(file);
    if (errors.length > 0) {
      setAssetErrors(errors);
    } else {
      setAssets(parsed);
      setAssetSuccess(true);
    }
  }, [setAssets]);

  const handleCashflowsUpload = useCallback(async (file) => {
    setCfErrors([]);
    setCfSuccess(false);
    const { cashflows: parsed, errors } = await parseCashflowsCSV(file);
    if (errors.length > 0) {
      setCfErrors(errors);
    } else {
      setCashflows(parsed);
      setCfSuccess(true);
    }
  }, [setCashflows]);

  const handleAddRow = () => {
    addAsset({ name: `Asset ${assets.length + 1}`, beginningValue: 0, endingValue: 0 });
  };

  // ── Adjusted Cashflows (with Modified Dietz weights) ──
  const adjustedFlows = useMemo(() => {
    if (!startDate || !endDate || cashflows.length === 0) return [];
    return computeCashflowWeights(
      cashflows.map((cf) => ({ date: cf.date, amount: cf.amount })),
      startDate,
      endDate
    ).map((wf, i) => ({
      ...wf,
      assetClass: cashflows[i]?.assetClass || '',
      type: cashflows[i]?.type || '',
      details: cashflows[i]?.details || '',
      rawAmount: cashflows[i]?.rawAmount || Math.abs(wf.amount),
    }));
  }, [cashflows, startDate, endDate]);

  // ── Compute Results ──
  const results = useMemo(() => {
    if (!startDate || !endDate || assets.length === 0) return null;
    try {
      const r = computePortfolioReturns({ assets, cashflows, startDate, endDate });
      return r;
    } catch (err) {
      return { error: err.message };
    }
  }, [assets, cashflows, startDate, endDate]);

  // Save results to store when computed
  useMemo(() => {
    if (results && !results.error) {
      setPerformanceResults(results);
    }
  }, [results, setPerformanceResults]);

  // ── Download cashflow template ──
  const downloadTemplate = () => {
    const csv = 'Transaction Date,Transaction Type,Amount,Asset Class,Transaction Details\n2025-01-15,INFLOW,50000,Equities,Quarterly investment\n2025-02-01,OUTFLOW,10000,Fixed Income,Withdrawal';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cashflow_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Performance Measurement</h1>
        <p className="text-sm text-slate-500 mt-1">Modified Dietz Method — One-Period Time-Weighted Return</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ─── Tab 1: Global Settings ─────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Period Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Evaluation Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDates(e.target.value ? new Date(e.target.value + 'T00:00:00') : null, endDate)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDates(startDate, e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Asset Classes Upload */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-slate-800">Asset Classes & Market Values</h2>
            <CsvUploader
              label="Upload Assets CSV"
              description="Columns: Asset Class, Beginning MV, Ending MV (flexible naming supported)"
              onFileSelected={handleAssetsUpload}
              errors={assetErrors}
              success={assetSuccess}
            />

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="flex-1 h-px bg-slate-200" />
              <span>or enter manually</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Manual Data Entry Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Asset Class</th>
                    <th className="px-3 py-2 text-right">Beginning MV</th>
                    <th className="px-3 py-2 text-right">Ending MV</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.map((a, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={a.name}
                          onChange={(e) => updateAsset(i, { name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={a.beginningValue}
                          onChange={(e) => updateAsset(i, { beginningValue: toFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-right focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={a.endingValue}
                          onChange={(e) => updateAsset(i, { endingValue: toFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-right focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button onClick={() => removeAsset(i)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Asset Class
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Cashflows Upload ────────────────────── */}
      {activeTab === 'cashflows' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">Transaction Cashflows</h2>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" /> Download Template
              </button>
            </div>
            <CsvUploader
              label="Upload Cashflows CSV"
              description="Columns: Transaction Date, Transaction Type (INFLOW/OUTFLOW), Amount, Asset Class"
              onFileSelected={handleCashflowsUpload}
              errors={cfErrors}
              success={cfSuccess}
            />
          </div>

          {cashflows.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-slate-800">{cashflows.length} Cashflows Loaded</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Asset Class</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashflows.map((cf, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2">{cf.date.toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cf.type === 'INFLOW' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {cf.type}
                          </span>
                        </td>
                        <td className="px-4 py-2">{cf.assetClass}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatNumber(cf.rawAmount)}</td>
                        <td className="px-4 py-2 text-slate-500 truncate max-w-xs">{cf.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 3: Adjusted Cashflows ──────────────────── */}
      {activeTab === 'adjusted' && (
        <div className="space-y-6">
          {!startDate || !endDate ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Set the evaluation period in Global Settings first.</p>
            </div>
          ) : adjustedFlows.length === 0 ? (
            <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-500">
              <p>No cashflows within the selected period. Upload cashflows first.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-800">Time-Weighted Cashflows</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Weight formula: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-blue-600">w = (T1 - Ti) / (T1 - T0)</code>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Asset Class</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Weight (w)</th>
                      <th className="px-4 py-2 text-right">Weighted Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {adjustedFlows.map((cf, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-sans">{cf.date.toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-sans">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cf.type === 'INFLOW' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {cf.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-sans">{cf.assetClass}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(cf.rawAmount)}</td>
                        <td className="px-4 py-2 text-right text-blue-600">{cf.weight.toFixed(4)}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(cf.weightedAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 4: Results ─────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {/* Validation */}
          {(!startDate || !endDate) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Set the evaluation period in Global Settings first.</p>
            </div>
          )}
          {assets.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Add at least one asset class in Global Settings.</p>
            </div>
          )}

          {results?.error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{results.error}</p>
            </div>
          )}

          {results && !results.error && (
            <>
              {/* Issues */}
              {results.issues?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm space-y-1">
                  <p className="font-semibold">Calculation Notes:</p>
                  {results.issues.map((iss, i) => (
                    <p key={i} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {iss}
                    </p>
                  ))}
                </div>
              )}

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard
                  label="Portfolio Period Return"
                  value={formatPct(results.portfolio.periodReturn)}
                  variant={results.portfolio.periodReturn >= 0 ? 'positive' : 'negative'}
                />
                <KpiCard
                  label="Annualized Return (ACT/365)"
                  value={formatPct(results.portfolio.annualizedReturn)}
                  variant={results.portfolio.annualizedReturn >= 0 ? 'positive' : 'negative'}
                />
                <KpiCard label="Asset Classes" value={String(results.assetResults.length)} icon={Calculator} />
              </div>

              {/* Results Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-50/50">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                    <Calculator className="w-5 h-5 text-blue-500" />
                    Per-Asset Modified Dietz Returns
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Asset Class</th>
                        <th className="px-4 py-3 text-right">Beginning MV</th>
                        <th className="px-4 py-3 text-right">Ending MV</th>
                        <th className="px-4 py-3 text-right">Weight (BV)</th>
                        <th className="px-4 py-3 text-right">Period Return</th>
                        <th className="px-4 py-3 text-right">Annualized</th>
                        <th className="px-4 py-3 text-right font-bold">Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.assetResults.map((a, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-700">{a.name}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNumber(a.beginningValue)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNumber(a.endingValue)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPct(a.weight)}</td>
                          <td className={`px-4 py-3 text-right font-mono ${a.periodReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatSignedPct(a.periodReturn)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono ${a.annualizedReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatSignedPct(a.annualizedReturn)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${a.contribution >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatSignedPct(a.contribution)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-blue-50/50 font-bold border-t border-slate-200">
                      <tr>
                        <td className="px-4 py-4 text-right text-slate-700">Portfolio Total</td>
                        <td className="px-4 py-4 text-right font-mono">{formatNumber(results.portfolio.beginningValue)}</td>
                        <td className="px-4 py-4 text-right font-mono">{formatNumber(results.portfolio.endingValue)}</td>
                        <td className="px-4 py-4 text-right font-mono">100.00%</td>
                        <td className={`px-4 py-4 text-right font-mono text-lg ${results.portfolio.periodReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatSignedPct(results.portfolio.periodReturn)}
                        </td>
                        <td className={`px-4 py-4 text-right font-mono ${results.portfolio.annualizedReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatSignedPct(results.portfolio.annualizedReturn)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* AI Commentary */}
              <AiAnalyst
                disabled={!results || results.assetResults.length === 0}
                fallbackInsight={`Portfolio returned ${formatPct(results.portfolio.periodReturn)} over the evaluation period (${formatPct(results.portfolio.annualizedReturn)} annualized).`}
                onGenerateSummary={() =>
                  generatePerformanceCommentary({
                    portfolioReturn: results.portfolio.periodReturn,
                    annualizedReturn: results.portfolio.annualizedReturn,
                    assetResults: results.assetResults,
                  })
                }
                onGenerateRecommendations={() =>
                  generatePerformanceCommentary({
                    portfolioReturn: results.portfolio.periodReturn,
                    annualizedReturn: results.portfolio.annualizedReturn,
                    assetResults: results.assetResults,
                  })
                }
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
