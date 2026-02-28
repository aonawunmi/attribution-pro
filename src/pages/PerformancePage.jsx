import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Settings, Upload, TableProperties, BarChart3, Plus, Trash2, AlertCircle,
  CheckCircle2, Download, Calculator, DatabaseZap, BookmarkPlus
} from 'lucide-react';
import usePortfolioStore from '../store/usePortfolioStore';
import CsvUploader from '../components/CsvUploader';
import KpiCard from '../components/KpiCard';
import AiAnalyst from '../components/AiAnalyst';
import { parseAssetsCSV, parseCashflowsCSV } from '../utils/csvParser';
import { modifiedDietz, computeCashflowWeights, computePortfolioReturns } from '../utils/modifiedDietz';
import { formatPct, formatSignedPct, formatNumber, toFloat } from '../utils/formatters';
import { generatePerformanceCommentary } from '../services/aiService';

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
    savePeriodSnapshot, periods,
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

  // ── Seed sample data for testing ──
  const handleSeedData = () => {
    setDates(new Date('2025-01-01T00:00:00'), new Date('2025-06-30T00:00:00'));
    setAssets([
      { name: 'Equities', beginningValue: 500000, endingValue: 560000 },
      { name: 'Fixed Income', beginningValue: 300000, endingValue: 312000 },
      { name: 'Real Estate', beginningValue: 150000, endingValue: 157500 },
      { name: 'Cash', beginningValue: 50000, endingValue: 50500 },
    ]);
    setCashflows([
      { date: new Date('2025-02-15'), amount: 25000, assetClass: 'Equities', details: 'Quarterly contribution', type: 'INFLOW', rawAmount: 25000 },
      { date: new Date('2025-03-01'), amount: 10000, assetClass: 'Fixed Income', details: 'Bond reinvestment', type: 'INFLOW', rawAmount: 10000 },
      { date: new Date('2025-04-10'), amount: -15000, assetClass: 'Equities', details: 'Partial withdrawal', type: 'OUTFLOW', rawAmount: 15000 },
      { date: new Date('2025-05-01'), amount: 5000, assetClass: 'Real Estate', details: 'REIT dividend reinvest', type: 'INFLOW', rawAmount: 5000 },
      { date: new Date('2025-05-20'), amount: -8000, assetClass: 'Cash', details: 'Operating expenses', type: 'OUTFLOW', rawAmount: 8000 },
      { date: new Date('2025-06-15'), amount: 20000, assetClass: 'Fixed Income', details: 'Mid-year allocation', type: 'INFLOW', rawAmount: 20000 },
    ]);
    setAssetSuccess(true);
    setCfSuccess(true);
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
  useEffect(() => {
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Measurement</h1>
          <p className="text-sm text-slate-400 mt-1">Modified Dietz Method — One-Period Time-Weighted Return</p>
        </div>
        <button
          onClick={handleSeedData}
          className="flex items-center gap-1.5 text-sm font-medium text-[#d4a843] hover:text-amber-300 bg-[#d4a843]/10 hover:bg-[#d4a843]/20 border border-[#d4a843]/30 px-3 py-2 rounded-lg transition-colors shrink-0"
        >
          <DatabaseZap className="w-4 h-4" /> Load Sample Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === id
                ? 'bg-slate-700 text-[#d4a843] shadow-sm'
                : 'text-slate-400 hover:text-white'
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
          <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Evaluation Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDates(e.target.value ? new Date(e.target.value + 'T00:00:00') : null, endDate)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setDates(startDate, e.target.value ? new Date(e.target.value + 'T00:00:00') : null)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Asset Classes Upload */}
          <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Asset Classes & Market Values</h2>
            <CsvUploader
              label="Upload Assets CSV"
              description="Columns: Asset Class, Beginning MV, Ending MV (flexible naming supported)"
              onFileSelected={handleAssetsUpload}
              errors={assetErrors}
              success={assetSuccess}
            />

            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="flex-1 h-px bg-slate-700" />
              <span>or enter manually</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>

            {/* Manual Data Entry Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
                  <tr>
                    <th className="px-3 py-2">Asset Class</th>
                    <th className="px-3 py-2 text-right">Beginning MV</th>
                    <th className="px-3 py-2 text-right">Ending MV</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {assets.map((a, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={a.name}
                          onChange={(e) => updateAsset(i, { name: e.target.value })}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md focus:ring-2 focus:ring-[#d4a843] outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={formatNumber(a.beginningValue, 0)}
                          onChange={(e) => updateAsset(i, { beginningValue: toFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md text-right focus:ring-2 focus:ring-[#d4a843] outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={formatNumber(a.endingValue, 0)}
                          onChange={(e) => updateAsset(i, { endingValue: toFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md text-right focus:ring-2 focus:ring-[#d4a843] outline-none text-sm"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button onClick={() => removeAsset(i)} className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-rose-900/30">
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
              className="flex items-center gap-1.5 text-sm font-medium text-[#d4a843] hover:text-[#d4a843] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Asset Class
            </button>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Cashflows Upload ────────────────────── */}
      {activeTab === 'cashflows' && (
        <div className="space-y-6">
          <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Transaction Cashflows</h2>
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-[#d4a843] bg-slate-700 hover:bg-[#d4a843]/10 px-3 py-1.5 rounded-lg transition-colors"
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
            <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold text-white">{cashflows.length} Cashflows Loaded</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Asset Class</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {cashflows.map((cf, i) => (
                      <tr key={i} className="hover:bg-slate-700/30">
                        <td className="px-4 py-2">{cf.date.toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cf.type === 'INFLOW' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/40 text-rose-400'}`}>
                            {cf.type}
                          </span>
                        </td>
                        <td className="px-4 py-2">{cf.assetClass}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatNumber(cf.rawAmount)}</td>
                        <td className="px-4 py-2 text-slate-400 truncate max-w-xs">{cf.details}</td>
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
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3 text-amber-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Set the evaluation period in Global Settings first.</p>
            </div>
          ) : adjustedFlows.length === 0 ? (
            <div className="bg-slate-800/50 rounded-xl p-8 text-center text-slate-400">
              <p>No cashflows within the selected period. Upload cashflows first.</p>
            </div>
          ) : (
            <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
              <div className="p-5 border-b border-slate-700 bg-slate-800/50">
                <h2 className="text-lg font-semibold text-white">Time-Weighted Cashflows</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Weight formula: <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-[#d4a843]">w = (T1 - Ti) / (T1 - T0)</code>
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Type</th>
                      <th className="px-4 py-2">Asset Class</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-right">Weight (w)</th>
                      <th className="px-4 py-2 text-right">Weighted Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 font-mono">
                    {adjustedFlows.map((cf, i) => (
                      <tr key={i} className="hover:bg-slate-700/30">
                        <td className="px-4 py-2 font-sans">{cf.date.toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-sans">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${cf.type === 'INFLOW' ? 'bg-emerald-900/40 text-emerald-400' : 'bg-rose-900/40 text-rose-400'}`}>
                            {cf.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-sans">{cf.assetClass}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(cf.rawAmount)}</td>
                        <td className="px-4 py-2 text-right text-[#d4a843]">{cf.weight.toFixed(4)}</td>
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
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3 text-amber-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Set the evaluation period in Global Settings first.</p>
            </div>
          )}
          {assets.length === 0 && (
            <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3 text-amber-300">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">Add at least one asset class in Global Settings.</p>
            </div>
          )}

          {results?.error && (
            <div className="bg-rose-900/30 border border-rose-700/50 rounded-xl p-4 flex items-start gap-3 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm">{results.error}</p>
            </div>
          )}

          {results && !results.error && (
            <>
              {/* Issues */}
              {results.issues?.length > 0 && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 text-amber-300 text-sm space-y-1">
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

              {/* Save Period to Report */}
              <div className="flex items-center gap-3">
                <button
                  onClick={savePeriodSnapshot}
                  className="flex items-center gap-2 text-sm font-medium text-[#d4a843] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 border border-[#d4a843]/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  Save Period to Report
                </button>
                {periods.length > 0 && (
                  <span className="text-xs text-slate-400">
                    {periods.length} period{periods.length !== 1 ? 's' : ''} saved
                  </span>
                )}
              </div>

              {/* Results Table */}
              <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
                <div className="p-5 border-b border-slate-700 bg-slate-800/50">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                    <Calculator className="w-5 h-5 text-[#d4a843]" />
                    Per-Asset Modified Dietz Returns
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
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
                    <tbody className="divide-y divide-slate-700/50">
                      {results.assetResults.map((a, i) => (
                        <tr key={i} className="hover:bg-slate-700/30">
                          <td className="px-4 py-3 font-medium text-slate-200">{a.name}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNumber(a.beginningValue)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatNumber(a.endingValue)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatPct(a.weight)}</td>
                          <td className={`px-4 py-3 text-right font-mono ${a.periodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatSignedPct(a.periodReturn)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono ${a.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatSignedPct(a.annualizedReturn)}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${a.contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatSignedPct(a.contribution)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-[#d4a843]/10 font-bold border-t border-slate-700">
                      <tr>
                        <td className="px-4 py-4 text-right text-slate-200">Portfolio Total</td>
                        <td className="px-4 py-4 text-right font-mono">{formatNumber(results.portfolio.beginningValue)}</td>
                        <td className="px-4 py-4 text-right font-mono">{formatNumber(results.portfolio.endingValue)}</td>
                        <td className="px-4 py-4 text-right font-mono">100.00%</td>
                        <td className={`px-4 py-4 text-right font-mono text-lg ${results.portfolio.periodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatSignedPct(results.portfolio.periodReturn)}
                        </td>
                        <td className={`px-4 py-4 text-right font-mono ${results.portfolio.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
