import { Link } from 'react-router-dom';
import { TrendingUp, Calculator, ArrowRight, BarChart3, PieChart, Info } from 'lucide-react';
import usePortfolioStore from '../store/usePortfolioStore';
import KpiCard from '../components/KpiCard';
import { formatPct, formatSignedPct, formatNumber } from '../utils/formatters';

export default function DashboardPage() {
  const { performanceResults, assets, startDate, endDate } = usePortfolioStore();

  const hasData = performanceResults && performanceResults.assetResults?.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Investment Performance Appraisal System</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/performance"
          className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-sm p-6 hover:border-[#d4a843]/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-900/30 p-3 rounded-xl">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-[#d4a843] transition-colors">
                Performance Measurement
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Modified Dietz returns, cashflow weighting, per-asset analysis
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-[#d4a843] transition-colors" />
          </div>
        </Link>
        <Link
          to="/attribution"
          className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-sm p-6 hover:border-[#d4a843]/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-indigo-900/30 p-3 rounded-xl">
              <Calculator className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-[#d4a843] transition-colors">
                Performance Attribution
              </h3>
              <p className="text-sm text-slate-400 mt-0.5">
                Brinson-Fachler allocation, selection, and interaction effects
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-[#d4a843] transition-colors" />
          </div>
        </Link>
      </div>

      {/* KPI Section — shows when performance data exists */}
      {hasData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              label="Portfolio Return"
              value={formatPct(performanceResults.portfolio.periodReturn)}
            />
            <KpiCard
              label="Annualized Return"
              value={formatPct(performanceResults.portfolio.annualizedReturn)}
            />
            <KpiCard
              label="Asset Classes"
              value={String(performanceResults.assetResults.length)}
              icon={PieChart}
            />
            <KpiCard
              label="Period"
              value={`${startDate?.toLocaleDateString() || '-'} — ${endDate?.toLocaleDateString() || '-'}`}
              icon={BarChart3}
            />
          </div>

          {/* Asset Breakdown */}
          <div className="bg-[#1e293b] rounded-2xl shadow-sm border border-slate-700 overflow-hidden">
            <div className="p-5 border-b border-slate-700 bg-slate-800/50">
              <h2 className="text-lg font-semibold text-white">Asset Class Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3">Asset Class</th>
                    <th className="px-4 py-3 text-right">Weight</th>
                    <th className="px-4 py-3 text-right">Beginning MV</th>
                    <th className="px-4 py-3 text-right">Ending MV</th>
                    <th className="px-4 py-3 text-right">Period Return</th>
                    <th className="px-4 py-3 text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {performanceResults.assetResults.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-medium text-slate-200">{a.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{formatPct(a.weight)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{formatNumber(a.beginningValue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-200">{formatNumber(a.endingValue)}</td>
                      <td className={`px-4 py-3 text-right font-mono ${a.periodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatSignedPct(a.periodReturn)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono ${a.contribution >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatSignedPct(a.contribution)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#d4a843]/10 font-bold border-t border-slate-700">
                  <tr>
                    <td className="px-4 py-3 text-right text-slate-200">Portfolio Total</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">100.00%</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatNumber(performanceResults.portfolio.beginningValue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatNumber(performanceResults.portfolio.endingValue)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${performanceResults.portfolio.periodReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatSignedPct(performanceResults.portfolio.periodReturn)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Empty state */
        <div className="bg-[#1e293b] rounded-2xl border border-slate-700 shadow-sm p-12 text-center">
          <div className="bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-7 h-7 text-slate-500" />
          </div>
          <h3 className="font-semibold text-white mb-2">No Portfolio Data Yet</h3>
          <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
            Start by uploading your portfolio data in the Performance module, or go directly to Attribution for Brinson-Fachler analysis.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              to="/performance"
              className="text-sm font-medium text-[#d4a843] hover:text-[#e0b84e] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 px-4 py-2 rounded-lg transition-colors"
            >
              Go to Performance
            </Link>
            <Link
              to="/attribution"
              className="text-sm font-medium text-[#d4a843] hover:text-[#e0b84e] bg-[#d4a843]/10 hover:bg-[#d4a843]/20 px-4 py-2 rounded-lg transition-colors"
            >
              Go to Attribution
            </Link>
          </div>
        </div>
      )}

      {/* Methodology Footer */}
      <div className="bg-slate-800/50 rounded-2xl p-6 text-slate-300 text-sm border border-slate-700">
        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-[#d4a843]" />
          About This System
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <strong className="text-slate-200 block mb-1">Performance Measurement</strong>
            <p>
              Uses the <strong>Modified Dietz</strong> method to calculate time-weighted returns,
              accounting for the timing and size of cashflows within the evaluation period (ACT/365 annualization).
            </p>
          </div>
          <div>
            <strong className="text-slate-200 block mb-1">Performance Attribution</strong>
            <p>
              Uses the <strong>Brinson-Fachler</strong> model to decompose active return into
              allocation, selection, and interaction effects — identifying where value was added or lost.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
