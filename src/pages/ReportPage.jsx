import { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  FileText, Printer, Sparkles, Loader2, Trash2, Info, BookmarkX, ClipboardList
} from 'lucide-react';
import usePortfolioStore from '../store/usePortfolioStore';
import KpiCard from '../components/KpiCard';
import CustomTooltip from '../components/CustomTooltip';
import { formatPct, formatSignedPct, formatNumber } from '../utils/formatters';
import { generateCommitteeReport } from '../services/aiService';
import { Link } from 'react-router-dom';

const PERIOD_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
const ASSET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

function parseReportSections(text) {
  const sections = { executiveSummary: '', performanceAnalysis: '', riskCommentary: '', recommendations: '' };
  const lines = text.split('\n');
  let current = 'executiveSummary';

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/executive\s*summary/i.test(lower)) { current = 'executiveSummary'; continue; }
    if (/performance\s*analysis/i.test(lower)) { current = 'performanceAnalysis'; continue; }
    if (/risk|allocation\s*commentary/i.test(lower)) { current = 'riskCommentary'; continue; }
    if (/outlook|recommendation/i.test(lower)) { current = 'recommendations'; continue; }
    if (line.startsWith('#')) continue;
    sections[current] += line + '\n';
  }

  Object.keys(sections).forEach((k) => { sections[k] = sections[k].trim(); });
  return sections;
}

export default function ReportPage() {
  const { periods, removePeriod, clearPeriods } = usePortfolioStore();

  const [reportTitle, setReportTitle] = useState('Investment Committee Report');
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [performanceCommentary, setPerformanceCommentary] = useState('');
  const [riskCommentary, setRiskCommentary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [footnotes, setFootnotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const sortedPeriods = useMemo(() =>
    [...periods].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [periods]
  );

  const latestPeriod = sortedPeriods[sortedPeriods.length - 1] || null;

  // Multi-period return comparison
  const periodComparisonData = useMemo(() =>
    sortedPeriods.map((p) => ({
      name: p.label,
      'Portfolio Return': Number((p.performanceResults.portfolio.periodReturn * 100).toFixed(2)),
      'Annualized Return': Number((p.performanceResults.portfolio.annualizedReturn * 100).toFixed(2)),
    })),
    [sortedPeriods]
  );

  // Asset allocation pie from latest period
  const allocationData = useMemo(() => {
    if (!latestPeriod) return [];
    return latestPeriod.performanceResults.assetResults.map((a, i) => ({
      name: a.name,
      value: Number((a.weight * 100).toFixed(1)),
      fill: ASSET_COLORS[i % ASSET_COLORS.length],
    }));
  }, [latestPeriod]);

  // Per-asset return comparison across periods
  const assetComparisonData = useMemo(() => {
    if (sortedPeriods.length === 0) return [];
    const assetNames = [...new Set(
      sortedPeriods.flatMap((p) => p.performanceResults.assetResults.map((a) => a.name))
    )];
    return assetNames.map((name) => {
      const entry = { name };
      sortedPeriods.forEach((p) => {
        const asset = p.performanceResults.assetResults.find((a) => a.name === name);
        entry[p.label] = asset ? Number((asset.periodReturn * 100).toFixed(2)) : 0;
      });
      return entry;
    });
  }, [sortedPeriods]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    setError('');
    try {
      const text = await generateCommitteeReport({ periods: sortedPeriods });
      const sections = parseReportSections(text);
      setExecutiveSummary(sections.executiveSummary || text);
      setPerformanceCommentary(sections.performanceAnalysis || '');
      setRiskCommentary(sections.riskCommentary || '');
      setRecommendations(sections.recommendations || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => window.print();

  if (periods.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Committee Report</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-period performance analysis for the IC</p>
        </div>
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-12 text-center">
          <div className="bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="font-semibold text-white mb-2">No Periods Saved</h3>
          <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
            Go to the Performance module, run your analysis, and click "Save Period to Report" in the Results tab to start building your IC report.
          </p>
          <Link
            to="/performance"
            className="text-sm font-medium text-[#d4a843] hover:text-[#e0b84e] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 px-4 py-2 rounded-lg transition-colors inline-block"
          >
            Go to Performance
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + Actions */}
      <div className="flex items-start justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Committee Report</h1>
          <p className="text-sm text-slate-400 mt-1">{sortedPeriods.length} period{sortedPeriods.length !== 1 ? 's' : ''} loaded</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="flex items-center gap-2 text-sm font-medium bg-[#d4a843] hover:bg-[#e0b84e] disabled:bg-slate-700 disabled:text-slate-500 text-[#0a1628] px-4 py-2 rounded-lg transition-colors"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Report
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-900/30 border border-rose-700/50 rounded-lg p-3 text-sm text-rose-300 no-print">
          {error}
        </div>
      )}

      {/* Editable Title */}
      <input
        type="text"
        value={reportTitle}
        onChange={(e) => setReportTitle(e.target.value)}
        className="text-2xl font-bold w-full bg-transparent border-b-2 border-transparent hover:border-slate-600 focus:border-[#d4a843] outline-none pb-1 transition-colors text-white"
      />

      {/* Saved Periods */}
      <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5 no-print">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#d4a843]" /> Saved Periods
          </h3>
          {periods.length > 1 && (
            <button onClick={clearPeriods} className="text-xs text-slate-400 hover:text-rose-400 transition-colors">
              Clear All
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedPeriods.map((p) => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
              <span className="text-slate-200">{p.label}</span>
              <span className="text-[#d4a843] font-mono text-xs">
                {formatSignedPct(p.performanceResults.portfolio.periodReturn)}
              </span>
              <button onClick={() => removePeriod(p.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* KPI Cards — Latest Period */}
      {latestPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KpiCard
            label="Portfolio Return"
            value={formatPct(latestPeriod.performanceResults.portfolio.periodReturn)}
            variant={latestPeriod.performanceResults.portfolio.periodReturn >= 0 ? 'positive' : 'negative'}
          />
          <KpiCard
            label="Annualized Return"
            value={formatPct(latestPeriod.performanceResults.portfolio.annualizedReturn)}
            variant={latestPeriod.performanceResults.portfolio.annualizedReturn >= 0 ? 'positive' : 'negative'}
          />
          <KpiCard
            label="Beginning Value"
            value={formatNumber(latestPeriod.performanceResults.portfolio.beginningValue, 0)}
          />
          <KpiCard
            label="Ending Value"
            value={formatNumber(latestPeriod.performanceResults.portfolio.endingValue, 0)}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Period Return Comparison */}
        {sortedPeriods.length > 0 && (
          <div className={`${sortedPeriods.length > 1 ? 'lg:col-span-2' : 'lg:col-span-3'} bg-[#1e293b] rounded-2xl border border-slate-700 p-5`}>
            <h2 className="text-lg font-semibold text-white mb-4">
              {sortedPeriods.length > 1 ? 'Period Return Comparison' : 'Portfolio Return'}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={periodComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '13px', color: '#e2e8f0' }} />
                <ReferenceLine y={0} stroke="#475569" />
                <Bar dataKey="Portfolio Return" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Bar dataKey="Annualized Return" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Asset Allocation Pie */}
        {allocationData.length > 0 && sortedPeriods.length > 1 && (
          <div className="lg:col-span-1 bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
            <h2 className="text-lg font-semibold text-white mb-4">Asset Allocation</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={{ stroke: '#64748b' }}
                >
                  {allocationData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Asset Return Comparison (multi-period) */}
      {sortedPeriods.length > 1 && assetComparisonData.length > 0 && (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Asset Class Returns Across Periods</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assetComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '13px', color: '#e2e8f0' }} />
              <ReferenceLine y={0} stroke="#475569" />
              {sortedPeriods.map((p, i) => (
                <Bar key={p.id} dataKey={p.label} fill={PERIOD_COLORS[i % PERIOD_COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={50} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Period Details Table */}
      {sortedPeriods.length > 1 && (
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-700 bg-slate-800/50">
            <h2 className="text-lg font-semibold text-white">Period Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3 text-right">Beginning Value</th>
                  <th className="px-4 py-3 text-right">Ending Value</th>
                  <th className="px-4 py-3 text-right">Period Return</th>
                  <th className="px-4 py-3 text-right">Annualized Return</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {sortedPeriods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-slate-200">{p.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatNumber(p.performanceResults.portfolio.beginningValue, 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatNumber(p.performanceResults.portfolio.endingValue, 0)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${p.performanceResults.portfolio.periodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatSignedPct(p.performanceResults.portfolio.periodReturn)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${p.performanceResults.portfolio.annualizedReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatSignedPct(p.performanceResults.portfolio.annualizedReturn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editable Report Sections */}
      <div className="space-y-6">
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Executive Summary</h3>
          <textarea
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
            rows={6}
            placeholder="Click 'Generate Report' to auto-fill, or write your executive summary..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-slate-200 focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none resize-y text-sm leading-relaxed placeholder-slate-500"
          />
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Performance Analysis</h3>
          <textarea
            value={performanceCommentary}
            onChange={(e) => setPerformanceCommentary(e.target.value)}
            rows={5}
            placeholder="Detailed performance analysis..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-slate-200 focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none resize-y text-sm leading-relaxed placeholder-slate-500"
          />
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Risk & Allocation Commentary</h3>
          <textarea
            value={riskCommentary}
            onChange={(e) => setRiskCommentary(e.target.value)}
            rows={4}
            placeholder="Risk and allocation analysis..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-slate-200 focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none resize-y text-sm leading-relaxed placeholder-slate-500"
          />
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-semibold text-[#d4a843] mb-3">Outlook & Recommendations</h3>
          <textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            rows={5}
            placeholder="Forward-looking recommendations..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-slate-200 focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none resize-y text-sm leading-relaxed placeholder-slate-500"
          />
        </div>

        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 p-5">
          <h3 className="text-lg font-semibold text-slate-400 mb-3">Footnotes</h3>
          <textarea
            value={footnotes}
            onChange={(e) => setFootnotes(e.target.value)}
            rows={3}
            placeholder="Additional notes, disclaimers, methodology references..."
            className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-slate-200 focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none resize-y text-sm leading-relaxed placeholder-slate-500"
          />
        </div>
      </div>
    </div>
  );
}
