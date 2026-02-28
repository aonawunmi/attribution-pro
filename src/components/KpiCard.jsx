import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * KPI metric card used across Dashboard, Performance, and Attribution pages.
 *
 * @param {Object} props
 * @param {string} props.label         - Metric name (e.g. "Portfolio Return")
 * @param {string} props.value         - Formatted value (e.g. "+12.00%")
 * @param {string} [props.variant]     - "positive" | "negative" | "neutral" (default)
 * @param {import('lucide-react').LucideIcon} [props.icon] - Optional icon component
 */
export default function KpiCard({ label, value, variant = 'neutral', icon: Icon }) {
  const styles = {
    positive: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-400',
    negative: 'bg-rose-900/30 border-rose-700/50 text-rose-400',
    neutral: 'bg-[#1e293b] border-slate-700 text-white',
  };

  const ArrowIcon = variant === 'positive' ? ArrowUpRight : variant === 'negative' ? ArrowDownRight : null;

  return (
    <div className={`rounded-2xl shadow-sm border p-5 ${styles[variant]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-sm font-medium ${variant === 'neutral' ? 'text-slate-400' : ''}`}>{label}</p>
        {ArrowIcon && <ArrowIcon className="w-5 h-5" />}
        {Icon && !ArrowIcon && <Icon className="w-5 h-5 text-slate-500" />}
      </div>
      <h3 className="text-3xl font-bold">{value}</h3>
    </div>
  );
}
