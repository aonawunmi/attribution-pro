import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';
import { Plus, Trash2, Calculator, PieChart, AlertCircle, Info, Import } from 'lucide-react';
import usePortfolioStore from '../store/usePortfolioStore';
import { brinsonFachler } from '../utils/brinsonFachler';
import { formatPct, formatSignedPct } from '../utils/formatters';
import KpiCard from '../components/KpiCard';
import CustomTooltip from '../components/CustomTooltip';
import AiAnalyst from '../components/AiAnalyst';
import { generateExecutiveSummary, generateRecommendations } from '../services/aiService';

const COLORS = {
  allocation: '#3b82f6',
  selection: '#10b981',
  interaction: '#f59e0b',
};

const DEFAULT_DATA = [
  { id: 1, name: 'Equities', wp: 60, rp: 12, wb: 50, rb: 10 },
  { id: 2, name: 'Fixed Income', wp: 30, rp: 4, wb: 40, rb: 5 },
  { id: 3, name: 'Cash', wp: 10, rp: 1, wb: 10, rb: 1 },
];

export default function AttributionPage() {
  const [data, setData] = useState(DEFAULT_DATA);
  const { getPerformanceAsAttributionInput, performanceResults } = usePortfolioStore();

  // ── Data Handlers ──
  const handleAddRow = () => {
    const newId = data.length > 0 ? Math.max(...data.map((d) => d.id)) + 1 : 1;
    setData([...data, { id: newId, name: `Asset Class ${newId}`, wp: 0, rp: 0, wb: 0, rb: 0 }]);
  };

  const handleRemoveRow = (id) => setData(data.filter((d) => d.id !== id));

  const handleChange = (id, field, value) => {
    setData(data.map((d) => (d.id === id ? { ...d, [field]: field === 'name' ? value : parseFloat(value) || 0 } : d)));
  };

  // ── Import from Performance module ──
  const handleImportFromPerformance = () => {
    const input = getPerformanceAsAttributionInput();
    if (!input || input.length === 0) return;
    setData(
      input.map((a, i) => ({
        id: i + 1,
        name: a.name,
        wp: Number((a.portfolioWeight * 100).toFixed(2)),
        rp: Number((a.portfolioReturn * 100).toFixed(2)),
        wb: 0,
        rb: 0,
      }))
    );
  };

  // ── Brinson-Fachler Calculations ──
  const results = useMemo(() => {
    const assets = data.map((d) => ({
      name: d.name,
      portfolioWeight: d.wp / 100,
      portfolioReturn: d.rp / 100,
      benchmarkWeight: d.wb / 100,
      benchmarkReturn: d.rb / 100,
    }));
    return brinsonFachler(assets);
  }, [data]);

  // ── Chart Data ──
  const chartData = results.attribution.map((d) => ({
    name: d.name,
    Allocation: Number((d.allocation * 100).toFixed(2)),
    Selection: Number((d.selection * 100).toFixed(2)),
    Interaction: Number((d.interaction * 100).toFixed(2)),
  }));

  const totalChartData = [
    { name: 'Allocation', value: Number((results.totals.allocation * 100).toFixed(2)), fill: COLORS.allocation },
    { name: 'Selection', value: Number((results.totals.selection * 100).toFixed(2)), fill: COLORS.selection },
    { name: 'Interaction', value: Number((results.totals.interaction * 100).toFixed(2)), fill: COLORS.interaction },
    { name: 'Total Active', value: Number((results.totals.activeReturn * 100).toFixed(2)), fill: '#6366f1' },
  ];

  // ── Weight Warnings ──
  const wpWarning = Math.abs(results.totalPortfolioWeight - 1) > 0.001;
  const wbWarning = Math.abs(results.totalBenchmarkWeight - 1) > 0.001;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Performance Attribution</h1>
        <p className="text-sm text-slate-400 mt-1">Brinson-Fachler Methodology</p>
      </div>

      {/* Warnings */}
      {(wpWarning || wbWarning) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-800 shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Weight Allocation Warning</h3>
            <ul className="list-disc list-inside text-sm mt-1">
              {wpWarning && <li>Portfolio weights sum to {(results.totalPortfolioWeight * 100).toFixed(1)}% (expected 100%)</li>}
              {wbWarning && <li>Benchmark weights sum to {(results.totalBenchmarkWeight * 100).toFixed(1)}% (expected 100%)</li>}
            </ul>
          </div>
        </div>
      )}

      {/* Data Input Table */}
      <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-500" />
            Portfolio & Benchmark Data
          </h2>
          <div className="flex gap-2">
            {performanceResults && (
              <button
                onClick={handleImportFromPerformance}
                className="flex items-center gap-1.5 text-sm font-medium text-[#d4a843] hover:text-[#d4a843] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Import className="w-4 h-4" /> Import from Performance
              </button>
            )}
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 text-sm font-medium text-[#d4a843] hover:text-[#d4a843] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Asset Class
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Asset Class</th>
                <th className="px-4 py-3 text-right">Portfolio Wgt (%)</th>
                <th className="px-4 py-3 text-right">Portfolio Rtn (%)</th>
                <th className="px-4 py-3 text-right">Benchmark Wgt (%)</th>
                <th className="px-4 py-3 text-right">Benchmark Rtn (%)</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-2">
                    <input type="text" value={row.name} onChange={(e) => handleChange(row.id, 'name', e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.01" value={row.wp} onChange={(e) => handleChange(row.id, 'wp', e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md text-right focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.01" value={row.rp} onChange={(e) => handleChange(row.id, 'rp', e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md text-right focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.01" value={row.wb} onChange={(e) => handleChange(row.id, 'wb', e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md text-right focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.01" value={row.rb} onChange={(e) => handleChange(row.id, 'rb', e.target.value)} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-600 text-white rounded-md text-right focus:ring-2 focus:ring-[#d4a843] focus:border-[#d4a843] outline-none" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => handleRemoveRow(row.id)} className="text-slate-400 hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-900/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-400">No asset classes added. Click "Add Asset Class" to begin.</td></tr>
              )}
            </tbody>
            <tfoot className="bg-slate-800/50 font-semibold text-slate-200 border-t border-slate-700">
              <tr>
                <td className="px-4 py-3 text-right">Totals:</td>
                <td className={`px-4 py-3 text-right ${wpWarning ? 'text-amber-600' : ''}`}>{(results.totalPortfolioWeight * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right bg-[#d4a843]/10">{formatPct(results.portfolioReturn)}</td>
                <td className={`px-4 py-3 text-right ${wbWarning ? 'text-amber-600' : ''}`}>{(results.totalBenchmarkWeight * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 text-right bg-[#d4a843]/10">{formatPct(results.benchmarkReturn)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Portfolio Return" value={formatPct(results.portfolioReturn)} />
        <KpiCard label="Benchmark Return" value={formatPct(results.benchmarkReturn)} />
        <KpiCard
          label="Active Return"
          value={formatSignedPct(results.totals.activeReturn)}
          variant={results.totals.activeReturn >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* AI Analyst */}
      <AiAnalyst
        disabled={results.attribution.length === 0}
        fallbackInsight={results.insight}
        onGenerateSummary={() =>
          generateExecutiveSummary({
            activeReturn: results.totals.activeReturn,
            totalAllocation: results.totals.allocation,
            totalSelection: results.totals.selection,
            assetBreakdown: results.attribution.map((d) => ({
              AssetClass: d.name,
              AllocationEffect: `${(d.allocation * 100).toFixed(2)}%`,
              SelectionEffect: `${(d.selection * 100).toFixed(2)}%`,
              TotalEffect: `${(d.total * 100).toFixed(2)}%`,
            })),
          })
        }
        onGenerateRecommendations={() =>
          generateRecommendations({
            activeReturn: results.totals.activeReturn,
            assetBreakdown: results.attribution.map((d) => ({
              AssetClass: d.name,
              AllocationEffect: `${(d.allocation * 100).toFixed(2)}%`,
              SelectionEffect: `${(d.selection * 100).toFixed(2)}%`,
            })),
          })
        }
      />

      {/* Attribution Breakdown Table */}
      <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-700 bg-slate-800/50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-500" />
            Brinson-Fachler Attribution Breakdown
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
              <tr>
                <th className="px-4 py-3">Asset Class</th>
                <th className="px-4 py-3 text-right">Allocation Effect</th>
                <th className="px-4 py-3 text-right">Selection Effect</th>
                <th className="px-4 py-3 text-right">Interaction Effect</th>
                <th className="px-4 py-3 text-right font-bold text-white">Total Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 font-mono">
              {results.attribution.map((row, i) => (
                <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-sans font-medium text-slate-200">{row.name}</td>
                  <td className={`px-4 py-3 text-right ${row.allocation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatSignedPct(row.allocation)}
                  </td>
                  <td className={`px-4 py-3 text-right ${row.selection >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatSignedPct(row.selection)}
                  </td>
                  <td className={`px-4 py-3 text-right ${row.interaction >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatSignedPct(row.interaction)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${row.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatSignedPct(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-[#d4a843]/10 font-bold border-t border-slate-700 font-mono">
              <tr>
                <td className="px-4 py-4 text-right font-sans text-slate-200">Total Active Return:</td>
                <td className={`px-4 py-4 text-right ${results.totals.allocation >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatSignedPct(results.totals.allocation)}
                </td>
                <td className={`px-4 py-4 text-right ${results.totals.selection >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatSignedPct(results.totals.selection)}
                </td>
                <td className={`px-4 py-4 text-right ${results.totals.interaction >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatSignedPct(results.totals.interaction)}
                </td>
                <td className={`px-4 py-4 text-right text-lg ${results.totals.activeReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatSignedPct(results.totals.activeReturn)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 p-5">
          <h2 className="text-lg font-semibold mb-4 text-white">Effects by Asset Class (%)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="Allocation" fill={COLORS.allocation} radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="Selection" fill={COLORS.selection} radius={[4, 4, 0, 0]} maxBarSize={50} />
              <Bar dataKey="Interaction" fill={COLORS.interaction} radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-1 bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 p-5">
          <h2 className="text-lg font-semibold mb-4 text-white">Total Active Summary</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={totalChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <ReferenceLine y={0} stroke="#475569" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {totalChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Methodology Notes */}
      <div className="bg-slate-800/50 rounded-2xl p-6 text-slate-300 text-sm border border-slate-700">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Methodology Notes (Brinson-Fachler)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <strong className="text-slate-200 block mb-1">Allocation Effect</strong>
            <code className="text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 text-[#d4a843] mb-2 block w-fit">
              (Wp - Wb) x (Rb - Rb_total)
            </code>
            Measures the manager's ability to effectively over-weight outperforming asset classes.
          </div>
          <div>
            <strong className="text-slate-200 block mb-1">Selection Effect</strong>
            <code className="text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 text-emerald-400 mb-2 block w-fit">
              Wb x (Rp - Rb)
            </code>
            Measures the manager's ability to select outperforming securities within each asset class.
          </div>
          <div>
            <strong className="text-slate-200 block mb-1">Interaction Effect</strong>
            <code className="text-xs bg-slate-900 px-2 py-1 rounded border border-slate-700 text-amber-600 mb-2 block w-fit">
              (Wp - Wb) x (Rp - Rb)
            </code>
            The combined impact of allocation and selection acting together.
          </div>
        </div>
      </div>
    </div>
  );
}
